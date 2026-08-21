-- ============================================================
-- EZHost – Real Unit Category entity
-- ============================================================
-- Introduces Property -> Unit Category -> Units as a real relation,
-- replacing the virtual category derived from
-- unit_type + capacity_adults + capacity_children (resolveCategoryKey() /
-- unit_category_key()). That derivation silently merged any two categories
-- with the same type+capacity (e.g. "Standard Double" and "Superior
-- Double"); a real category id removes that ambiguity entirely.
--
-- Not in production yet, but existing units/stays data is preserved rather
-- than discarded: this migration backfills one unit_categories row per
-- distinct (property_id, unit_type, capacity_adults, capacity_children)
-- combination already in use, points every unit at its matching category,
-- and only then drops the now-redundant columns from `units`.
-- ============================================================

-- ============================================================
-- UNIT_CATEGORIES
-- ============================================================

CREATE TABLE unit_categories (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id          UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  code                 TEXT,
  unit_type            unit_type NOT NULL DEFAULT 'ROOM',
  capacity_adults      INTEGER NOT NULL DEFAULT 2,
  capacity_children    INTEGER NOT NULL DEFAULT 0,
  description          TEXT,
  -- NULL = every physically ACTIVE unit of this category is bookable.
  -- A number caps how many may be considered by availability/booking at
  -- once, regardless of how many physically exist. Configurable by org
  -- admins later; no admin UI for it yet.
  bookable_units_limit INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_bookable_units_limit_non_negative CHECK (bookable_units_limit IS NULL OR bookable_units_limit >= 0)
);

COMMENT ON COLUMN unit_categories.bookable_units_limit IS
  'NULL = no administrative cap beyond physical inventory. Set = maximum units of this category considered by availability/booking at once.';

CREATE INDEX idx_unit_categories_organization_id ON unit_categories(organization_id);
CREATE INDEX idx_unit_categories_property_id ON unit_categories(property_id);

CREATE TRIGGER trg_unit_categories_updated_at
  BEFORE UPDATE ON unit_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE unit_categories ENABLE ROW LEVEL SECURITY;

-- Mirrors the units_select/insert/update policies from 002_property_access.sql.
CREATE POLICY "unit_categories_select" ON unit_categories FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

CREATE POLICY "unit_categories_insert" ON unit_categories FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND auth_can_access_property(property_id)
    )
  );

CREATE POLICY "unit_categories_update" ON unit_categories FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND auth_can_access_property(property_id)
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND auth_can_access_property(property_id)
    )
  );

-- ============================================================
-- BACKFILL – one category per distinct (property, type, capacity) combo
-- ============================================================
-- Generic names (the unit_type text) since old data has no category
-- identity of its own; real names come from the reseeded data or are
-- renamed later. This only runs against whatever units happen to exist
-- at migration time — it's not part of the ongoing application flow.

INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, description)
SELECT DISTINCT ON (u.property_id, u.unit_type, u.capacity_adults, u.capacity_children)
  u.organization_id, u.property_id, u.unit_type::text, u.unit_type, u.capacity_adults, u.capacity_children, u.description
FROM units u
ORDER BY u.property_id, u.unit_type, u.capacity_adults, u.capacity_children, u.name;

-- ============================================================
-- UNITS – point at their category, then drop the now-redundant columns
-- ============================================================

ALTER TABLE units ADD COLUMN unit_category_id UUID REFERENCES unit_categories(id);

UPDATE units u
SET unit_category_id = uc.id
FROM unit_categories uc
WHERE uc.property_id = u.property_id
  AND uc.unit_type = u.unit_type
  AND uc.capacity_adults = u.capacity_adults
  AND uc.capacity_children = u.capacity_children;

ALTER TABLE units ALTER COLUMN unit_category_id SET NOT NULL;

ALTER TABLE units
  DROP COLUMN unit_type,
  DROP COLUMN capacity_adults,
  DROP COLUMN capacity_children,
  DROP COLUMN description;

CREATE INDEX idx_units_unit_category_id ON units(unit_category_id);

