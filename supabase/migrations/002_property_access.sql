-- ============================================================
-- Property-scoped access control
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_property_access (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_property_access_profile_id
  ON profile_property_access(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_property_access_property_id
  ON profile_property_access(property_id);

ALTER TABLE profile_property_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_property_id
  ON activity_logs(property_id);

CREATE OR REPLACE FUNCTION auth_is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'SUPER_ADMIN';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'ORG_ADMIN';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_can_access_property(target_property_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    auth_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = target_property_id
        AND p.organization_id = auth_organization_id()
        AND auth_role() = 'ORG_ADMIN'
    )
    OR EXISTS (
      SELECT 1
      FROM profile_property_access ppa
      JOIN properties p ON p.id = ppa.property_id
      WHERE ppa.profile_id = auth_profile_id()
        AND ppa.property_id = target_property_id
        AND p.organization_id = auth_organization_id()
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_can_manage_property_access(target_profile_id UUID, target_property_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    auth_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM profiles target_profile
      JOIN properties target_property ON target_property.id = target_property_id
      WHERE target_profile.id = target_profile_id
        AND target_profile.organization_id = auth_organization_id()
        AND target_property.organization_id = auth_organization_id()
        AND auth_role() = 'ORG_ADMIN'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "profile_property_access_select" ON profile_property_access;
CREATE POLICY "profile_property_access_select" ON profile_property_access FOR SELECT
  USING (
    auth_is_super_admin()
    OR profile_id = auth_profile_id()
    OR EXISTS (
      SELECT 1
      FROM profiles target_profile
      JOIN properties target_property ON target_property.id = profile_property_access.property_id
      WHERE target_profile.id = profile_property_access.profile_id
        AND target_profile.organization_id = auth_organization_id()
        AND target_property.organization_id = auth_organization_id()
        AND auth_role() = 'ORG_ADMIN'
    )
  );

DROP POLICY IF EXISTS "profile_property_access_insert" ON profile_property_access;
CREATE POLICY "profile_property_access_insert" ON profile_property_access FOR INSERT
  WITH CHECK (auth_can_manage_property_access(profile_id, property_id));

DROP POLICY IF EXISTS "profile_property_access_delete" ON profile_property_access;
CREATE POLICY "profile_property_access_delete" ON profile_property_access FOR DELETE
  USING (auth_can_manage_property_access(profile_id, property_id));

DROP POLICY IF EXISTS "properties_select" ON properties;
CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(id)
  );

DROP POLICY IF EXISTS "units_select" ON units;
CREATE POLICY "units_select" ON units FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "guests_select" ON guests;
CREATE POLICY "guests_select" ON guests FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM stays s
      WHERE s.organization_id = guests.organization_id
        AND s.primary_guest_id = guests.id
        AND auth_can_access_property(s.property_id)
    )
  );

DROP POLICY IF EXISTS "stays_select" ON stays;
CREATE POLICY "stays_select" ON stays FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "stay_guests_select" ON stay_guests;
CREATE POLICY "stay_guests_select" ON stay_guests FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM stays s
      WHERE s.id = stay_guests.stay_id
        AND auth_can_access_property(s.property_id)
    )
  );

DROP POLICY IF EXISTS "breakfast_items_select" ON breakfast_items;
CREATE POLICY "breakfast_items_select" ON breakfast_items FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "housekeeping_tasks_select" ON housekeeping_tasks;
CREATE POLICY "housekeeping_tasks_select" ON housekeeping_tasks FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "unit_status_logs_select" ON unit_status_logs;
CREATE POLICY "unit_status_logs_select" ON unit_status_logs FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "operational_notes_select" ON operational_notes;
CREATE POLICY "operational_notes_select" ON operational_notes FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR property_id IS NULL
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "guest_registration_settings_select" ON guest_registration_settings;
CREATE POLICY "guest_registration_settings_select" ON guest_registration_settings FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR property_id IS NULL
    OR auth_can_access_property(property_id)
  );

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (
    auth_is_super_admin()
    OR (organization_id = auth_organization_id() AND auth_role() = 'ORG_ADMIN')
    OR (property_id IS NOT NULL AND auth_can_access_property(property_id))
  );

