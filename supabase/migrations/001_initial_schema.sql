-- ============================================================
-- EZHost – Initial Schema Migration
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE org_status AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL');
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION', 'HOUSEKEEPING', 'KITCHEN', 'READ_ONLY');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
CREATE TYPE property_type AS ENUM ('HOTEL', 'GUESTHOUSE', 'CHALET', 'APARTMENT_HOUSE', 'VACATION_RENTAL', 'OTHER');
CREATE TYPE unit_type AS ENUM ('ROOM', 'APARTMENT', 'CHALET', 'HOUSE', 'DORM', 'OTHER');
CREATE TYPE unit_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
CREATE TYPE housekeeping_status AS ENUM ('CLEAN', 'DIRTY', 'INSPECTED', 'OUT_OF_SERVICE');
CREATE TYPE stay_source AS ENUM ('MANUAL', 'IMPORT', 'PMS', 'OTA', 'OTHER');
CREATE TYPE stay_status AS ENUM ('BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
CREATE TYPE registration_status AS ENUM ('MISSING', 'PARTIAL', 'COMPLETE', 'NOT_REQUIRED');
CREATE TYPE breakfast_status AS ENUM ('PLANNED', 'PREPARED', 'SERVED', 'CANCELLED');
CREATE TYPE task_type AS ENUM ('CLEANING', 'INSPECTION', 'MAINTENANCE', 'LAUNDRY', 'OTHER');
CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'BLOCKED');
CREATE TYPE task_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE department AS ENUM ('RECEPTION', 'HOUSEKEEPING', 'KITCHEN', 'MANAGEMENT', 'GENERAL');
CREATE TYPE note_visibility AS ENUM ('INTERNAL', 'MANAGEMENT_ONLY');

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  country       TEXT,
  status        org_status NOT NULL DEFAULT 'TRIAL',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'READ_ONLY',
  status          user_status NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- PROPERTIES
-- ============================================================

CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            property_type NOT NULL DEFAULT 'HOTEL',
  address         TEXT,
  city            TEXT,
  country         TEXT,
  timezone        TEXT NOT NULL DEFAULT 'Europe/Vienna',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_organization_id ON properties(organization_id);

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- UNITS
-- ============================================================

CREATE TABLE units (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id         UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  unit_type           unit_type NOT NULL DEFAULT 'ROOM',
  capacity_adults     INTEGER NOT NULL DEFAULT 2,
  capacity_children   INTEGER NOT NULL DEFAULT 0,
  floor               TEXT,
  description         TEXT,
  status              unit_status NOT NULL DEFAULT 'ACTIVE',
  housekeeping_status housekeeping_status NOT NULL DEFAULT 'CLEAN',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_units_organization_id ON units(organization_id);
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_housekeeping_status ON units(housekeeping_status);

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- GUESTS
-- ============================================================

CREATE TABLE guests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  nationality     TEXT,
  address         TEXT,
  document_type   TEXT,
  document_number TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guests_organization_id ON guests(organization_id);

CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STAYS
-- ============================================================

CREATE TABLE stays (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id              UUID NOT NULL REFERENCES properties(id),
  unit_id                  UUID NOT NULL REFERENCES units(id),
  primary_guest_id         UUID REFERENCES guests(id) ON DELETE SET NULL,
  external_reference       TEXT,
  source                   stay_source NOT NULL DEFAULT 'MANUAL',
  check_in_date            DATE NOT NULL,
  check_out_date           DATE NOT NULL,
  arrival_time             TIME,
  departure_time           TIME,
  adults                   INTEGER NOT NULL DEFAULT 1,
  children                 INTEGER NOT NULL DEFAULT 0,
  status                   stay_status NOT NULL DEFAULT 'BOOKED',
  breakfast_included       BOOLEAN NOT NULL DEFAULT FALSE,
  breakfast_count_adults   INTEGER NOT NULL DEFAULT 0,
  breakfast_count_children INTEGER NOT NULL DEFAULT 0,
  local_tax_applicable     BOOLEAN NOT NULL DEFAULT FALSE,
  local_tax_amount         NUMERIC(10, 2),
  registration_status      registration_status NOT NULL DEFAULT 'MISSING',
  notes                    TEXT,
  internal_notes           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_stays_organization_id ON stays(organization_id);
CREATE INDEX idx_stays_property_id ON stays(property_id);
CREATE INDEX idx_stays_unit_id ON stays(unit_id);
CREATE INDEX idx_stays_check_in_date ON stays(check_in_date);
CREATE INDEX idx_stays_check_out_date ON stays(check_out_date);
CREATE INDEX idx_stays_status ON stays(status);
CREATE INDEX idx_stays_primary_guest_id ON stays(primary_guest_id);

CREATE TRIGGER trg_stays_updated_at
  BEFORE UPDATE ON stays
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- STAY GUESTS
-- ============================================================

CREATE TABLE stay_guests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stay_id          UUID NOT NULL REFERENCES stays(id) ON DELETE CASCADE,
  guest_id         UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  is_primary_guest BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stay_id, guest_id)
);

