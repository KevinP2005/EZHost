import { createClient } from '@/lib/supabase/server'

/**
 * Central availability calculation for the booking flow.
 *
 * EZHost has to distinguish three different sizes per unit category:
 *
 *   1. physicalUnits   – ACTIVE units that physically exist in the property
 *   2. bookableLimit   – administrative cap an org admin may configure later
 *   3. availableUnits  – of those, the ones not already occupied in the period
 *
 * and the selectable amount is
 *
 *   maxSelectable = min(bookableLimit, availableUnits)
 *
 * This module is the single source of truth for that calculation. The UI and
 * the creation path both go through it; the RPC re-checks the same rules
 * inside the transaction (see 007_multi_stay_booking_flow.sql).
 */

// ─── Category key ─────────────────────────────────────────────────────────────

export interface CategorySignature {
  unit_type: string
  capacity_adults: number
  capacity_children: number
}

/**
 * Groups physical units into a bookable category.
 *
 * There is no `unit_categories` table (and no `units.category_id`) in the
 * schema yet, so the category is derived from the attributes a guest actually
 * books against: the unit type and its occupancy. Two units are interchangeable
 * — and therefore the same category — when both match.
 *
 * IMPORTANT: `create_reservation_booking_flow` reproduces this exact key in
 * SQL as
 *   unit_type::text || ':' || capacity_adults || ':' || capacity_children
 * If this derivation changes, that function has to change with it. When a real
 * category entity lands, this is the one place in TypeScript that needs to
 * switch to `unit.unit_category_id`.
 */
export function resolveCategoryKey(unit: CategorySignature): string {
  return `${unit.unit_type}:${unit.capacity_adults}:${unit.capacity_children}`
}

/**
 * Administrative cap on how many units of a category may be sold.
 *
 * No `bookable_units_limit` column exists yet, so the cap currently equals the
 * physical inventory — i.e. it never restricts anything today. Kept as an
 * explicit step so that reading the limit from the future category entity is a
 * change inside this function only, not across the flow.
 */
