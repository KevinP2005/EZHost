'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Building2,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  LogOut,
  Search,
} from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { Profile } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/client'

interface PropertyOption {
  id: string
  name: string
}

interface TopBarProps {
  profile: Profile
  properties: PropertyOption[]
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || 'Owner'

  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function TopBar({ profile, properties }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accommodationRef = useRef<HTMLDivElement>(null)
  const [accommodationOpen, setAccommodationOpen] = useState(false)
  const selectedPropertyId = searchParams.get('property') ?? 'all'
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId)
  const selectedPropertyLabel = selectedProperty?.name ?? 'All accommodations'

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        accommodationRef.current &&
        !accommodationRef.current.contains(event.target as Node)
      ) {
        setAccommodationOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccommodationOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function handlePropertyChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('property')
    } else {
      params.set('property', value)
    }

    const query = params.toString()
    setAccommodationOpen(false)
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[#111111] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <label className="relative hidden w-full max-w-[360px] sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search guests, units, bookings..."
            className="h-9 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
          />
        </label>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <button
          type="button"
          className="group relative hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-[color,background-color,transform] hover:text-foreground active:scale-95 md:flex"
          aria-label="Create booking"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
            Neue Buchung
          </span>
        </button>
        <button
          type="button"
          className="group relative hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-[color,background-color,transform] hover:text-foreground active:scale-95 md:flex"
          aria-label="Open calendar"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
            Zeitleiste
          </span>
        </button>

        <div ref={accommodationRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAccommodationOpen((open) => !open)}
            className="flex h-9 w-11 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-[210px] sm:justify-start"
            aria-label="Select accommodation"
            aria-expanded={accommodationOpen}
            aria-haspopup="menu"
          >
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
              {selectedPropertyLabel}
            </span>
            <ChevronDown
              className={`hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:block ${
                accommodationOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {accommodationOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-[260px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl"
              role="menu"
            >
              <button
                type="button"
                onClick={() => handlePropertyChange('all')}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                role="menuitemradio"
                aria-checked={selectedPropertyId === 'all'}
              >
                <span className="min-w-0 flex-1 truncate">All accommodations</span>
                {selectedPropertyId === 'all' && (
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>

              {properties.length > 0 ? (
                properties.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => handlePropertyChange(property.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    role="menuitemradio"
                    aria-checked={selectedPropertyId === property.id}
                  >
                    <span className="min-w-0 flex-1 truncate">{property.name}</span>
                    {selectedPropertyId === property.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No accommodations yet
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
            Benachrichtigungen
          </span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="group relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-95 sm:flex"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
            Logout
          </span>
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
          {getInitials(profile.name, profile.email)}
        </div>
      </div>
    </header>
  )
}
