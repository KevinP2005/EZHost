import { requireRole } from '@/lib/auth'
import { CreateGuestForm } from '@/components/guests/create-guest-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Guest' }

export default async function NewGuestPage() {
  await requireRole(['SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'RECEPTION'])
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">New Guest</h1>
      <CreateGuestForm />
    </div>
  )
}
