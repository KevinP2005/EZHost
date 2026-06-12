'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
]

export function LanguageSwitcher() {
  const [selected, setSelected] = useState(LANGUAGES[0])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-zinc-800 bg-white/[0.04] px-3 py-1.5 text-[13px] text-zinc-400 transition-colors duration-150 hover:text-zinc-200"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{selected.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="fade-in absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          {LANGUAGES.map((language) => {
            const isSelected = selected.code === language.code
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => {
                  setSelected(language)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition-colors duration-100 ${
                  isSelected
                    ? 'bg-indigo-500/10 text-indigo-300'
                    : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                }`}
                role="menuitem"
              >
                <span>{language.label}</span>
                {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
