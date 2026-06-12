import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="auth-dark-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="28" height="28" rx="7" fill="#4f46e5" />
          <path
            d="M7 8.5C7 7.67 7.67 7 8.5 7h4c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-4C7.67 14 7 13.33 7 12.5v-4ZM14 15.5c0-.83.67-1.5 1.5-1.5h4c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-4c-.83 0-1.5-.67-1.5-1.5v-4ZM7 16a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1ZM7 19.5A.5.5 0 0 1 7.5 19h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5ZM15 8a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2h-4a1 1 0 0 1-1-1ZM15 11.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5Z"
            fill="white"
          />
        </svg>
        <span className="text-[15.5px] font-semibold tracking-tight text-white">EZHost</span>
      </div>

      {/* Error code */}
      <p className="mb-3 text-[13px] font-medium tracking-widest text-indigo-400 uppercase">
        Fehler 404
      </p>
      <h1 className="mb-3 text-[32px] font-semibold tracking-tight text-white">
        Seite nicht gefunden
      </h1>
      <p className="mb-10 max-w-sm text-[14.5px] leading-relaxed text-zinc-500">
        Die angeforderte Seite existiert nicht oder wurde verschoben. Bitte prüfe
        die URL oder kehre zum Dashboard zurück.
      </p>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
      >
        Zum Dashboard
      </Link>
    </div>
  )
}
