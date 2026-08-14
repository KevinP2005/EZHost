-- ============================================================
-- EZHost – Multi-Stay booking flow: verification script
-- ============================================================
-- Covers the database-level cases of the multi-stay creation flow.
-- Everything runs inside a single transaction that is ROLLED BACK at the end,
-- so it is safe to run against a development database with real data.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/multi_stay_booking_flow_test.sql
--
-- Any failing expectation raises an exception and aborts the run.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_org_id UUID;
  v_property_id UUID;
  v_cat_multi TEXT;   -- category with 3 physical units
  v_cat_single TEXT;  -- category with exactly 1 physical unit
  v_reservation reservations;
  v_reservation_b reservations;
  v_stay_count INTEGER;
  v_distinct_units INTEGER;
  v_total NUMERIC;
  v_guest JSONB := jsonb_build_object(
    'first_name', 'Test', 'last_name', 'Booker',
    'email', 'test.booker@example.com', 'phone', '+43 000 000',
    'date_of_birth', '1990-01-01', 'address', 'Teststrasse 1',
    'document_type', 'passport', 'document_number', 'TEST123'
  );
  v_check_in DATE := CURRENT_DATE + 400;   -- far future, avoids seed collisions
  v_check_out DATE := CURRENT_DATE + 403;
  v_failed BOOLEAN;
  v_stay_numbers TEXT[];
