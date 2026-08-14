-- ============================================================
-- EZHost – Reservation / Stay split
-- ============================================================
-- Introduces `reservations` as the commercial booking entity and narrows
-- `stays` down to the concrete per-unit occupancy within a reservation.
--
-- The product is not in production yet: existing test bookings are
-- intentionally discarded (no backfill) so the new schema can be clean.
-- ============================================================

-- ============================================================
-- RESERVATION NUMBER GENERATION
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS reservation_number_seq START WITH 10001;

CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'EZH' || nextval('reservation_number_seq')::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RESERVATIONS
-- ============================================================

CREATE TABLE reservations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id             UUID NOT NULL REFERENCES properties(id),
  reservation_number      TEXT NOT NULL UNIQUE DEFAULT generate_reservation_number(),
  booker_id               UUID NOT NULL REFERENCES guests(id),
  primary_guest_id        UUID NOT NULL REFERENCES guests(id),
  external_reference      TEXT,
  source                  stay_source NOT NULL DEFAULT 'MANUAL',
  booking_status          booking_status NOT NULL DEFAULT 'CONFIRMED',
  total_amount            NUMERIC(10, 2),
  currency                TEXT NOT NULL DEFAULT 'EUR',
  confirmation_preference TEXT,
  notes                   TEXT,
  internal_notes          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at            TIMESTAMPTZ
);

COMMENT ON COLUMN reservations.reservation_number IS
  'Internal EZHost reservation number (e.g. EZH12345). Auto-generated, unique, immutable — never manually editable.';
COMMENT ON COLUMN reservations.external_reference IS
  'External booking reference from a channel manager / OTA (e.g. Booking.com). Nullable, set only by import/API — never manually editable via the UI.';

CREATE INDEX idx_reservations_organization_id ON reservations(organization_id);
CREATE INDEX idx_reservations_property_id ON reservations(property_id);
CREATE INDEX idx_reservations_booker_id ON reservations(booker_id);
CREATE INDEX idx_reservations_primary_guest_id ON reservations(primary_guest_id);
CREATE INDEX idx_reservations_booking_status ON reservations(booking_status);

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- reservation_number is system-generated and must never change after creation.
CREATE OR REPLACE FUNCTION prevent_reservation_number_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reservation_number IS DISTINCT FROM OLD.reservation_number THEN
    RAISE EXCEPTION 'reservation_number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservations_number_immutable
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION prevent_reservation_number_update();

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select" ON reservations FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "reservations_insert" ON reservations FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

CREATE POLICY "reservations_update" ON reservations FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

-- ============================================================
-- CLEAR EXISTING TEST DATA IN `stays`
-- ============================================================
-- Not in production yet — no backfill is built. Cascades to stay_guests and
-- email_deliveries (ON DELETE CASCADE); nulls stay_id on breakfast_items,
-- housekeeping_tasks and operational_notes (ON DELETE SET NULL), leaving
-- those rows intact.

DELETE FROM stays;

-- ============================================================
-- STAYS – narrow down to the per-unit occupancy
-- ============================================================

ALTER TABLE stays
  ADD COLUMN reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  ADD COLUMN stay_number TEXT NOT NULL UNIQUE;

ALTER TABLE stays
  DROP COLUMN primary_guest_id,
  DROP COLUMN external_reference,
  DROP COLUMN source,
  DROP COLUMN booking_status,
  DROP COLUMN total_amount,
  DROP COLUMN currency,
  DROP COLUMN confirmation_preference,
  DROP COLUMN room_count,
  DROP COLUMN internal_notes;

COMMENT ON COLUMN stays.stay_number IS
  'Human-readable stay number derived from the parent reservation (e.g. EZH12345-1). Auto-generated, unique, immutable.';
COMMENT ON COLUMN stays.notes IS
  'Operative notes for this specific stay (as opposed to reservations.notes / internal_notes, which apply to the whole booking).';

CREATE INDEX idx_stays_reservation_id ON stays(reservation_id);

-- stay_number: "<reservation_number>-<n>", n = 1-based position within the
-- reservation. The reservation row is locked first so concurrent inserts for
-- the same reservation can't race to the same n.
CREATE OR REPLACE FUNCTION generate_stay_number()
RETURNS TRIGGER AS $$
DECLARE
  v_reservation_number TEXT;
  v_next_index INTEGER;
