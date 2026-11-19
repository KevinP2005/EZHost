import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export const metadata: Metadata = {
  title: 'Neues Passwort',
}

export default function UpdatePasswordPage() {
  return (
    <AuthShell>
      <UpdatePasswordForm />
    </AuthShell>
  )
}
