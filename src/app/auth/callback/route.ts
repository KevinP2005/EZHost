import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Only same-origin paths, so the link can't be abused as an open redirect. */
function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/dashboard'
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    // An expired or already-used reset link should lead back to a fresh
    // request instead of silently ending up on the login screen.
    if (error && next === '/auth/update-password') {
      return NextResponse.redirect(`${origin}/auth/forgot-password?error=link`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
