'use client'

import { ArrowLeft, Eye, EyeOff, Info, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm, type UseFormRegister } from 'react-hook-form'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type EmailFormValues = {
  email: string
}

type PasswordFormValues = {
  password: string
}

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const emailForm = useForm<EmailFormValues>({ mode: 'onSubmit' })
  const passwordForm = useForm<PasswordFormValues>({ mode: 'onSubmit' })

  const handleEmailSubmit = emailForm.handleSubmit(async (data) => {
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 700))

    setSubmittedEmail(data.email)
    setStep('password')
    setIsLoading(false)
  })

  const handlePasswordSubmit = passwordForm.handleSubmit(async (data) => {
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: submittedEmail,
        password: data.password,
      })

      if (error) {
        toast.error('Ungültige E-Mail-Adresse oder Passwort.')
        setIsLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Ein Fehler ist aufgetreten. Bitte erneut versuchen.')
      setIsLoading(false)
    }
  })

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="mb-1.5 text-[26px] font-semibold tracking-tight text-white">
          Willkommen
        </h1>
        <p className="text-[14.5px] text-zinc-400">
          {step === 'email'
            ? 'Melde dich bei deinem EZHost Konto an.'
            : `Weiter als ${submittedEmail}`}
        </p>
      </div>

      <div className="mb-6 flex gap-3 rounded-lg border border-indigo-500/25 bg-indigo-500/10 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
        <p className="text-[12.5px] leading-[1.55] text-zinc-400">
          Stelle sicher, dass du dich auf{' '}
          <span className="font-medium text-indigo-400">app.ezhost.at</span>{' '}
          befindest, bevor du deine Zugangsdaten eingibst.
        </p>
      </div>

      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="fade-in space-y-4">
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
              {...emailForm.register('email', {
                required: 'E-Mail-Adresse ist erforderlich',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Bitte gib eine gültige E-Mail-Adresse ein',
                },
              })}
            />
            {emailForm.formState.errors.email && (
              <p className="mt-1.5 text-[12px] text-red-400">
                {emailForm.formState.errors.email.message}
              </p>
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
                Prüfen...
              </>
            ) : (
              'Weiter'
            )}
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="fade-in space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[12.5px] font-medium tracking-wide text-zinc-400"
            >
              Passwort
            </label>
            <PasswordInput
              id="password"
              register={passwordForm.register}
              error={passwordForm.formState.errors.password?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep('email')}
            className="flex w-full items-center justify-center gap-1.5 pt-1 text-center text-[13px] text-zinc-500 transition-colors duration-150 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Zurück zur E-Mail
          </button>
        </form>
      )}
    </div>
  )
}

function PasswordInput({
  id,
  register,
  error,
}: {
  id: string
  register: UseFormRegister<PasswordFormValues>
  error?: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-md border border-zinc-800 bg-white/[0.04] px-3.5 py-2.5 pr-10 text-[14px] text-white outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
          {...register('password', {
            required: 'Passwort ist erforderlich',
            minLength: {
              value: 6,
              message: 'Das Passwort muss mindestens 6 Zeichen lang sein',
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

      {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
    </>
  )
}
