'use client'

import { useEffect, useRef, useState } from 'react'
import { Languages, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLocale } from './GeoLocaleProvider'
import type { Lang } from '@/lib/currencies'

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[1]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch language"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 touch-manipulation"
      >
        <Languages className="h-4 w-4 text-muted-foreground" />
        <span translate="no" className="hidden sm:inline">{current.flag} {current.label}</span>
        <span translate="no" className="sm:hidden">{current.flag}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/60 touch-manipulation',
                lang === l.code ? 'font-semibold text-primary' : 'text-foreground',
              )}
              translate="no"
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-start">{l.label}</span>
              {lang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