CREATE INDEX idx_stay_guests_stay_id ON stay_guests(stay_id);
CREATE INDEX idx_stay_guests_guest_id ON stay_guests(guest_id);

-- ============================================================
-- BREAKFAST ITEMS
-- ============================================================

CREATE TABLE breakfast_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES properties(id),
  stay_id          UUID REFERENCES stays(id) ON DELETE SET NULL,
  unit_id          UUID REFERENCES units(id) ON DELETE SET NULL,
  date             DATE NOT NULL,
  adults_count     INTEGER NOT NULL DEFAULT 0,
  children_count   INTEGER NOT NULL DEFAULT 0,
  breakfast_type   TEXT,
  allergies        TEXT,
  special_requests TEXT,
  notes            TEXT,
  status           breakfast_status NOT NULL DEFAULT 'PLANNED',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breakfast_items_organization_id ON breakfast_items(organization_id);
CREATE INDEX idx_breakfast_items_date ON breakfast_items(date);
CREATE INDEX idx_breakfast_items_property_id ON breakfast_items(property_id);

CREATE TRIGGER trg_breakfast_items_updated_at
  BEFORE UPDATE ON breakfast_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- HOUSEKEEPING TASKS
-- ============================================================

CREATE TABLE housekeeping_tasks (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id             UUID NOT NULL REFERENCES properties(id),
  unit_id                 UUID NOT NULL REFERENCES units(id),
  stay_id                 UUID REFERENCES stays(id) ON DELETE SET NULL,
  assigned_to_profile_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  task_type               task_type NOT NULL DEFAULT 'CLEANING',
  title                   TEXT NOT NULL,
  description             TEXT,
  due_date                DATE,
  status                  task_status NOT NULL DEFAULT 'OPEN',
  priority                task_priority NOT NULL DEFAULT 'NORMAL',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_housekeeping_tasks_organization_id ON housekeeping_tasks(organization_id);
CREATE INDEX idx_housekeeping_tasks_property_id ON housekeeping_tasks(property_id);
CREATE INDEX idx_housekeeping_tasks_unit_id ON housekeeping_tasks(unit_id);
CREATE INDEX idx_housekeeping_tasks_status ON housekeeping_tasks(status);
CREATE INDEX idx_housekeeping_tasks_due_date ON housekeeping_tasks(due_date);

CREATE TRIGGER trg_housekeeping_tasks_updated_at
  BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- UNIT STATUS LOGS
-- ============================================================

CREATE TABLE unit_status_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id),
  unit_id               UUID NOT NULL REFERENCES units(id),
  changed_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  previous_status       housekeeping_status,
  new_status            housekeeping_status NOT NULL,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_unit_status_logs_unit_id ON unit_status_logs(unit_id);
CREATE INDEX idx_unit_status_logs_organization_id ON unit_status_logs(organization_id);

-- ============================================================
-- OPERATIONAL NOTES
-- ============================================================

CREATE TABLE operational_notes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id               UUID REFERENCES units(id) ON DELETE SET NULL,
  stay_id               UUID REFERENCES stays(id) ON DELETE SET NULL,
  guest_id              UUID REFERENCES guests(id) ON DELETE SET NULL,
  created_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  department            department NOT NULL DEFAULT 'GENERAL',
  note                  TEXT NOT NULL,
  visibility            note_visibility NOT NULL DEFAULT 'INTERNAL',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operational_notes_organization_id ON operational_notes(organization_id);
CREATE INDEX idx_operational_notes_stay_id ON operational_notes(stay_id);
CREATE INDEX idx_operational_notes_unit_id ON operational_notes(unit_id);

CREATE TRIGGER trg_operational_notes_updated_at
  BEFORE UPDATE ON operational_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- GUEST REGISTRATION SETTINGS
-- ============================================================

