'use client'

import {
  BedDouble,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ClipboardList,
  Coffee,
  FileCheck,
  Home,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import type { Profile } from '@/lib/database.types'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stays', label: 'Stays', icon: BedDouble, badge: 3 },
  { href: '/dashboard/guests', label: 'Guests', icon: Users },
  { href: '/dashboard/units', label: 'Units', icon: Home },
  { href: '/dashboard/housekeeping', label: 'Housekeeping', icon: Sparkles, badge: 2 },
  { href: '/dashboard/breakfast', label: 'Breakfast', icon: Coffee },
  { href: '/dashboard/registration', label: 'Registration', icon: FileCheck },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare, badge: 4 },
  { href: '/dashboard/daily', label: 'Daily', icon: CalendarDays },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
]

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Platform', icon: Shield },
  { href: '/admin/organizations', label: 'Organizations', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/activity', label: 'Activity', icon: CalendarDays },
]

interface SidebarProps {
  profile: Profile
}

function isItemActive(pathname: string, href: string) {
  if (href === '/dashboard' || href === '/admin') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
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

function formatRole(role: string) {
  return role
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState(true)
  const isSuperAdmin = profile.role === 'SUPER_ADMIN'
  const selectedPropertyId = searchParams.get('property')

  const visibleNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(profile.role),
  )

  const renderNavItem = (item: NavItem) => {
    const NavIcon = item.icon
    const active = isItemActive(pathname, item.href)
    const href = selectedPropertyId
      ? `${item.href}?property=${encodeURIComponent(selectedPropertyId)}`
      : item.href

    return (
      <Link
        key={item.href}
        href={href}
        className={cn(
          'group relative flex h-10 items-center rounded-md text-[13px] font-medium transition-[color,background-color,transform] active:scale-95',
          collapsed ? 'w-10 justify-center' : 'w-full gap-2.5 px-2.5',
          active
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <NavIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />

        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}

        {!collapsed && item.badge ? (
          <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {item.badge}
          </span>
        ) : null}

        {collapsed && item.badge ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        ) : null}

        {collapsed && (
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
            {item.label}
            {item.badge ? ` (${item.badge})` : ''}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-[#111111] sidebar-transition',
        collapsed ? 'w-16 items-center overflow-visible' : 'w-56 overflow-hidden',
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          'flex h-14 w-full shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center' : 'gap-2.5 px-4',
        )}
        aria-label="EZHost dashboard"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[12px] font-black tracking-tight text-white">
          EZ
        </div>
        {!collapsed && (
          <span className="truncate text-[15px] font-bold tracking-tight text-foreground">
            EZHost
          </span>
        )}
      </Link>

      <nav
        className={cn(
          'no-scrollbar flex flex-1 flex-col gap-1 py-4',
          collapsed ? 'items-center overflow-visible px-2' : 'overflow-y-auto px-3',
        )}
      >
        {visibleNav.slice(0, 8).map(renderNavItem)}

        <div className={cn('my-3 h-px bg-border', collapsed ? 'w-8' : 'w-full')} />

        {visibleNav.slice(8).map(renderNavItem)}

        {isSuperAdmin && (
          <>
            <div className={cn('my-3 h-px bg-border', collapsed ? 'w-8' : 'w-full')} />
            {adminItems.map(renderNavItem)}
          </>
        )}
      </nav>

      <div className={cn('w-full shrink-0 border-t border-border p-2', collapsed && 'flex flex-col items-center')}>
        {!collapsed && (
          <div className="mb-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
              <span className="text-[11px] font-bold text-white">
                {getInitials(profile.name, profile.email)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-foreground">
                {profile.name || profile.email}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {formatRole(profile.role)}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={cn(
            'group relative flex h-10 items-center rounded-md text-muted-foreground transition-[color,background-color,transform] hover:bg-muted hover:text-foreground active:scale-95',
            collapsed ? 'w-10 justify-center' : 'w-full gap-2 px-2',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')}
            aria-hidden="true"
          />
          {!collapsed && <span className="text-[12.5px]">Collapse</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md border border-border bg-popover px-3 py-2 text-[12px] font-semibold text-popover-foreground opacity-0 shadow-xl transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-[1500ms]">
              Expand sidebar
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
