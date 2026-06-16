-- ============================================================
-- EZHost - Email Delivery Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS email_deliveries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id      UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  recipient       TEXT NOT NULL,
  email_type      TEXT NOT NULL CHECK (email_type IN ('BOOKING_CONFIRMATION', 'OFFER')),
  resend_email_id TEXT,
  status          TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_booking_id ON email_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_organization_id ON email_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON email_deliveries(status);

ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_deliveries_select" ON email_deliveries;
CREATE POLICY "email_deliveries_select" ON email_deliveries FOR SELECT
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR organization_id = auth_organization_id()
  );

DROP POLICY IF EXISTS "email_deliveries_insert" ON email_deliveries;
CREATE POLICY "email_deliveries_insert" ON email_deliveries FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
    )
  );
