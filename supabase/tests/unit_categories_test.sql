-- ============================================================
-- EZHost – Unit Categories: verification script
-- ============================================================
-- Covers the database-level cases of the Property -> Unit Category -> Units
-- model and its effect on the booking flow. Runs inside a single transaction
-- that is ROLLED BACK at the end, so it's safe against a dev database with
-- real data.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/unit_categories_test.sql
--
-- Any failing expectation raises an exception and aborts the run.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_org_id UUID;
  v_property_id UUID;
  v_cat_standard_id UUID; -- "Standard Double" — 3 physical units, no cap
  v_cat_superior_id UUID; -- "Superior Double" — same capacity as Standard, distinct category
  v_cat_solo_id UUID;     -- physically exists exactly once
  v_cat_capped_id UUID;   -- 3 physical units, bookable_units_limit = 2
  v_reservation reservations;
  v_reservation_b reservations;
  v_stay_count INTEGER;
  v_distinct_units INTEGER;
  v_distinct_categories INTEGER;
  v_guest JSONB := jsonb_build_object(
    'first_name', 'Test', 'last_name', 'Booker',
    'email', 'test.booker@example.com', 'phone', '+43 000 000',
    'date_of_birth', '1990-01-01', 'address', 'Teststrasse 1',
    'document_type', 'passport', 'document_number', 'TEST123'
  );
  v_check_in DATE := CURRENT_DATE + 500; -- far future, avoids seed collisions
  v_check_out DATE := CURRENT_DATE + 503;
  v_failed BOOLEAN;
