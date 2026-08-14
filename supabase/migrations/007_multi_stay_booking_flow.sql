-- ============================================================
-- EZHost – Multi-Stay booking creation
-- ============================================================
-- Replaces the single-stay `create_stay_booking_flow` with a flow that turns a
-- collection of booking positions (one per selected unit category) into
--   1 Reservation -> N Stays, one Stay per concrete Unit.
--
-- Availability is re-validated inside the transaction: if a single position
-- cannot be satisfied the whole reservation is rolled back, so a partial
-- booking can never be persisted.
-- ============================================================

DROP FUNCTION IF EXISTS create_stay_booking_flow(
  UUID, UUID, UUID, DATE, DATE, INTEGER, INTEGER, booking_status,
  TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT,
  JSONB, JSONB, JSONB, JSONB
);

-- Category key, mirroring resolveCategoryKey() in src/lib/services/availability.ts.
-- There is no unit_categories table yet; units are grouped by the attributes a
-- guest books against. When a real category entity lands, this function and its
-- TypeScript counterpart change together.
CREATE OR REPLACE FUNCTION unit_category_key(
  p_unit_type unit_type,
  p_capacity_adults INTEGER,
  p_capacity_children INTEGER
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_unit_type::text || ':' || p_capacity_adults::text || ':' || p_capacity_children::text;
$$;

-- ============================================================
-- create_reservation_booking_flow
-- ============================================================
-- p_positions is a JSONB array; one entry per selected category:
--   {
--     "category_key":  "APARTMENT:4:2",
--     "quantity":      2,
--     "adults":        2,
--     "children":      0,
--     "rate_code":     "breakfast",
--     "rate_label":    "Breakfast",
--     "room_label":    "Apartment B",
--     "nightly_rate":  190,
--     "price_details": { ... }
--   }

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
  v_category_key TEXT;
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
    v_category_key := v_position->>'category_key';
    v_quantity := GREATEST(COALESCE((v_position->>'quantity')::integer, 1), 1);
    v_nightly := COALESCE((v_position->>'nightly_rate')::numeric, 0);
    v_subtotal := v_nightly * v_nights;
    v_assigned := 0;

    FOR v_unit_id IN
      SELECT u.id
      FROM units u
      WHERE u.property_id = p_property_id
        AND u.status = 'ACTIVE'
        AND unit_category_key(u.unit_type, u.capacity_adults, u.capacity_children) = v_category_key
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
        v_category_key, v_quantity, v_assigned
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
