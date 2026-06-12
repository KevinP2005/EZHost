import type { Metadata } from 'next'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/auth/language-switch'
import { LoginForm } from '@/components/auth/login-form'
import { PromoPanel } from '@/components/auth/promo-panel'

export const metadata: Metadata = {
  title: 'Anmelden',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full overflow-hidden">
      <section className="auth-dark-bg relative flex min-h-screen w-full flex-col lg:w-[60%] xl:w-[55%]">
        <header className="flex items-center justify-between px-6 pb-0 pt-6 sm:px-8 sm:pt-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="4"
                  width="9"
                  height="9"
                  rx="1.5"
                  fill="white"
                  fillOpacity="0.3"
                />
                <rect
                  x="6"
                  y="1"
                  width="9"
                  height="9"
                  rx="1.5"
                  fill="white"
                />
              </svg>
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-white">
              EZHost
            </span>
          </Link>

          <LanguageSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8">
          <div className="w-full max-w-[400px]">
            <LoginForm />
          </div>
        </div>

        <footer className="px-6 pb-6 sm:px-8 sm:pb-7">
          <Link
            href="/privacy"
            className="text-sm text-zinc-500 underline underline-offset-2 transition-colors duration-150 hover:text-zinc-300"
          >
            Privacy Policy
          </Link>
        </footer>
      </section>

      <aside className="relative hidden lg:flex lg:w-[40%] xl:w-[45%]">
        <PromoPanel />
      </aside>
    </main>
  )
}
