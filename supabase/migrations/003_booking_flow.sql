-- ============================================================
-- EZHost - Booking Flow Persistence
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'booking_status'
  ) THEN
    CREATE TYPE booking_status AS ENUM ('OFFER', 'CONFIRMED');
  END IF;
END $$;

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS company TEXT;

ALTER TABLE stays
  ADD COLUMN IF NOT EXISTS booking_status booking_status NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS room_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_label TEXT,
  ADD COLUMN IF NOT EXISTS rate_code TEXT,
  ADD COLUMN IF NOT EXISTS rate_label TEXT,
  ADD COLUMN IF NOT EXISTS nightly_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS extras_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS confirmation_preference TEXT,
  ADD COLUMN IF NOT EXISTS price_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extras_details JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stays_booking_status ON stays(booking_status);

CREATE OR REPLACE FUNCTION create_stay_booking_flow(
  p_organization_id UUID,
  p_property_id UUID,
  p_unit_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_adults INTEGER,
  p_children INTEGER,
  p_room_count INTEGER,
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
  v_primary_guest_id UUID;
  v_guest JSONB;
  v_guest_id UUID;
  v_stay stays;
BEGIN
  INSERT INTO guests (
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    address,
    document_type,
    document_number,
    company
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
  RETURNING id INTO v_primary_guest_id;

  INSERT INTO stays (
    organization_id,
    property_id,
    unit_id,
    primary_guest_id,
    source,
    check_in_date,
    check_out_date,
    adults,
    children,
    status,
    booking_status,
    registration_status,
    room_count,
    room_label,
    rate_code,
    rate_label,
    nightly_rate,
    subtotal_amount,
    extras_amount,
    total_amount,
    currency,
    confirmation_preference,
    internal_notes,
    price_details,
    extras_details
  )
  VALUES (
    p_organization_id,
    p_property_id,
    p_unit_id,
    v_primary_guest_id,
    'MANUAL',
    p_check_in_date,
    p_check_out_date,
    p_adults,
    p_children,
    'BOOKED',
    p_booking_status,
    'MISSING',
    GREATEST(p_room_count, 1),
    NULLIF(p_room_label, ''),
    NULLIF(p_rate_code, ''),
    NULLIF(p_rate_label, ''),
    p_nightly_rate,
    p_subtotal_amount,
    p_extras_amount,
    p_total_amount,
    COALESCE(NULLIF(p_currency, ''), 'EUR'),
    NULLIF(p_confirmation_preference, ''),
    NULLIF(p_internal_notes, ''),
    COALESCE(p_price_details, '{}'::jsonb),
    COALESCE(p_extras_details, '[]'::jsonb)
  )
  RETURNING * INTO v_stay;

  INSERT INTO stay_guests (organization_id, stay_id, guest_id, is_primary_guest)
  VALUES (p_organization_id, v_stay.id, v_primary_guest_id, TRUE);

  FOR v_guest IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_accompanying_guests, '[]'::jsonb))
  LOOP
    INSERT INTO guests (
      organization_id,
      first_name,
      last_name,
      date_of_birth
    )
    VALUES (
      p_organization_id,
      COALESCE(v_guest->>'first_name', ''),
      COALESCE(v_guest->>'last_name', ''),
      NULLIF(v_guest->>'date_of_birth', '')::date
    )
    RETURNING id INTO v_guest_id;

    INSERT INTO stay_guests (organization_id, stay_id, guest_id, is_primary_guest)
    VALUES (p_organization_id, v_stay.id, v_guest_id, FALSE);
  END LOOP;

  RETURN v_stay;
END;
$$;
