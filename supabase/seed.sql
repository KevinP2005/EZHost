-- ============================================================
-- EZHost – Development Seed Data
-- ============================================================
-- Run AFTER creating the auth users in Supabase Auth manually,
-- then update the UUIDs below to match.
--
-- For a quick start: create 3 test users in Supabase Auth dashboard,
-- then replace the placeholder UUIDs below with real auth user IDs.
-- ============================================================

-- NOTE: Replace these placeholder UUIDs with real Supabase Auth user IDs
-- before running this seed.

DO $$
DECLARE
  -- Auth user IDs (replace with real Supabase Auth user UUIDs)
  v_super_admin_auth_id UUID := 'f672a4ce-d29d-41f5-b41b-eaed6a9fce07';
  v_org_admin_auth_id   UUID := '73553374-ab4f-4839-9fe0-4b4a47cbd629';
  v_reception_auth_id   UUID := '40d18d03-e5a3-44e8-962c-88d279184b64';

  v_org_id              UUID := gen_random_uuid();
  v_prop1_id            UUID := gen_random_uuid();
  v_prop2_id            UUID := gen_random_uuid();

  -- Units for property 1 (Hotel Alpenhof)
  v_room_101  UUID := gen_random_uuid();
  v_room_102  UUID := gen_random_uuid();
  v_room_103  UUID := gen_random_uuid();
  v_room_201  UUID := gen_random_uuid();
  v_room_202  UUID := gen_random_uuid();
  v_suite_1   UUID := gen_random_uuid();

  -- Units for property 2 (Bergchalet)
  v_apt_a     UUID := gen_random_uuid();
  v_apt_b     UUID := gen_random_uuid();
  v_apt_c     UUID := gen_random_uuid();
  v_chalet_1  UUID := gen_random_uuid();

  -- Profiles
  v_super_admin_id UUID := gen_random_uuid();
  v_org_admin_id   UUID := gen_random_uuid();
  v_reception_id   UUID := gen_random_uuid();

  -- Guests
  v_guest_1 UUID := gen_random_uuid();
  v_guest_2 UUID := gen_random_uuid();
  v_guest_3 UUID := gen_random_uuid();
  v_guest_4 UUID := gen_random_uuid();
  v_guest_5 UUID := gen_random_uuid();
  v_guest_6 UUID := gen_random_uuid();
  v_guest_7 UUID := gen_random_uuid();

  today_date DATE := CURRENT_DATE;

