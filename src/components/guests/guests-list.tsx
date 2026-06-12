'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  guests: any[]
  search?: string
  canEdit: boolean
}

export function GuestsList({ guests, search, canEdit }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(search ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/dashboard/guests?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guests</h1>
        {canEdit && (
          <Link href="/dashboard/guests/new">
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Guest</Button>
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {search && <Button type="button" variant="ghost" size="sm" onClick={() => { setQ(''); router.push('/dashboard/guests') }}>Clear</Button>}
      </form>

      {guests.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">{search ? 'No guests found for this search.' : 'No guests yet.'}</p>
          {canEdit && !search && (
            <Link href="/dashboard/guests/new"><Button variant="outline" size="sm" className="mt-4">Add first guest</Button></Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nationality</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Document</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => router.push(`/dashboard/guests/${guest.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{guest.first_name} {guest.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{guest.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{guest.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{guest.nationality ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {guest.document_type ? `${guest.document_type}` : <span className="text-muted-foreground/50">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
