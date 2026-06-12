export interface Stay {
  id: string
  guestName: string
  unit: string
  checkIn: string
  checkOut: string
  guests: number
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out'
  nights: number
}

export interface Task {
  id: string
  type: 'registration' | 'cleaning' | 'breakfast' | 'missing-details' | 'maintenance'
  label: string
  unit: string
  priority: 'high' | 'medium' | 'low'
  dueTime?: string
}

export interface Unit {
  id: string
  name: string
  type: string
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
  currentGuest?: string
  checkOut?: string
}

export interface ActivityItem {
  id: string
  type: 'booking' | 'checkin' | 'checkout' | 'housekeeping' | 'guest-update' | 'task'
  message: string
  detail: string
  time: string
}
