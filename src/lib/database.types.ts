export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrgStatus = 'ACTIVE' | 'INACTIVE' | 'TRIAL'
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'RECEPTION' | 'HOUSEKEEPING' | 'KITCHEN' | 'READ_ONLY'
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED'
export type PropertyType = 'HOTEL' | 'GUESTHOUSE' | 'CHALET' | 'APARTMENT_HOUSE' | 'VACATION_RENTAL' | 'OTHER'
export type UnitType = 'ROOM' | 'APARTMENT' | 'CHALET' | 'HOUSE' | 'DORM' | 'OTHER'
export type UnitStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type HousekeepingStatus = 'CLEAN' | 'DIRTY' | 'INSPECTED' | 'OUT_OF_SERVICE'
export type StaySource = 'MANUAL' | 'IMPORT' | 'PMS' | 'OTA' | 'OTHER'
export type StayStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
export type BookingStatus = 'OFFER' | 'CONFIRMED'
export type RegistrationStatus = 'MISSING' | 'PARTIAL' | 'COMPLETE' | 'NOT_REQUIRED'
export type BreakfastStatus = 'PLANNED' | 'PREPARED' | 'SERVED' | 'CANCELLED'
export type TaskType = 'CLEANING' | 'INSPECTION' | 'MAINTENANCE' | 'LAUNDRY' | 'OTHER'
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH'
export type Department = 'RECEPTION' | 'HOUSEKEEPING' | 'KITCHEN' | 'MANAGEMENT' | 'GENERAL'
export type NoteVisibility = 'INTERNAL' | 'MANAGEMENT_ONLY'
export type EmailType =
  | 'BOOKING_CONFIRMATION'
  | 'OFFER'
  | 'ONLINE_CHECK_IN'
  | 'PRE_ARRIVAL'
  | 'AFTER_CHECK_IN'
  | 'AFTER_CHECK_OUT'
  | 'CANCELLATION'
  | 'MANUAL'
export type EmailDeliveryStatus = 'SENT' | 'FAILED'

export interface Organization {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  country: string | null
  status: OrgStatus
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  auth_user_id: string
  organization_id: string | null
  name: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  organization_id: string
  name: string
  type: PropertyType
  address: string | null
  city: string | null
  country: string | null
  timezone: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProfilePropertyAccess {
  id: string
  profile_id: string
  property_id: string
  created_by_profile_id: string | null
  created_at: string
}

export interface UnitCategory {
  id: string
  organization_id: string
  property_id: string
  name: string
  code: string | null
  unit_type: UnitType
  capacity_adults: number
  capacity_children: number
  description: string | null
  /** NULL = no administrative cap beyond physical inventory. */
  bookable_units_limit: number | null
  /** Regular price per unit and night (excl. local tax). NULL = not set. */
  base_rate: number | null
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  organization_id: string
  property_id: string
  unit_category_id: string
  name: string
  floor: string | null
  status: UnitStatus
  housekeeping_status: HousekeepingStatus
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  nationality: string | null
  address: string | null
  document_type: string | null
  document_number: string | null
  company: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  organization_id: string
  property_id: string
  reservation_number: string
  booker_id: string
  primary_guest_id: string
  external_reference: string | null
  source: StaySource
  booking_status: BookingStatus
  total_amount: number | null
  currency: string
  confirmation_preference: string | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface Stay {
  id: string
  organization_id: string
  property_id: string
  unit_id: string
  reservation_id: string
  stay_number: string
  check_in_date: string
  check_out_date: string
  arrival_time: string | null
  departure_time: string | null
  adults: number
  children: number
  status: StayStatus
  breakfast_included: boolean
  breakfast_count_adults: number
  breakfast_count_children: number
  local_tax_applicable: boolean
  local_tax_amount: number | null
  room_label: string | null
  rate_code: string | null
  rate_label: string | null
  nightly_rate: number | null
  subtotal_amount: number | null
  extras_amount: number | null
  price_details: Json
  extras_details: Json
  registration_status: RegistrationStatus
  /** Operative notes for this specific stay. General/commercial notes for the whole booking live on Reservation. */
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StayGuest {
  id: string
  organization_id: string
  stay_id: string
  guest_id: string
  is_primary_guest: boolean
  created_at: string
}

export interface BreakfastItem {
  id: string
  organization_id: string
  property_id: string
  stay_id: string | null
  unit_id: string | null
  date: string
  adults_count: number
  children_count: number
  breakfast_type: string | null
  allergies: string | null
  special_requests: string | null
  notes: string | null
  status: BreakfastStatus
  created_at: string
  updated_at: string
}

export interface HousekeepingTask {
  id: string
  organization_id: string
  property_id: string
  unit_id: string
  stay_id: string | null
  assigned_to_profile_id: string | null
  task_type: TaskType
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
}

export interface UnitStatusLog {
  id: string
  organization_id: string
  property_id: string
  unit_id: string
  changed_by_profile_id: string | null
  previous_status: HousekeepingStatus | null
  new_status: HousekeepingStatus
  note: string | null
  created_at: string
}

export interface OperationalNote {
  id: string
  organization_id: string
  property_id: string | null
  unit_id: string | null
  stay_id: string | null
  guest_id: string | null
  created_by_profile_id: string | null
  department: Department
  note: string
  visibility: NoteVisibility
  created_at: string
  updated_at: string
}

export interface GuestRegistrationSettings {
  id: string
  organization_id: string
  property_id: string | null
  country: string
  region: string | null
  city: string | null
  enabled: boolean
  required_fields: Json
  local_tax_enabled: boolean
  local_tax_rules: Json
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  organization_id: string | null
  property_id: string | null
  profile_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Json | null
  created_at: string
}

export interface EmailDelivery {
  id: string
  organization_id: string
  reservation_id: string
  recipient: string
  email_type: EmailType
  resend_email_id: string | null
  status: EmailDeliveryStatus
  sent_at: string | null
  error_message: string | null
  created_at: string
}