BEGIN
  -- ── Fixture ───────────────────────────────────────────────────────────────
  INSERT INTO organizations (name, status) VALUES ('Unit Category Test Org', 'ACTIVE')
  RETURNING id INTO v_org_id;

  INSERT INTO properties (organization_id, name, type) VALUES (v_org_id, 'Test Property', 'HOTEL')
  RETURNING id INTO v_property_id;

  INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, bookable_units_limit)
  VALUES
    (v_org_id, v_property_id, 'Standard Double', 'ROOM', 2, 0, NULL)
  RETURNING id INTO v_cat_standard_id;

  -- Case 10: same type + same capacity as "Standard Double", but a distinct category.
  INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, bookable_units_limit)
  VALUES
    (v_org_id, v_property_id, 'Superior Double', 'ROOM', 2, 0, NULL)
  RETURNING id INTO v_cat_superior_id;

  INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, bookable_units_limit)
  VALUES
    (v_org_id, v_property_id, 'Solo Apartment', 'APARTMENT', 2, 2, NULL)
  RETURNING id INTO v_cat_solo_id;

  -- Case 6: 3 physical units, but capped at 2 bookable.
  INSERT INTO unit_categories (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, bookable_units_limit)
  VALUES
    (v_org_id, v_property_id, 'Capped Room', 'ROOM', 2, 0, 2)
  RETURNING id INTO v_cat_capped_id;

  INSERT INTO units (organization_id, property_id, unit_category_id, name, status) VALUES
    (v_org_id, v_property_id, v_cat_standard_id, 'Standard 201', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_standard_id, 'Standard 202', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_standard_id, 'Standard 203', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_superior_id, 'Superior 301', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_solo_id,     'Solo Apartment', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_capped_id,   'Capped 401', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_capped_id,   'Capped 402', 'ACTIVE'),
    (v_org_id, v_property_id, v_cat_capped_id,   'Capped 403', 'ACTIVE');

  -- ── Case 10 check: identical type+capacity, distinct category identity ────
  SELECT COUNT(DISTINCT id) INTO v_distinct_categories
  FROM unit_categories
  WHERE property_id = v_property_id AND unit_type = 'ROOM' AND capacity_adults = 2 AND capacity_children = 0;

  IF v_distinct_categories <> 2 THEN
    RAISE EXCEPTION 'Case 10 failed: Standard/Superior Double did not remain distinct categories';
  END IF;

  -- ── Case 1: single-unit reservation ────────────────────────────────────────
  v_reservation := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in, v_check_out, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_id', v_cat_standard_id, 'quantity', 1, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Standard Double',
      'nightly_rate', 150
    )),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*) INTO v_stay_count FROM stays WHERE reservation_id = v_reservation.id;
  IF v_stay_count <> 1 THEN
    RAISE EXCEPTION 'Case 1 failed: expected 1 stay, got %', v_stay_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stays s JOIN units u ON u.id = s.unit_id
    WHERE s.reservation_id = v_reservation.id AND u.unit_category_id = v_cat_standard_id
  ) THEN
    RAISE EXCEPTION 'Case 9 failed: automatic unit assignment did not pick a unit of the requested category';
  END IF;

  -- ── Case 2 + 9: multiple units of the same category, correct auto-assignment ─
  v_reservation_b := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 10, v_check_out + 10, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_id', v_cat_standard_id, 'quantity', 2, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Standard Double',
      'nightly_rate', 150
    )),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*), COUNT(DISTINCT unit_id)
  INTO v_stay_count, v_distinct_units
  FROM stays WHERE reservation_id = v_reservation_b.id;

  IF v_stay_count <> 2 THEN
    RAISE EXCEPTION 'Case 2 failed: expected 2 stays, got %', v_stay_count;
  END IF;

  -- ── Case 8: no double assignment ───────────────────────────────────────────
  IF v_distinct_units <> 2 THEN
    RAISE EXCEPTION 'Case 8 failed: stays share a unit (% distinct)', v_distinct_units;
  END IF;

  -- ── Case 5: only 1 physical unit in "Solo Apartment" -> max 1 selectable ───
  v_failed := FALSE;
  BEGIN
    PERFORM create_reservation_booking_flow(
      v_org_id, v_property_id, v_check_in + 20, v_check_out + 20, 'CONFIRMED', 'EUR', 'send', NULL,
      0, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'category_id', v_cat_solo_id, 'quantity', 2, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Solo Apartment',
        'nightly_rate', 140
      )),
      v_guest, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Case 5 failed: booked 2 units of a single-physical-unit category';
  END IF;

  -- ── Case 6: bookable_units_limit (2) below physical count (3) is enforced ──
  v_failed := FALSE;
  BEGIN
    PERFORM create_reservation_booking_flow(
      v_org_id, v_property_id, v_check_in + 30, v_check_out + 30, 'CONFIRMED', 'EUR', 'send', NULL,
      0, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'category_id', v_cat_capped_id, 'quantity', 3, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Capped Room',
        'nightly_rate', 120
      )),
      v_guest, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Case 6 failed: booked 3 units of a category capped at 2 by bookable_units_limit';
  END IF;

  -- 2 units of the capped category must still succeed (within the cap).
  PERFORM create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 30, v_check_out + 30, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_id', v_cat_capped_id, 'quantity', 2, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Capped Room',
      'nightly_rate', 120
    )),
    v_guest, '[]'::jsonb
  );

  -- ── Case 3 + 4: multiple categories in one reservation ─────────────────────
  v_reservation := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 40, v_check_out + 40, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'category_id', v_cat_standard_id, 'quantity', 2, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Standard Double',
        'nightly_rate', 150
      ),
      jsonb_build_object(
        'category_id', v_cat_superior_id, 'quantity', 1, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Superior Double',
        'nightly_rate', 190
      )
    ),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*), COUNT(DISTINCT unit_id)
  INTO v_stay_count, v_distinct_units
  FROM stays WHERE reservation_id = v_reservation.id;

  IF v_stay_count <> 3 OR v_distinct_units <> 3 THEN
    RAISE EXCEPTION 'Case 4 failed: expected 3 stays on 3 units, got % / %', v_stay_count, v_distinct_units;
  END IF;

  -- Confirms Standard and Superior stays actually landed on their own category's units.
  IF (
    SELECT COUNT(*) FROM stays s JOIN units u ON u.id = s.unit_id
    WHERE s.reservation_id = v_reservation.id AND u.unit_category_id = v_cat_standard_id
  ) <> 2 THEN
    RAISE EXCEPTION 'Case 3 failed: Standard Double position did not resolve to 2 units of that category';
  END IF;

  IF (
    SELECT COUNT(*) FROM stays s JOIN units u ON u.id = s.unit_id
    WHERE s.reservation_id = v_reservation.id AND u.unit_category_id = v_cat_superior_id
  ) <> 1 THEN
    RAISE EXCEPTION 'Case 3 failed: Superior Double position did not resolve to 1 unit of that category';
  END IF;

  -- ── Case 7: an already-occupied unit reduces availability correctly ────────
  -- All 3 Standard units are now taken for [check_in+40, check_out+40) by the
  -- reservation above (2) and the one from Case 2 doesn't overlap this window,
  -- so exactly 1 Standard unit remains free here — request 2, expect failure.
  v_failed := FALSE;
  BEGIN
    PERFORM create_reservation_booking_flow(
      v_org_id, v_property_id, v_check_in + 40, v_check_out + 40, 'CONFIRMED', 'EUR', 'send', NULL,
      0, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'category_id', v_cat_standard_id, 'quantity', 2, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Standard Double',
        'nightly_rate', 150
      )),
      v_guest, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Case 7 failed: booked into a period where occupied units should have blocked it';
  END IF;

  -- No partial reservation may survive any of the failed attempts above.
  IF EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.property_id = v_property_id
      AND NOT EXISTS (SELECT 1 FROM stays s WHERE s.reservation_id = r.id)
  ) THEN
    RAISE EXCEPTION 'Case 4/7 failed: a reservation without stays was persisted';
  END IF;

  RAISE NOTICE 'All unit category checks passed.';
END $$;

ROLLBACK;