DROP POLICY IF EXISTS "units_insert" ON units;
CREATE POLICY "units_insert" ON units FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "units_update" ON units;
CREATE POLICY "units_update" ON units FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "stays_insert" ON stays;
CREATE POLICY "stays_insert" ON stays FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "stays_update" ON stays;
CREATE POLICY "stays_update" ON stays FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "stay_guests_insert" ON stay_guests;
CREATE POLICY "stay_guests_insert" ON stay_guests FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM stays s
      WHERE s.id = stay_guests.stay_id
        AND s.organization_id = auth_organization_id()
        AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
        AND auth_can_access_property(s.property_id)
    )
  );

DROP POLICY IF EXISTS "stay_guests_delete" ON stay_guests;
CREATE POLICY "stay_guests_delete" ON stay_guests FOR DELETE
  USING (
    auth_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM stays s
      WHERE s.id = stay_guests.stay_id
        AND s.organization_id = auth_organization_id()
        AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION')
        AND auth_can_access_property(s.property_id)
    )
  );

DROP POLICY IF EXISTS "breakfast_items_insert" ON breakfast_items;
CREATE POLICY "breakfast_items_insert" ON breakfast_items FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "breakfast_items_update" ON breakfast_items;
CREATE POLICY "breakfast_items_update" ON breakfast_items FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN')
      AND auth_can_access_property(property_id)
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "housekeeping_tasks_insert" ON housekeeping_tasks;
CREATE POLICY "housekeeping_tasks_insert" ON housekeeping_tasks FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "housekeeping_tasks_update" ON housekeeping_tasks;
CREATE POLICY "housekeeping_tasks_update" ON housekeeping_tasks FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "unit_status_logs_insert" ON unit_status_logs;
CREATE POLICY "unit_status_logs_insert" ON unit_status_logs FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')
      AND auth_can_access_property(property_id)
    )
  );

DROP POLICY IF EXISTS "operational_notes_insert" ON operational_notes;
CREATE POLICY "operational_notes_insert" ON operational_notes FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() != 'READ_ONLY'
      AND (
        (property_id IS NULL AND auth_role() IN ('ORG_ADMIN', 'MANAGER'))
        OR (property_id IS NOT NULL AND auth_can_access_property(property_id))
      )
    )
  );

DROP POLICY IF EXISTS "operational_notes_update" ON operational_notes;
CREATE POLICY "operational_notes_update" ON operational_notes FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND (property_id IS NULL OR auth_can_access_property(property_id))
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() IN ('ORG_ADMIN', 'MANAGER')
      AND (property_id IS NULL OR auth_can_access_property(property_id))
    )
  );

DROP POLICY IF EXISTS "registration_settings_insert" ON guest_registration_settings;
CREATE POLICY "registration_settings_insert" ON guest_registration_settings FOR INSERT
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() = 'ORG_ADMIN'
      AND (property_id IS NULL OR auth_can_access_property(property_id))
    )
  );

DROP POLICY IF EXISTS "registration_settings_update" ON guest_registration_settings;
CREATE POLICY "registration_settings_update" ON guest_registration_settings FOR UPDATE
  USING (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() = 'ORG_ADMIN'
      AND (property_id IS NULL OR auth_can_access_property(property_id))
    )
  )
  WITH CHECK (
    auth_is_super_admin()
    OR (
      organization_id = auth_organization_id()
      AND auth_role() = 'ORG_ADMIN'
      AND (property_id IS NULL OR auth_can_access_property(property_id))
    )
  );

INSERT INTO profile_property_access (profile_id, property_id, created_by_profile_id)
SELECT p.id, pr.id, NULL
FROM profiles p
JOIN properties pr ON pr.organization_id = p.organization_id
WHERE p.role NOT IN ('SUPER_ADMIN', 'ORG_ADMIN')
  AND p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM profile_property_access existing
    WHERE existing.profile_id = p.id
  )
  AND pr.id = (
    SELECT pr2.id
    FROM properties pr2
    WHERE pr2.organization_id = p.organization_id
      AND pr2.active = TRUE
    ORDER BY pr2.created_at ASC, pr2.name ASC
    LIMIT 1
  );