BEGIN
  -- ── Fixture ───────────────────────────────────────────────────────────────
  INSERT INTO organizations (name, status) VALUES ('Multi-Stay Test Org', 'ACTIVE')
  RETURNING id INTO v_org_id;

  INSERT INTO properties (organization_id, name, type) VALUES (v_org_id, 'Test Property', 'HOTEL')
  RETURNING id INTO v_property_id;

  -- Category A: 3 interchangeable units (same type + capacity)
  INSERT INTO units (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, status)
  VALUES
    (v_org_id, v_property_id, 'Unit 201', 'APARTMENT', 4, 2, 'ACTIVE'),
    (v_org_id, v_property_id, 'Unit 203', 'APARTMENT', 4, 2, 'ACTIVE'),
    (v_org_id, v_property_id, 'Unit 205', 'APARTMENT', 4, 2, 'ACTIVE');

  -- Category B: physically exists only once
  INSERT INTO units (organization_id, property_id, name, unit_type, capacity_adults, capacity_children, status)
  VALUES (v_org_id, v_property_id, 'Solo Apartment', 'APARTMENT', 2, 2, 'ACTIVE');

  v_cat_multi := unit_category_key('APARTMENT'::unit_type, 4, 2);
  v_cat_single := unit_category_key('APARTMENT'::unit_type, 2, 2);

  -- ── Case 1 + 10 + 11 + 13: single unit, numbering, price ──────────────────
  v_reservation := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in, v_check_out, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_key', v_cat_multi, 'quantity', 1, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment B',
      'nightly_rate', 190
    )),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*) INTO v_stay_count FROM stays WHERE reservation_id = v_reservation.id;
  IF v_stay_count <> 1 THEN
    RAISE EXCEPTION 'Case 1 failed: expected 1 stay, got %', v_stay_count;
  END IF;

  IF v_reservation.reservation_number !~ '^EZH[0-9]+$' THEN
    RAISE EXCEPTION 'Case 10 failed: unexpected reservation_number %', v_reservation.reservation_number;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stays
    WHERE reservation_id = v_reservation.id
      AND stay_number = v_reservation.reservation_number || '-1'
  ) THEN
    RAISE EXCEPTION 'Case 11 failed: stay_number is not <reservation_number>-1';
  END IF;

  -- 3 nights x 190
  IF v_reservation.total_amount <> 570 THEN
    RAISE EXCEPTION 'Case 14 failed: expected total 570, got %', v_reservation.total_amount;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM stays WHERE reservation_id = v_reservation.id
      AND nightly_rate = 190 AND subtotal_amount = 570
  ) THEN
    RAISE EXCEPTION 'Case 13 failed: stay pricing not carried through';
  END IF;

  -- ── Case 2 + 12: two units of the same category, distinct assignment ──────
  v_reservation_b := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 10, v_check_out + 10, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_key', v_cat_multi, 'quantity', 2, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment B',
      'nightly_rate', 190
    )),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*), COUNT(DISTINCT unit_id)
  INTO v_stay_count, v_distinct_units
  FROM stays WHERE reservation_id = v_reservation_b.id;

  IF v_stay_count <> 2 THEN
    RAISE EXCEPTION 'Case 2 failed: expected 2 stays, got %', v_stay_count;
  END IF;

  IF v_distinct_units <> 2 THEN
    RAISE EXCEPTION 'Case 12 failed: stays share a unit (% distinct)', v_distinct_units;
  END IF;

  SELECT array_agg(stay_number ORDER BY stay_number) INTO v_stay_numbers
  FROM stays WHERE reservation_id = v_reservation_b.id;

  IF v_stay_numbers <> ARRAY[
    v_reservation_b.reservation_number || '-1',
    v_reservation_b.reservation_number || '-2'
  ] THEN
    RAISE EXCEPTION 'Case 11 failed: unexpected stay numbering %', v_stay_numbers;
  END IF;

  -- ── Case 3 + 7 + 9: over-booking a single-unit category must not persist ──
  v_failed := FALSE;
  BEGIN
    PERFORM create_reservation_booking_flow(
      v_org_id, v_property_id, v_check_in + 20, v_check_out + 20, 'CONFIRMED', 'EUR', 'send', NULL,
      0, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'category_key', v_cat_single, 'quantity', 2, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Solo Apartment',
        'nightly_rate', 140
      )),
      v_guest, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Case 3 failed: booking 2 units of a 1-unit category was allowed';
  END IF;

  -- ── Case 4 + 5 + 14: mixed categories in ONE reservation ──────────────────
  v_reservation := create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 30, v_check_out + 30, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'category_key', v_cat_multi, 'quantity', 2, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment B',
        'nightly_rate', 190
      ),
      jsonb_build_object(
        'category_key', v_cat_single, 'quantity', 1, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment A',
        'nightly_rate', 140
      )
    ),
    v_guest, '[]'::jsonb
  );

  SELECT COUNT(*), COUNT(DISTINCT unit_id)
  INTO v_stay_count, v_distinct_units
  FROM stays WHERE reservation_id = v_reservation.id;

  IF v_stay_count <> 3 OR v_distinct_units <> 3 THEN
    RAISE EXCEPTION 'Case 5 failed: expected 3 stays on 3 units, got % / %', v_stay_count, v_distinct_units;
  END IF;

  -- 2 x (3 x 190) + 1 x (3 x 140) = 1140 + 420
  IF v_reservation.total_amount <> 1560 THEN
    RAISE EXCEPTION 'Case 14 failed: expected mixed total 1560, got %', v_reservation.total_amount;
  END IF;

  -- Prices stay separated per position
  IF (SELECT COUNT(*) FROM stays WHERE reservation_id = v_reservation.id AND nightly_rate = 190) <> 2
     OR (SELECT COUNT(*) FROM stays WHERE reservation_id = v_reservation.id AND nightly_rate = 140) <> 1 THEN
    RAISE EXCEPTION 'Case 13 failed: per-position prices were not kept separate';
  END IF;

  -- ── Case 8 + 9: availability exhausted by an existing stay ────────────────
  -- All 3 units of v_cat_multi are free on this date; book 3, then try 1 more.
  PERFORM create_reservation_booking_flow(
    v_org_id, v_property_id, v_check_in + 40, v_check_out + 40, 'CONFIRMED', 'EUR', 'send', NULL,
    0, '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'category_key', v_cat_multi, 'quantity', 3, 'adults', 2, 'children', 0,
      'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment B',
      'nightly_rate', 190
    )),
    v_guest, '[]'::jsonb
  );

  v_failed := FALSE;
  BEGIN
    PERFORM create_reservation_booking_flow(
      v_org_id, v_property_id, v_check_in + 40, v_check_out + 40, 'CONFIRMED', 'EUR', 'send', NULL,
      0, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'category_key', v_cat_multi, 'quantity', 1, 'adults', 2, 'children', 0,
        'rate_code', 'standard', 'rate_label', 'Standard', 'room_label', 'Apartment B',
        'nightly_rate', 190
      )),
      v_guest, '[]'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := TRUE;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Case 8 failed: booked a 4th unit into a 3-unit category';
  END IF;

  -- No partial reservation may survive the failed attempt
  IF EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.property_id = v_property_id
      AND NOT EXISTS (SELECT 1 FROM stays s WHERE s.reservation_id = r.id)
  ) THEN
    RAISE EXCEPTION 'Case 9 failed: a reservation without stays was persisted';
  END IF;

  -- ── Case 16: stays of one reservation check in independently ──────────────
  UPDATE stays
  SET status = 'CHECKED_IN'
  WHERE id = (SELECT id FROM stays WHERE reservation_id = v_reservation.id ORDER BY stay_number LIMIT 1);

  IF (SELECT COUNT(*) FROM stays WHERE reservation_id = v_reservation.id AND status = 'BOOKED') <> 2 THEN
    RAISE EXCEPTION 'Case 16 failed: checking in one stay affected its siblings';
  END IF;

  -- ── Guest assignment: attached once, to the first stay only ───────────────
  IF (SELECT COUNT(*) FROM stay_guests sg
      JOIN stays s ON s.id = sg.stay_id
      WHERE s.reservation_id = v_reservation.id) <> 1 THEN
    RAISE EXCEPTION 'Guest assignment failed: expected exactly one stay_guests row';
  END IF;

  RAISE NOTICE 'All multi-stay booking flow checks passed.';
END $$;

ROLLBACK;