-- ============================================================
-- BOOKING FLOW – category_id replaces the derived category_key
-- ============================================================
-- No RLS policy on `units`/`stays` referenced the dropped columns
-- (verified against 001/002/007), and unit_category_key()'s only caller is
-- create_reservation_booking_flow, rewritten below — dropping it is safe.

DROP FUNCTION IF EXISTS unit_category_key(unit_type, INTEGER, INTEGER);

-- Same signature as before (positions is still JSONB) — only the body
-- changes: each position now carries "category_id" (a unit_categories.id)
-- instead of the derived "category_key" string, and the concrete-unit
-- search joins on units.unit_category_id.
CREATE OR REPLACE FUNCTION create_reservation_booking_flow(
  p_organization_id UUID,
  p_property_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_booking_status booking_status,
  p_currency TEXT,
  p_confirmation_preference TEXT,
  p_internal_notes TEXT,
  p_extras_amount NUMERIC,
  p_extras_details JSONB,
  p_positions JSONB,
  p_primary_guest JSONB,
  p_accompanying_guests JSONB DEFAULT '[]'::jsonb
)
RETURNS reservations
LANGUAGE plpgsql
AS $$
DECLARE
  v_guest_id UUID;
  v_guest JSONB;
  v_accompanying_guest_id UUID;
  v_reservation reservations;
  v_position JSONB;
  v_category_id UUID;
  v_quantity INTEGER;
  v_nights INTEGER;
  v_unit_id UUID;
  v_assigned INTEGER;
  v_taken UUID[] := ARRAY[]::UUID[];
  v_first_stay_id UUID := NULL;
  v_stay_id UUID;
  v_nightly NUMERIC;
  v_subtotal NUMERIC;
  v_extras NUMERIC := COALESCE(p_extras_amount, 0);
  v_total NUMERIC := 0;
