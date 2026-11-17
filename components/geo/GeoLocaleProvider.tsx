'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  CURRENCIES,
  dirOf,
  localeForCountry,
  formatLocalPrice,
  countryFromTimezone,
  type Lang,
} from '@/lib/currencies'
import { t as translate, type TKey } from '@/lib/i18n'
import type { ServerLocale } from '@/lib/locale-server'

const OVERRIDE_KEY = 'ff_locale_lang'
const CURRENCY_OVERRIDE_KEY = 'ff_locale_currency'
const SUPPORTED_LANGS: readonly string[] = ['en', 'ar', 'fr', 'es']

export interface LocaleValue {
  status: 'loading' | 'ready'
  lang: Lang
  dir: 'ltr' | 'rtl'
  currency: string
  countryCode?: string
  t: (key: TKey, vars?: Record<string, string | number>) => string
  formatPrice: (usd: number) => string
  /** Manually override the language (keeps the detected currency). */
  setLang: (lang: Lang) => void
  /** Manually override the display currency. */
  setCurrency: (currency: string) => void
}

const LocaleContext = createContext<LocaleValue | null>(null)

interface State {
  status: 'loading' | 'ready'
  lang: Lang
  currency: string
  countryCode?: string
}

async function detectCountryCode(): Promise<string | undefined> {
  const sources = [
    { url: 'https://ipwho.is/', parse: (j: Record<string, unknown>) => j.country_code },
    { url: 'https://freeipapi.com/api/json', parse: (j: Record<string, unknown>) => j.countryCode },
    { url: 'https://ipapi.co/json/', parse: (j: Record<string, unknown>) => j.country_code },
  ]
  for (const s of sources) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 2500)
      const res = await fetch(s.url, { signal: ctrl.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const json = (await res.json()) as Record<string, unknown>
      const code = String(s.parse(json) ?? '').toUpperCase()
      if (code && code.length === 2) return code
    } catch {
      // try next source
    }
  }
  // Fallback: infer from browser language tags, e.g. 'ar-EG' → 'EG', 'fr-FR' → 'FR'.
  if (typeof navigator !== 'undefined') {
    const list = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const l of list) {
      if (!l) continue
      const parts = l.split(/[-_]/)
      if (parts.length > 1 && parts[1].length === 2) {
        return parts[1].toUpperCase()
      }
    }
  }
  return undefined
}

export function GeoLocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: ServerLocale
}) {
  const seeded = useRef(initialLocale)
  const langOverrideRef = useRef<Lang | undefined>(undefined)
  const currencyOverrideRef = useRef<string | undefined>(undefined)

  const [state, setState] = useState<State>({
    status: seeded.current ? 'ready' : 'loading',
    lang: seeded.current?.lang ?? 'ar',
    currency: seeded.current?.currency ?? 'SAR',
    countryCode: seeded.current?.countryCode,
  })

  // Keep <html lang> and <html dir> in sync with the active language.
  useEffect(() => {
    document.documentElement.setAttribute('lang', state.lang)
    document.documentElement.setAttribute('dir', dirOf(state.lang))
  }, [state.lang])

  // Apply stored overrides and refine the country/currency automatically.
  useEffect(() => {
    let cancelled = false

    let storedLang: Lang | undefined
    let storedCurrency: string | undefined
    try {
      const l = globalThis.localStorage?.getItem(OVERRIDE_KEY)
      storedLang = l && SUPPORTED_LANGS.includes(l) ? (l as Lang) : undefined
      const c = globalThis.localStorage?.getItem(CURRENCY_OVERRIDE_KEY)?.toUpperCase()
      storedCurrency = c && Boolean(CURRENCIES[c]) ? c : undefined
    } catch {
      storedLang = undefined
      storedCurrency = undefined
    }

    if (storedLang) langOverrideRef.current = storedLang
    if (storedCurrency) currencyOverrideRef.current = storedCurrency

    if (storedLang || storedCurrency) {
      setState((s) => ({
        ...s,
        lang: storedLang ?? s.lang,
        currency: storedCurrency ?? s.currency,
      }))
    }

    const setLocale = (lang: Lang, currency: string, countryCode: string) => {
      if (cancelled) return
      setState((s) => ({
        ...s,
        status: 'ready',
        lang: langOverrideRef.current ?? lang,
        currency: currencyOverrideRef.current ?? currency,
        countryCode,
      }))
    }

    const browserLang = typeof navigator !== 'undefined' ? navigator.language : undefined

    // 1. Instant check from timezone (0ms)
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    const tzCountry = countryFromTimezone(tz)

    if (tzCountry) {
      const base = localeForCountry(tzCountry, browserLang)
      setLocale(base.lang, base.currency, tzCountry)
    }

    // 2. Refine via IP lookup in background
    void (async () => {
      const countryCode = await detectCountryCode()
      if (!countryCode || cancelled) return
      const base = localeForCountry(countryCode, browserLang)
      setLocale(base.lang, base.currency, countryCode)
      try {
        document.cookie = `ff_country=${countryCode}; path=/; max-age=2592000; samesite=lax`
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const setLang = useCallback((lang: Lang) => {
    langOverrideRef.current = lang
    try {
      globalThis.localStorage?.setItem(OVERRIDE_KEY, lang)
      document.cookie = `${OVERRIDE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // ignore storage errors
    }
    setState((s) => ({ ...s, lang }))
  }, [])

  const setCurrency = useCallback((currency: string) => {
    currencyOverrideRef.current = currency
    try {
      globalThis.localStorage?.setItem(CURRENCY_OVERRIDE_KEY, currency)
      document.cookie = `${CURRENCY_OVERRIDE_KEY}=${currency}; path=/; max-age=31536000; samesite=lax`
    } catch {
      // ignore storage errors
    }
    setState((s) => ({ ...s, currency }))
  }, [])

  const value = useMemo<LocaleValue>(() => {
    return {
      status: state.status,
      lang: state.lang,
      dir: dirOf(state.lang),
      currency: state.currency,
      countryCode: state.countryCode,
      t: (key, vars) => translate(state.lang, key, vars),
      formatPrice: (usd) => formatLocalPrice(usd, state.lang, state.currency),
      setLang,
      setCurrency,
    }
  }, [state, setLang, setCurrency])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within <GeoLocaleProvider>')
  return ctx
}
