import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Passwort vergessen',
}

interface ForgotPasswordPageProps {
  searchParams: Promise<{ email?: string; error?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams

  return (
    <AuthShell>
      <ForgotPasswordForm defaultEmail={params.email ?? ''} linkExpired={params.error === 'link'} />
    </AuthShell>
  )
}
