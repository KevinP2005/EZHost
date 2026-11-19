'use client'

import { ArrowLeft, Info, Loader2, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type FormValues = {
  email: string
}

interface ForgotPasswordFormProps {
  defaultEmail?: string
  /** The reset link that brought the user back here was invalid or expired. */
  linkExpired?: boolean
}

export function ForgotPasswordForm({ defaultEmail = '', linkExpired = false }: ForgotPasswordFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<FormValues>({ mode: 'onSubmit', defaultValues: { email: defaultEmail } })

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      // The link lands on /auth/callback, which exchanges the code for a
      // session and forwards to the set-password page.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })

      // Rate limits are the only error worth surfacing. Unknown addresses do
      // not error, so the response never reveals whether an account exists.
      if (error) {
        toast.error(
          error.status === 429
            ? 'Zu viele Anfragen. Bitte warte kurz und versuche es erneut.'
            : 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.'
        )
        setIsLoading(false)
        return
      }

      setSentTo(email)
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte erneut versuchen.')
    }

    setIsLoading(false)
  })

  if (sentTo) {
    return (
      <div className="fade-in">
        <div className="mb-6">
          <MailCheck className="mb-4 h-8 w-8 text-indigo-400" aria-hidden="true" />
          <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-white">
            E-Mail unterwegs
          </h1>
          <p className="text-[14.5px] leading-[1.6] text-zinc-400">
            Falls ein Konto für <span className="text-zinc-200">{sentTo}</span> existiert, haben
            wir dir einen Link zum Festlegen eines neuen Passworts geschickt.
          </p>
        </div>

        <div className="mb-6 flex gap-3 rounded-lg border border-indigo-500/25 bg-indigo-500/10 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
          <p className="text-[12.5px] leading-[1.55] text-zinc-400">
            Öffne den Link in <span className="font-medium text-indigo-400">diesem Browser</span>,
            sonst kann er nicht bestätigt werden. Schau auch im Spam-Ordner nach.
          </p>
        </div>

        <BackToLogin />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-white">
          Passwort vergessen
        </h1>
        <p className="text-[14.5px] text-zinc-400">
          Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort
          festlegst.
        </p>
      </div>

      {linkExpired && (
        <div className="mb-6 rounded-lg border border-red-500/25 bg-red-500/10 p-3.5 text-[12.5px] leading-[1.55] text-red-300">
          Der Link ist ungültig oder abgelaufen. Fordere einfach einen neuen an.
        </div>
      )}

      <form onSubmit={handleSubmit} className="fade-in space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12.5px] font-medium tracking-wide text-zinc-400"
          >
            E-Mail-Adresse
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            className="w-full rounded-md border border-zinc-800 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white outline-none transition-all duration-150 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
            {...form.register('email', {
              required: 'E-Mail-Adresse ist erforderlich',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Bitte gib eine gültige E-Mail-Adresse ein',
              },
            })}
          />
          {form.formState.errors.email && (
            <p className="mt-1.5 text-[12px] text-red-400">{form.formState.errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Senden...
            </>
          ) : (
            'Link senden'
          )}
        </button>

        <BackToLogin />
      </form>
    </div>
  )
}

function BackToLogin() {
  return (
    <Link
      href="/auth/login"
      className="flex w-full items-center justify-center gap-1.5 pt-1 text-center text-[13px] text-zinc-500 transition-colors duration-150 hover:text-zinc-300"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      Zurück zur Anmeldung
    </Link>
  )
}
