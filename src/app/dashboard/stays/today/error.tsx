'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function TodayStaysError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-12 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
      <h1 className="mt-4 text-base font-semibold text-foreground">Today&apos;s stays could not be loaded.</h1>
      <p className="mt-1 text-sm text-muted-foreground">Please try again. Your bookings have not been changed.</p>
      <Button type="button" variant="outline" className="mt-5" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </div>
  )
}