export function resolveBookableLimit(_categoryKey: string, physicalUnits: number): number {
  return physicalUnits
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityUnit {
  id: string
  name: string
  description: string | null
  unit_type: string
  capacity_adults: number
  capacity_children: number
}

export interface UnitCategoryAvailability {
  categoryKey: string
  label: string
  description: string
  unitType: string
  maxAdults: number
  maxChildren: number
  maxOccupancy: number
  /** (1) ACTIVE units that physically exist */
  physicalUnits: number
  /** (2) administrative cap — currently equal to physicalUnits */
  bookableLimit: number
  /** (3) units of this category still free for the requested period */
  availableUnits: number
  /** min(bookableLimit, availableUnits) — never offer more than this */
  maxSelectable: number
  /** Concrete free unit ids, ordered by name. Empty when no period is selected. */
  availableUnitIds: string[]
  /** Names of the member units, ordered — used for labelling only. */
  unitNames: string[]
}

// ─── Labelling ────────────────────────────────────────────────────────────────

function humanizeUnitType(unitType: string) {
  return unitType.charAt(0) + unitType.slice(1).toLowerCase().replaceAll('_', ' ')
}

/**
 * A single-unit category simply carries that unit's name ("Apartment B").
 * For a group we use the longest shared word prefix of the member names
 * ("Room 101", "Room 103" -> "Room"), falling back to the unit type.
 */
function deriveCategoryLabel(unitNames: string[], unitType: string): string {
  if (unitNames.length === 0) return humanizeUnitType(unitType)
  if (unitNames.length === 1) return unitNames[0]

  const wordLists = unitNames.map((name) => name.trim().split(/\s+/))
  const shared: string[] = []

  for (let index = 0; index < wordLists[0].length; index += 1) {
    const word = wordLists[0][index]
    if (wordLists.every((words) => words[index] === word)) shared.push(word)
    else break
  }

  const prefix = shared.join(' ').trim()
  return prefix.length > 0 ? prefix : humanizeUnitType(unitType)
}

// ─── Core calculation ─────────────────────────────────────────────────────────

interface GetCategoryAvailabilityInput {
  propertyId: string
  /** Inclusive first night. When omitted, occupancy is not considered. */
  checkInDate?: string | null
  /** Exclusive departure date. When omitted, occupancy is not considered. */
  checkOutDate?: string | null
  /** Ignore stays of this reservation — for future edit flows. */
  excludeReservationId?: string | null
}

export async function getCategoryAvailability(
  input: GetCategoryAvailabilityInput
): Promise<UnitCategoryAvailability[]> {
  const supabase = await createClient()

  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('id, name, description, unit_type, capacity_adults, capacity_children')
    .eq('property_id', input.propertyId)
    .eq('status', 'ACTIVE')
    .order('name')

  if (unitsError) throw new Error(unitsError.message)

  const occupiedUnitIds = await getOccupiedUnitIds(input)
  const hasPeriod = Boolean(input.checkInDate && input.checkOutDate)

  return buildCategoryAvailability((units ?? []) as AvailabilityUnit[], occupiedUnitIds, hasPeriod)
}

/**
 * Pure grouping + limit calculation, split out from the data access above so
 * the rules can be exercised without a database.
 *
 * @param units           ACTIVE units of the property
 * @param occupiedUnitIds unit ids blocked by an overlapping stay
 * @param hasPeriod       false while no dates are picked — occupancy is then ignored
 */
export function buildCategoryAvailability(
  units: AvailabilityUnit[],
  occupiedUnitIds: Set<string>,
  hasPeriod: boolean,
): UnitCategoryAvailability[] {
  const groups = new Map<string, AvailabilityUnit[]>()
  for (const unit of units) {
    const key = resolveCategoryKey(unit)
    const bucket = groups.get(key)
    if (bucket) bucket.push(unit)
    else groups.set(key, [unit])
  }

  return Array.from(groups.entries())
    .map(([categoryKey, members]) => {
      const first = members[0]
      const freeUnits = members.filter((unit) => !occupiedUnitIds.has(unit.id))
      const physicalUnits = members.length
      const bookableLimit = resolveBookableLimit(categoryKey, physicalUnits)
      // No period selected yet: fall back to the administrative cap so the UI
      // can render a sensible form before dates are chosen.
      const availableUnits = hasPeriod ? freeUnits.length : physicalUnits

      return {
        categoryKey,
        label: deriveCategoryLabel(members.map((unit) => unit.name), first.unit_type),
        description:
          members.find((unit) => unit.description)?.description
          ?? `${humanizeUnitType(first.unit_type)} available for direct booking.`,
        unitType: first.unit_type,
        maxAdults: Math.max(first.capacity_adults, 1),
        maxChildren: Math.max(first.capacity_children, 0),
        maxOccupancy: Math.max(first.capacity_adults + first.capacity_children, 1),
        physicalUnits,
        bookableLimit,
        availableUnits,
        maxSelectable: Math.min(bookableLimit, availableUnits),
        availableUnitIds: hasPeriod
          ? freeUnits.map((unit) => unit.id)
          : members.map((unit) => unit.id),
        unitNames: members.map((unit) => unit.name),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Unit ids blocked by an existing stay overlapping [checkInDate, checkOutDate).
 * Same-day turnover is allowed: a stay ending on the arrival date does not block.
 */
async function getOccupiedUnitIds(input: GetCategoryAvailabilityInput): Promise<Set<string>> {
  if (!input.checkInDate || !input.checkOutDate) return new Set()

  const supabase = await createClient()
  let query = supabase
    .from('stays')
    .select('unit_id')
    .eq('property_id', input.propertyId)
    .not('status', 'in', '("CANCELLED","NO_SHOW")')
    .lt('check_in_date', input.checkOutDate)
    .gt('check_out_date', input.checkInDate)

  if (input.excludeReservationId) {
    query = query.neq('reservation_id', input.excludeReservationId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return new Set((data ?? []).map((row) => row.unit_id as string))
}
