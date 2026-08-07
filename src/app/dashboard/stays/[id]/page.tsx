import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stay Details' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function StayDetailPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/stays?stay=${encodeURIComponent(id)}`)
}