BEGIN
  IF jsonb_typeof(p_positions) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_positions) = 0 THEN
    RAISE EXCEPTION 'At least one booking position is required';
  END IF;

  IF p_check_out_date <= p_check_in_date THEN
    RAISE EXCEPTION 'Check-out must be after check-in';
  END IF;

  v_nights := p_check_out_date - p_check_in_date;

  -- Serialise concurrent bookings for the same property. Unit selection below
  -- reads availability and then writes stays; without this a second concurrent
  -- transaction could pick the same unit between our read and our insert.
  -- Released automatically at commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtext(p_property_id::text));

  -- ── Booker + Primary Guest ────────────────────────────────────────────────
  -- The booking UI collects exactly one guest, so the same guest record acts
  -- as both Booker and Primary Guest on the reservation.
  INSERT INTO guests (
    organization_id, first_name, last_name, email, phone,
    date_of_birth, address, document_type, document_number, company
  )
  VALUES (
    p_organization_id,
    COALESCE(p_primary_guest->>'first_name', ''),
    COALESCE(p_primary_guest->>'last_name', ''),
    NULLIF(p_primary_guest->>'email', ''),
    NULLIF(p_primary_guest->>'phone', ''),
    NULLIF(p_primary_guest->>'date_of_birth', '')::date,
    NULLIF(p_primary_guest->>'address', ''),
    NULLIF(p_primary_guest->>'document_type', ''),
    NULLIF(p_primary_guest->>'document_number', ''),
    NULLIF(p_primary_guest->>'company', '')
  )
  RETURNING id INTO v_guest_id;

  -- ── Reservation (total_amount filled in after the stays exist) ────────────
  INSERT INTO reservations (
    organization_id, property_id, booker_id, primary_guest_id,
    source, booking_status, currency, confirmation_preference, internal_notes
  )
  VALUES (
    p_organization_id, p_property_id, v_guest_id, v_guest_id,
    'MANUAL', p_booking_status,
    COALESCE(NULLIF(p_currency, ''), 'EUR'),
    NULLIF(p_confirmation_preference, ''),
    NULLIF(p_internal_notes, '')
  )
  RETURNING * INTO v_reservation;

  -- ── One Stay per concrete Unit, per position ──────────────────────────────
  FOR v_position IN SELECT value FROM jsonb_array_elements(p_positions)
  LOOP
    v_category_id := (v_position->>'category_id')::uuid;
    v_quantity := GREATEST(COALESCE((v_position->>'quantity')::integer, 1), 1);
    v_nightly := COALESCE((v_position->>'nightly_rate')::numeric, 0);
    v_subtotal := v_nightly * v_nights;
    v_assigned := 0;

    FOR v_unit_id IN
      SELECT u.id
      FROM units u
      WHERE u.property_id = p_property_id
        AND u.status = 'ACTIVE'
        AND u.unit_category_id = v_category_id
        AND NOT (u.id = ANY (v_taken))
        AND NOT EXISTS (
          SELECT 1
          FROM stays s
          WHERE s.unit_id = u.id
            AND s.status NOT IN ('CANCELLED', 'NO_SHOW')
            AND s.check_in_date < p_check_out_date
            AND s.check_out_date > p_check_in_date
        )
      ORDER BY u.name
      LIMIT v_quantity
    LOOP
      INSERT INTO stays (
        organization_id, property_id, unit_id, reservation_id,
        check_in_date, check_out_date, adults, children,
        status, registration_status,
        room_label, rate_code, rate_label, nightly_rate, subtotal_amount,
        extras_amount, price_details, extras_details
      )
      VALUES (
        p_organization_id, p_property_id, v_unit_id, v_reservation.id,
        p_check_in_date, p_check_out_date,
        GREATEST(COALESCE((v_position->>'adults')::integer, 1), 1),
        GREATEST(COALESCE((v_position->>'children')::integer, 0), 0),
        'BOOKED', 'MISSING',
        NULLIF(v_position->>'room_label', ''),
        NULLIF(v_position->>'rate_code', ''),
        NULLIF(v_position->>'rate_label', ''),
        v_nightly,
        v_subtotal,
        0,
        COALESCE(v_position->'price_details', '{}'::jsonb),
        '[]'::jsonb
      )
      RETURNING id INTO v_stay_id;

      v_taken := array_append(v_taken, v_unit_id);
      IF v_first_stay_id IS NULL THEN
        v_first_stay_id := v_stay_id;
      END IF;

      v_assigned := v_assigned + 1;
      v_total := v_total + v_subtotal;
    END LOOP;

    -- Availability may have changed since the form was rendered. Anything less
    -- than the requested quantity aborts the whole reservation.
    IF v_assigned < v_quantity THEN
      RAISE EXCEPTION
        'Not enough available units for category % (requested %, available %)',
        v_category_id, v_quantity, v_assigned
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  -- ── Extras ────────────────────────────────────────────────────────────────
  -- Extras are booking-wide today (parking, pet) and there is no per-stay
  -- extras UI, so the whole amount is carried by the first stay and counted
  -- once into the reservation total. Transitional until an Items system exists.
  IF v_extras > 0 AND v_first_stay_id IS NOT NULL THEN
    UPDATE stays
    SET extras_amount = v_extras,
        extras_details = COALESCE(p_extras_details, '[]'::jsonb)
    WHERE id = v_first_stay_id;

    v_total := v_total + v_extras;
  END IF;

  -- ── Guests ────────────────────────────────────────────────────────────────
  -- The UI has no per-room guest assignment yet, so every collected guest is
  -- attached to the first stay exactly once. Attaching them to every stay would
  -- duplicate people across rooms; see docs for the intended follow-up.
  INSERT INTO stay_guests (organization_id, stay_id, guest_id, is_primary_guest)
  VALUES (p_organization_id, v_first_stay_id, v_guest_id, TRUE);

  FOR v_guest IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_accompanying_guests, '[]'::jsonb))
  LOOP
    INSERT INTO guests (organization_id, first_name, last_name, date_of_birth)
    VALUES (
      p_organization_id,
      COALESCE(v_guest->>'first_name', ''),
      COALESCE(v_guest->>'last_name', ''),
      NULLIF(v_guest->>'date_of_birth', '')::date
    )
    RETURNING id INTO v_accompanying_guest_id;

    INSERT INTO stay_guests (organization_id, stay_id, guest_id, is_primary_guest)
    VALUES (p_organization_id, v_first_stay_id, v_accompanying_guest_id, FALSE);
  END LOOP;

  -- ── Aggregate the reservation total from the created stays ────────────────
  UPDATE reservations
  SET total_amount = v_total
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  RETURN v_reservation;
END;
$$;