BEGIN
  SELECT reservation_number INTO v_reservation_number
  FROM reservations
  WHERE id = NEW.reservation_id
  FOR UPDATE;

  SELECT COUNT(*) + 1 INTO v_next_index
  FROM stays
  WHERE reservation_id = NEW.reservation_id;

  NEW.stay_number := v_reservation_number || '-' || v_next_index;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stays_generate_number
  BEFORE INSERT ON stays
  FOR EACH ROW EXECUTE FUNCTION generate_stay_number();

CREATE OR REPLACE FUNCTION prevent_stay_number_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stay_number IS DISTINCT FROM OLD.stay_number THEN
    RAISE EXCEPTION 'stay_number is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stays_number_immutable
  BEFORE UPDATE ON stays
  FOR EACH ROW EXECUTE FUNCTION prevent_stay_number_update();

-- ============================================================
-- EMAIL DELIVERIES – move from stay-scoped to reservation-scoped
-- ============================================================

ALTER TABLE email_deliveries
  DROP COLUMN booking_id,
  ADD COLUMN reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE;

CREATE INDEX idx_email_deliveries_reservation_id ON email_deliveries(reservation_id);

-- ============================================================
-- BOOKING CREATION FLOW – Booker + Primary Guest + Reservation + Stay + stay_guests
-- ============================================================

DROP FUNCTION IF EXISTS create_stay_booking_flow(
  UUID, UUID, UUID, DATE, DATE, INTEGER, INTEGER, INTEGER, booking_status,
  TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT,
  JSONB, JSONB, JSONB, JSONB
);

CREATE OR REPLACE FUNCTION create_stay_booking_flow(
  p_organization_id UUID,
  p_property_id UUID,
  p_unit_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_adults INTEGER,
  p_children INTEGER,
  p_booking_status booking_status,
  p_rate_code TEXT,
  p_rate_label TEXT,
  p_room_label TEXT,
  p_nightly_rate NUMERIC,
  p_subtotal_amount NUMERIC,
  p_extras_amount NUMERIC,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_confirmation_preference TEXT,
  p_internal_notes TEXT,
  p_price_details JSONB,
  p_extras_details JSONB,
  p_primary_guest JSONB,
  p_accompanying_guests JSONB DEFAULT '[]'::jsonb
)
RETURNS stays
LANGUAGE plpgsql
AS $$
DECLARE
  v_guest_id UUID;
  v_guest JSONB;
  v_accompanying_guest_id UUID;
  v_reservation reservations;
  v_stay stays;
BEGIN
  -- Booker and Primary Guest are the same person for this flow: the UI only
  -- collects one guest at booking time.
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

  INSERT INTO reservations (
    organization_id, property_id, booker_id, primary_guest_id,
    source, booking_status, total_amount, currency, confirmation_preference, internal_notes
  )
  VALUES (
    p_organization_id, p_property_id, v_guest_id, v_guest_id,
    'MANUAL', p_booking_status, p_total_amount,
    COALESCE(NULLIF(p_currency, ''), 'EUR'),
    NULLIF(p_confirmation_preference, ''),
    NULLIF(p_internal_notes, '')
  )
  RETURNING * INTO v_reservation;

  INSERT INTO stays (
    organization_id, property_id, unit_id, reservation_id,
    check_in_date, check_out_date, adults, children,
    status, registration_status,
    room_label, rate_code, rate_label, nightly_rate, subtotal_amount, extras_amount,
    price_details, extras_details
  )
  VALUES (
    p_organization_id, p_property_id, p_unit_id, v_reservation.id,
    p_check_in_date, p_check_out_date, p_adults, p_children,
    'BOOKED', 'MISSING',
    NULLIF(p_room_label, ''), NULLIF(p_rate_code, ''), NULLIF(p_rate_label, ''),
    p_nightly_rate, p_subtotal_amount, p_extras_amount,
    COALESCE(p_price_details, '{}'::jsonb), COALESCE(p_extras_details, '[]'::jsonb)
  )
  RETURNING * INTO v_stay;

  INSERT INTO stay_guests (organization_id, stay_id, guest_id, is_primary_guest)
  VALUES (p_organization_id, v_stay.id, v_guest_id, TRUE);

  FOR v_guest IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_accompanying_guests, '[]'::jsonb))
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
    VALUES (p_organization_id, v_stay.id, v_accompanying_guest_id, FALSE);
  END LOOP;

  RETURN v_stay;
END;
$$;
