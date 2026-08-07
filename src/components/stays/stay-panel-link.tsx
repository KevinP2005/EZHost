'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface StayPanelLinkProps {
  stayId: string
  className?: string
  children: React.ReactNode
}

export function StayPanelLink({ stayId, className, children }: StayPanelLinkProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())
  params.set('stay', stayId)

  return (
    <Link href={`${pathname}?${params.toString()}`} scroll={false} className={className}>
      {children}
    </Link>
  )
}