CREATE TABLE guest_registration_settings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id       UUID REFERENCES properties(id) ON DELETE CASCADE,
  country           TEXT NOT NULL,
  region            TEXT,
  city              TEXT,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  required_fields   JSONB NOT NULL DEFAULT '[]',
  local_tax_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  local_tax_rules   JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_registration_settings_organization_id ON guest_registration_settings(organization_id);

CREATE TRIGGER trg_guest_registration_settings_updated_at
  BEFORE UPDATE ON guest_registration_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE stay_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakfast_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_registration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's profile
CREATE OR REPLACE FUNCTION auth_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's organization_id
CREATE OR REPLACE FUNCTION auth_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ORGANIZATIONS
CREATE POLICY "orgs_select" ON organizations FOR SELECT
  USING (
    auth_role() = 'SUPER_ADMIN' OR id = auth_organization_id()
  );

CREATE POLICY "orgs_insert" ON organizations FOR INSERT
  WITH CHECK (auth_role() = 'SUPER_ADMIN');

CREATE POLICY "orgs_update" ON organizations FOR UPDATE
  USING (auth_role() = 'SUPER_ADMIN' OR (id = auth_organization_id() AND auth_role() = 'ORG_ADMIN'))
  WITH CHECK (auth_role() = 'SUPER_ADMIN' OR (id = auth_organization_id() AND auth_role() = 'ORG_ADMIN'));

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR auth_user_id = auth.uid()
    OR organization_id = auth_organization_id()
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER'))
  );

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR auth_user_id = auth.uid()
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN'))
  );

-- PROPERTIES
CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN'))
  );

CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING (auth_role() = 'SUPER_ADMIN' OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN')));

-- UNITS
CREATE POLICY "units_select" ON units FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "units_insert" ON units FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER'))
  );

CREATE POLICY "units_update" ON units FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION'))
  );

-- GUESTS
CREATE POLICY "guests_select" ON guests FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "guests_insert" ON guests FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

CREATE POLICY "guests_update" ON guests FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

-- STAYS
CREATE POLICY "stays_select" ON stays FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "stays_insert" ON stays FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

CREATE POLICY "stays_update" ON stays FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

-- STAY GUESTS
CREATE POLICY "stay_guests_select" ON stay_guests FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "stay_guests_insert" ON stay_guests FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

CREATE POLICY "stay_guests_delete" ON stay_guests FOR DELETE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION'))
  );

-- BREAKFAST ITEMS
CREATE POLICY "breakfast_items_select" ON breakfast_items FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "breakfast_items_insert" ON breakfast_items FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN'))
  );

CREATE POLICY "breakfast_items_update" ON breakfast_items FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'RECEPTION', 'KITCHEN'))
  );

-- HOUSEKEEPING TASKS
CREATE POLICY "housekeeping_tasks_select" ON housekeeping_tasks FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "housekeeping_tasks_insert" ON housekeeping_tasks FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION'))
  );

CREATE POLICY "housekeeping_tasks_update" ON housekeeping_tasks FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION'))
  );

-- UNIT STATUS LOGS
CREATE POLICY "unit_status_logs_select" ON unit_status_logs FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "unit_status_logs_insert" ON unit_status_logs FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION'))
  );

-- OPERATIONAL NOTES
CREATE POLICY "operational_notes_select" ON operational_notes FOR SELECT
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (
      organization_id = auth_organization_id()
      AND (
        visibility = 'INTERNAL'
        OR (visibility = 'MANAGEMENT_ONLY' AND auth_role() IN ('ORG_ADMIN', 'MANAGER'))
      )
    )
  );

CREATE POLICY "operational_notes_insert" ON operational_notes FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() != 'READ_ONLY')
  );

CREATE POLICY "operational_notes_update" ON operational_notes FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN', 'MANAGER'))
  );

-- GUEST REGISTRATION SETTINGS
CREATE POLICY "registration_settings_select" ON guest_registration_settings FOR SELECT
  USING (auth_role() = 'SUPER_ADMIN' OR organization_id = auth_organization_id());

CREATE POLICY "registration_settings_insert" ON guest_registration_settings FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN'))
  );

CREATE POLICY "registration_settings_update" ON guest_registration_settings FOR UPDATE
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR (organization_id = auth_organization_id() AND auth_role() IN ('ORG_ADMIN'))
  );

-- ACTIVITY LOGS
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (
    auth_role() = 'SUPER_ADMIN'
    OR organization_id = auth_organization_id()
  );

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (
    auth_role() = 'SUPER_ADMIN'
    OR organization_id = auth_organization_id()
  );
