'use client'

import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type FormValues = {
  password: string
  confirm: string
}

const MIN_LENGTH = 8

export function UpdatePasswordForm() {
  const router = useRouter()
  // null while checking; the page is only usable with the session the reset
  // link established in /auth/callback.
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<FormValues>({ mode: 'onSubmit' })

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    setIsLoading(true)

    try {
      const { error } = await createClient().auth.updateUser({ password })

      if (error) {
        toast.error(
          error.code === 'same_password'
            ? 'Das neue Passwort muss sich vom bisherigen unterscheiden.'
            : error.code === 'weak_password'
              ? 'Das Passwort ist zu schwach. Bitte wähle ein längeres.'
              : 'Das Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.'
        )
        setIsLoading(false)
        return
      }

      toast.success('Passwort gespeichert.')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte erneut versuchen.')
      setIsLoading(false)
    }
  })

  if (email === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" aria-hidden="true" />
      </div>
    )
  }

  if (email === null) {
    return (
      <div className="fade-in">
        <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-white">
          Link abgelaufen
        </h1>
        <p className="mb-6 text-[14.5px] leading-[1.6] text-zinc-400">
          Um ein neues Passwort festzulegen, brauchst du einen gültigen Link aus der E-Mail.
        </p>
        <Link
          href="/auth/forgot-password"
          className="flex min-h-[42px] w-full items-center justify-center rounded-md bg-primary py-2.5 text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90"
        >
          Neuen Link anfordern
        </Link>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-white/[0.04] px-3.5 py-2.5 pr-10 text-[14px] text-white outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-white">
          Neues Passwort
        </h1>
        <p className="text-[14.5px] text-zinc-400">
          Lege ein Passwort für <span className="text-zinc-200">{email}</span> fest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lets password managers associate the new password with the account. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[12.5px] font-medium tracking-wide text-zinc-400"
          >
            Neues Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              className={inputClass}
              {...form.register('password', {
                required: 'Passwort ist erforderlich',
                minLength: {
                  value: MIN_LENGTH,
                  message: `Das Passwort muss mindestens ${MIN_LENGTH} Zeichen lang sein`,
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="mt-1.5 text-[12px] text-red-400">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="mb-1.5 block text-[12.5px] font-medium tracking-wide text-zinc-400"
          >
            Passwort wiederholen
          </label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={inputClass}
            {...form.register('confirm', {
              required: 'Bitte wiederhole das Passwort',
              validate: (value, values) => value === values.password || 'Die Passwörter stimmen nicht überein',
            })}
          />
          {form.formState.errors.confirm && (
            <p className="mt-1.5 text-[12px] text-red-400">{form.formState.errors.confirm.message}</p>
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
              Speichern...
            </>
          ) : (
            'Passwort speichern'
          )}
        </button>
      </form>
    </div>
  )
}
