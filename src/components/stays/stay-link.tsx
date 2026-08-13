import Link from 'next/link'

interface StayLinkProps {
  stayId: string
  className?: string
  children: React.ReactNode
}

/** Links to the full booking page for a stay. */
export function StayLink({ stayId, className, children }: StayLinkProps) {
  return (
    <Link href={`/dashboard/stays/${stayId}`} className={className}>
      {children}
    </Link>
  )
}
