import { createClient } from '@/lib/supabase/server'

/**
 * Central availability calculation for the booking flow.
 *
 * EZHost distinguishes three different sizes per unit category:
 *
 *   1. physicalUnits   – ACTIVE units of this category that physically exist
 *   2. bookableLimit   – unit_categories.bookable_units_limit (NULL = uncapped)
 *   3. availableUnits  – of the physical ones, those not already occupied
 *
 * and the selectable amount is
 *
 *   maxSelectable = min(bookableLimit, availableUnits)
 *
 * This module is the single source of truth for that calculation. The UI and
 * the creation path both go through it; the RPC re-checks the same rules
 * inside the transaction (see 009_unit_categories.sql).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityUnit {
  id: string
  name: string
  unit_category_id: string
}

export interface AvailabilityCategory {
  id: string
  name: string
  description: string | null
  unit_type: string
  capacity_adults: number
  capacity_children: number
  bookable_units_limit: number | null
}

export interface UnitCategoryAvailability {
  categoryId: string
  label: string
  description: string
  unitType: string
  maxAdults: number
  maxChildren: number
  maxOccupancy: number
  /** (1) ACTIVE units that physically exist */
  physicalUnits: number
  /** (2) administrative cap — Infinity when bookable_units_limit is NULL */
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

  const [{ data: categories, error: categoriesError }, { data: units, error: unitsError }] = await Promise.all([
    supabase
      .from('unit_categories')
      .select('id, name, description, unit_type, capacity_adults, capacity_children, bookable_units_limit')
      .eq('property_id', input.propertyId)
      .order('name'),
    supabase
      .from('units')
      .select('id, name, unit_category_id')
      .eq('property_id', input.propertyId)
      .eq('status', 'ACTIVE')
      .order('name'),
  ])

  if (categoriesError) throw new Error(categoriesError.message)
  if (unitsError) throw new Error(unitsError.message)

  const occupiedUnitIds = await getOccupiedUnitIds(input)
  const hasPeriod = Boolean(input.checkInDate && input.checkOutDate)

  return buildCategoryAvailability(
    (categories ?? []) as AvailabilityCategory[],
    (units ?? []) as AvailabilityUnit[],
    occupiedUnitIds,
    hasPeriod,
  )
}

/**
 * Pure grouping + limit calculation, split out from the data access above so
 * the rules can be exercised without a database.
 *
 * @param categories      unit_categories rows of the property
 * @param units           ACTIVE units of the property
 * @param occupiedUnitIds unit ids blocked by an overlapping stay
 * @param hasPeriod       false while no dates are picked — occupancy is then ignored
 */
export function buildCategoryAvailability(
  categories: AvailabilityCategory[],
  units: AvailabilityUnit[],
  occupiedUnitIds: Set<string>,
  hasPeriod: boolean,
): UnitCategoryAvailability[] {
  const unitsByCategory = new Map<string, AvailabilityUnit[]>()
  for (const unit of units) {
    const bucket = unitsByCategory.get(unit.unit_category_id)
    if (bucket) bucket.push(unit)
    else unitsByCategory.set(unit.unit_category_id, [unit])
  }

  return categories
    .map((category) => {
      const members = unitsByCategory.get(category.id) ?? []
      const freeUnits = members.filter((unit) => !occupiedUnitIds.has(unit.id))
      const physicalUnits = members.length
      const bookableLimit = category.bookable_units_limit ?? Infinity
      // No period selected yet: fall back to the administrative cap so the UI
      // can render a sensible form before dates are chosen.
      const availableUnits = hasPeriod ? freeUnits.length : physicalUnits

      return {
        categoryId: category.id,
        label: category.name,
        description: category.description ?? `${humanizeUnitType(category.unit_type)} available for direct booking.`,
        unitType: category.unit_type,
        maxAdults: Math.max(category.capacity_adults, 1),
        maxChildren: Math.max(category.capacity_children, 0),
        maxOccupancy: Math.max(category.capacity_adults + category.capacity_children, 1),
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
