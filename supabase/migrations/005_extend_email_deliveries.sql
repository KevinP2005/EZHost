-- ============================================================
-- EZHost – Extend email_deliveries for rich mailing history
-- ============================================================

-- Add metadata columns for richer message tracking
ALTER TABLE email_deliveries
  ADD COLUMN IF NOT EXISTS subject             TEXT,
  ADD COLUMN IF NOT EXISTS template_type       TEXT,
  ADD COLUMN IF NOT EXISTS language            TEXT NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS sent_by_profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Widen email_type to support all future message types.
-- Drop the old CHECK constraint and replace with the extended set.
ALTER TABLE email_deliveries DROP CONSTRAINT IF EXISTS email_deliveries_email_type_check;
ALTER TABLE email_deliveries
  ADD CONSTRAINT email_deliveries_email_type_check
  CHECK (email_type IN (
    'BOOKING_CONFIRMATION',
    'OFFER',
    'ONLINE_CHECK_IN',
    'PRE_ARRIVAL',
    'AFTER_CHECK_IN',
    'AFTER_CHECK_OUT',
    'CANCELLATION',
    'MANUAL'
  ));

CREATE INDEX IF NOT EXISTS idx_email_deliveries_sent_by ON email_deliveries(sent_by_profile_id);