BEGIN

  -- ============================================================
  -- ORGANIZATION
  -- ============================================================
  INSERT INTO organizations (id, name, email, phone, address, country, status) VALUES
  (v_org_id, 'Alpengasthof Berger GmbH', 'info@alpengasthof-berger.at', '+43 5574 123456',
   'Hauptstraße 12, 6800 Feldkirch', 'AT', 'ACTIVE');

  -- ============================================================
  -- PROFILES
  -- ============================================================
  INSERT INTO profiles (id, auth_user_id, organization_id, name, email, role, status) VALUES
  (v_super_admin_id, v_super_admin_auth_id, NULL,              'Platform Admin', 'admin@ezhost.app',          'SUPER_ADMIN', 'ACTIVE'),
  (v_org_admin_id,   v_org_admin_auth_id,   v_org_id,          'Maria Berger',   'maria@alpengasthof.at',     'ORG_ADMIN',   'ACTIVE'),
  (v_reception_id,   v_reception_auth_id,   v_org_id,          'Thomas Huber',   'thomas@alpengasthof.at',    'RECEPTION',   'ACTIVE');

  -- ============================================================
  -- PROPERTIES
  -- ============================================================
  INSERT INTO properties (id, organization_id, name, type, address, city, country, timezone, active) VALUES
  (v_prop1_id, v_org_id, 'Hotel Alpenhof', 'HOTEL',        'Hauptstraße 12', 'Feldkirch', 'AT', 'Europe/Vienna', TRUE),
  (v_prop2_id, v_org_id, 'Bergchalet Lüns', 'CHALET',      'Alpenweg 3',     'Lüns',      'AT', 'Europe/Vienna', TRUE);

  -- ============================================================
  -- UNITS – Hotel Alpenhof
  -- ============================================================
  INSERT INTO units (id, organization_id, property_id, name, unit_type, capacity_adults, capacity_children, floor, status, housekeeping_status) VALUES
  (v_room_101, v_org_id, v_prop1_id, 'Room 101', 'ROOM', 2, 0, '1', 'ACTIVE', 'DIRTY'),
  (v_room_102, v_org_id, v_prop1_id, 'Room 102', 'ROOM', 2, 1, '1', 'ACTIVE', 'CLEAN'),
  (v_room_103, v_org_id, v_prop1_id, 'Room 103', 'ROOM', 2, 0, '1', 'ACTIVE', 'DIRTY'),
  (v_room_201, v_org_id, v_prop1_id, 'Room 201', 'ROOM', 2, 0, '2', 'ACTIVE', 'CLEAN'),
  (v_room_202, v_org_id, v_prop1_id, 'Room 202', 'ROOM', 3, 1, '2', 'ACTIVE', 'INSPECTED'),
  (v_suite_1,  v_org_id, v_prop1_id, 'Suite 301', 'ROOM', 2, 0, '3', 'ACTIVE', 'CLEAN');

  -- ============================================================
  -- UNITS – Bergchalet
  -- ============================================================
  INSERT INTO units (id, organization_id, property_id, name, unit_type, capacity_adults, capacity_children, status, housekeeping_status) VALUES
  (v_apt_a,   v_org_id, v_prop2_id, 'Apartment A', 'APARTMENT', 2, 2, 'ACTIVE', 'DIRTY'),
  (v_apt_b,   v_org_id, v_prop2_id, 'Apartment B', 'APARTMENT', 4, 2, 'ACTIVE', 'CLEAN'),
  (v_apt_c,   v_org_id, v_prop2_id, 'Apartment C', 'APARTMENT', 2, 0, 'ACTIVE', 'INSPECTED'),
  (v_chalet_1, v_org_id, v_prop2_id, 'Chalet Almrausch', 'CHALET', 6, 4, 'ACTIVE', 'CLEAN');

  -- ============================================================
  -- GUESTS
  -- ============================================================
  INSERT INTO guests (id, organization_id, first_name, last_name, email, phone, nationality, date_of_birth, document_type, document_number) VALUES
  (v_guest_1, v_org_id, 'Anna',     'Müller',    'anna.mueller@example.com',    '+49 151 11111111', 'DE', '1985-04-12', 'Passport', 'DE123456789'),
  (v_guest_2, v_org_id, 'Stefan',   'Koch',      'stefan.koch@example.com',     '+43 699 22222222', 'AT', '1978-09-23', 'ID Card',  'AT987654321'),
  (v_guest_3, v_org_id, 'Brigitte', 'Hoffmann',  'brigitte.h@example.com',      '+41 79 333333333', 'CH', '1990-02-15', 'Passport', 'CH111222333'),
  (v_guest_4, v_org_id, 'Marc',     'Dupont',    'marc.dupont@example.com',     '+33 6 44444444',   'FR', '1982-07-08', NULL,       NULL),
  (v_guest_5, v_org_id, 'Emma',     'Fischer',   'emma.fischer@example.com',    '+49 160 55555555', 'DE', '1995-11-30', 'Passport', 'DE555666777'),
  (v_guest_6, v_org_id, 'Klaus',    'Bauer',     NULL,                          '+43 650 66666666', 'AT', NULL,         NULL,       NULL),
  (v_guest_7, v_org_id, 'Sophie',   'Wagner',    'sophie.wagner@example.com',   '+49 170 77777777', 'DE', '1988-03-20', 'ID Card',  'DE888999000');

  -- ============================================================
  -- STAYS
  -- ============================================================

  -- Arriving today
  INSERT INTO stays (id, organization_id, property_id, unit_id, primary_guest_id, source, check_in_date, check_out_date, arrival_time, adults, children, status, breakfast_included, breakfast_count_adults, breakfast_count_children, local_tax_applicable, registration_status, notes) VALUES
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_101, v_guest_1, 'MANUAL', today_date, today_date + 4, '15:00', 2, 0, 'BOOKED',     TRUE,  2, 0, TRUE, 'PARTIAL',  'Allergic to nuts'),
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_103, v_guest_4, 'MANUAL', today_date, today_date + 2, '14:00', 2, 1, 'BOOKED',     FALSE, 0, 0, TRUE, 'MISSING',  NULL),
  (gen_random_uuid(), v_org_id, v_prop2_id, v_apt_a,    v_guest_6, 'MANUAL', today_date, today_date + 7, NULL,    2, 2, 'BOOKED',     TRUE,  2, 2, TRUE, 'MISSING',  'Family with young children');

  -- Currently checked in (in-house)
  INSERT INTO stays (id, organization_id, property_id, unit_id, primary_guest_id, source, check_in_date, check_out_date, departure_time, adults, children, status, breakfast_included, breakfast_count_adults, breakfast_count_children, local_tax_applicable, local_tax_amount, registration_status, notes) VALUES
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_102, v_guest_2, 'MANUAL', today_date - 2, today_date + 1, '10:00', 2, 0, 'CHECKED_IN', TRUE,  2, 0, TRUE,  12.00, 'COMPLETE', NULL),
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_201, v_guest_3, 'MANUAL', today_date - 1, today_date + 3, '11:00', 2, 0, 'CHECKED_IN', TRUE,  2, 0, TRUE,  8.00,  'COMPLETE', 'Vegetarian breakfast'),
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_202, v_guest_5, 'MANUAL', today_date - 3, today_date + 2, '12:00', 2, 2, 'CHECKED_IN', TRUE,  2, 2, TRUE,  20.00, 'PARTIAL',  NULL),
  (gen_random_uuid(), v_org_id, v_prop2_id, v_apt_b,    v_guest_7, 'MANUAL', today_date - 1, today_date + 5, NULL,    4, 0, 'CHECKED_IN', FALSE, 0, 0, TRUE,  32.00, 'COMPLETE', NULL);

  -- Departing today
  INSERT INTO stays (id, organization_id, property_id, unit_id, primary_guest_id, source, check_in_date, check_out_date, departure_time, adults, status, breakfast_included, breakfast_count_adults, local_tax_applicable, local_tax_amount, registration_status) VALUES
  (gen_random_uuid(), v_org_id, v_prop1_id, v_suite_1,  v_guest_2, 'MANUAL', today_date - 5, today_date,    '11:00', 2, 'CHECKED_IN', TRUE,  2, TRUE, 20.00, 'COMPLETE');

  -- Future bookings
  INSERT INTO stays (id, organization_id, property_id, unit_id, primary_guest_id, source, check_in_date, check_out_date, adults, status, breakfast_included, breakfast_count_adults, local_tax_applicable, registration_status) VALUES
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_101, v_guest_3, 'MANUAL', today_date + 6,  today_date + 9,  2, 'BOOKED', TRUE,  2, TRUE, 'MISSING'),
  (gen_random_uuid(), v_org_id, v_prop2_id, v_chalet_1, v_guest_1, 'MANUAL', today_date + 10, today_date + 17, 4, 'BOOKED', TRUE,  4, TRUE, 'MISSING');

  -- Past checked-out stay
  INSERT INTO stays (id, organization_id, property_id, unit_id, primary_guest_id, source, check_in_date, check_out_date, adults, status, breakfast_included, breakfast_count_adults, local_tax_applicable, local_tax_amount, registration_status) VALUES
  (gen_random_uuid(), v_org_id, v_prop1_id, v_room_103, v_guest_4, 'MANUAL', today_date - 7, today_date - 3, 2, 'CHECKED_OUT', TRUE, 2, TRUE, 14.00, 'COMPLETE');

  -- ============================================================
  -- BREAKFAST ITEMS (today)
  -- ============================================================
  INSERT INTO breakfast_items (organization_id, property_id, unit_id, date, adults_count, children_count, allergies, special_requests, status) VALUES
  (v_org_id, v_prop1_id, v_room_102, today_date, 2, 0, NULL,    NULL,            'PLANNED'),
  (v_org_id, v_prop1_id, v_room_201, today_date, 2, 0, NULL,    'Vegetarian',    'PLANNED'),
  (v_org_id, v_prop1_id, v_room_202, today_date, 2, 2, NULL,    'Extra children portion', 'PLANNED'),
  (v_org_id, v_prop1_id, v_suite_1,  today_date, 2, 0, NULL,    NULL,            'PLANNED'),
  (v_org_id, v_prop1_id, v_room_101, today_date, 2, 0, 'Nut allergy', NULL,     'PLANNED'),
  (v_org_id, v_prop2_id, v_apt_b,    today_date, 4, 0, NULL,    NULL,            'PLANNED');

  -- ============================================================
  -- HOUSEKEEPING TASKS
  -- ============================================================
  INSERT INTO housekeeping_tasks (organization_id, property_id, unit_id, task_type, title, description, due_date, status, priority) VALUES
  (v_org_id, v_prop1_id, v_room_101, 'CLEANING',     'Clean Room 101 for arrival',   'Deep clean, change all linen',      today_date, 'OPEN',        'HIGH'),
  (v_org_id, v_prop1_id, v_room_103, 'CLEANING',     'Clean Room 103 for arrival',   'Thorough clean after checkout',     today_date, 'OPEN',        'HIGH'),
  (v_org_id, v_prop1_id, v_suite_1,  'CLEANING',     'Clean Suite 301 after checkout','Change bedding, deep clean',       today_date, 'IN_PROGRESS', 'NORMAL'),
  (v_org_id, v_prop2_id, v_apt_a,    'CLEANING',     'Clean Apartment A for arrival', 'Prepare for family with children', today_date, 'OPEN',        'HIGH'),
  (v_org_id, v_prop1_id, v_room_202, 'INSPECTION',   'Inspect Room 202',              NULL,                               today_date, 'OPEN',        'NORMAL'),
  (v_org_id, v_prop1_id, v_room_102, 'MAINTENANCE',  'Fix heater noise in Room 102',  'Guest reported during check-in',   today_date, 'OPEN',        'HIGH'),
  (v_org_id, v_prop2_id, v_chalet_1, 'LAUNDRY',      'Chalet laundry preparation',    'Prepare for next week arrival',    today_date + 9, 'OPEN',    'LOW');

  -- ============================================================
  -- OPERATIONAL NOTES
  -- ============================================================
  INSERT INTO operational_notes (organization_id, property_id, created_by_profile_id, department, note, visibility) VALUES
  (v_org_id, v_prop1_id, v_reception_id, 'RECEPTION',     'VIP guest arriving at 15:00 – prepare welcome gift and flowers.', 'INTERNAL'),
  (v_org_id, v_prop1_id, v_org_admin_id, 'MANAGEMENT',    'Weekly staff meeting on Friday at 09:00 in the office.', 'MANAGEMENT_ONLY'),
  (v_org_id, v_prop1_id, v_reception_id, 'HOUSEKEEPING',  'Extra towels needed for Room 202 – family with children.', 'INTERNAL'),
  (v_org_id, v_prop2_id, v_org_admin_id, 'KITCHEN',       'Vegetarian breakfast for Room 201 – please prepare yogurt plate.', 'INTERNAL'),
  (v_org_id, v_prop1_id, v_reception_id, 'GENERAL',       'Parking space #3 reserved for the arriving couple in Room 101.', 'INTERNAL');

  -- ============================================================
  -- ACTIVITY LOGS
  -- ============================================================
  INSERT INTO activity_logs (organization_id, profile_id, action, entity_type, entity_id) VALUES
  (v_org_id, v_org_admin_id, 'stay_created',          'stay',              NULL),
  (v_org_id, v_reception_id, 'stay_checked_in',       'stay',              NULL),
  (v_org_id, v_reception_id, 'registration_status_updated', 'stay',        NULL),
  (v_org_id, v_org_admin_id, 'breakfast_list_generated', 'breakfast',      NULL),
  (v_org_id, v_reception_id, 'housekeeping_task_created', 'housekeeping_task', NULL);

END $$;
