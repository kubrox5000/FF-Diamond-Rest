'use client'

import { useEffect, useRef, useState } from 'react'
import { Coins, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLocale } from './GeoLocaleProvider'
import { CURRENCIES as CURRENCY_DATA } from '@/lib/currencies'

interface CurrencyOption {
  code: string
  symbol: string
  flag: string
  label: string
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', SAR: '🇸🇦', AED: '🇦🇪', EGP: '🇪🇬', MAD: '🇲🇦',
  DZD: '🇩🇿', TND: '🇹🇳', IQD: '🇮🇶', KWD: '🇰🇼', QAR: '🇶🇦', BHD: '🇧🇭', OMR: '🇴🇲',
  JOD: '🇯🇴', LYD: '🇱🇾', LBP: '🇱🇧', CAD: '🇨🇦', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭', INR: '🇮🇳',
  PKR: '🇵🇰', BDT: '🇧🇩', IDR: '🇮🇩', PHP: '🇵🇭', BRL: '🇧🇷', MXN: '🇲🇽', COP: '🇨🇴',
  ARS: '🇦🇷', CLP: '🇨🇱', PEN: '🇵🇪', PYG: '🇵🇾', TRY: '🇹🇷', NGN: '🇳🇬', ZAR: '🇿🇦', KES: '🇰🇪',
  GHS: '🇬🇭', THB: '🇹🇭', MYR: '🇲🇾', SGD: '🇸🇬', JPY: '🇯🇵', KRW: '🇰🇷', VND: '🇻🇳',
  SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱', CZK: '🇨🇿', HUF: '🇭🇺', RON: '🇷🇴', RUB: '🇷🇺',
}

const CURRENCIES: CurrencyOption[] = Object.values(CURRENCY_DATA).map((currency) => ({
  code: currency.code,
  symbol: currency.symbol,
  flag: CURRENCY_FLAGS[currency.code] ?? '💱',
  label: currency.name,
}))

export function CurrencySwitch({ className }: { className?: string }) {
  const { currency, setCurrency } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = CURRENCIES.find((c) => c.code === currency) ?? {
    code: currency,
    symbol: currency,
    flag: '💱',
    label: currency,
  }

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
        aria-label="Switch currency"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70 touch-manipulation"
        translate="no"
      >
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="hidden sm:inline">{current.flag} {current.code}</span>
        <span className="sm:hidden">{current.flag}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 w-56 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-xl divide-y divide-border/40">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setCurrency(c.code); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-secondary/60 touch-manipulation',
                currency === c.code ? 'font-semibold text-primary' : 'text-foreground',
              )}
              translate="no"
            >
              <span className="text-base">{c.flag}</span>
              <span className="w-9 shrink-0 font-mono text-xs font-bold">{c.code}</span>
              <span className="flex-1 text-start text-xs text-muted-foreground">{c.label}</span>
              {currency === c.code && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
