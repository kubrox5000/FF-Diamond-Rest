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
  extractSupportedBrowserLang,
  isValidCountryCode,
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
    { url: 'https://api.country.is/', parse: (j: Record<string, unknown>) => j.country },
    { url: 'https://freeipapi.com/api/json', parse: (j: Record<string, unknown>) => j.countryCode },
  ]

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2000)

  try {
    const code = await Promise.any(
      sources.map(async (s) => {
        const res = await fetch(s.url, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as Record<string, unknown>
        const raw = String(s.parse(json) ?? '')
        if (!isValidCountryCode(raw)) throw new Error('Invalid country code')
        return raw.trim().toUpperCase()
      }),
    )
    ctrl.abort()
    return code
  } catch {
    // Fallback: infer from browser language tags, e.g. 'ar-EG' -> 'EG', 'fr-FR' -> 'FR'.
    if (typeof navigator !== 'undefined') {
      const list = navigator.languages?.length ? navigator.languages : [navigator.language]
      for (const l of list) {
        if (!l) continue
        const parts = l.split(/[-_]/)
        if (parts.length > 1 && isValidCountryCode(parts[1])) {
          const langPart = parts[0].toLowerCase()
          const regionPart = parts[1].toUpperCase()
          if (!(langPart === 'en' && regionPart === 'US')) {
            return regionPart
          }
        }
      }
    }
    return undefined
  } finally {
    clearTimeout(timer)
  }
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

  // Sync stored overrides and only run client geo fallback when SSR did not resolve a country.
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

    if (storedLang) {
      langOverrideRef.current = storedLang
      try {
        document.cookie = `${OVERRIDE_KEY}=${storedLang}; path=/; max-age=31536000; samesite=lax`
      } catch {
        // ignore
      }
    }
    if (storedCurrency) {
      currencyOverrideRef.current = storedCurrency
      try {
        document.cookie = `${CURRENCY_OVERRIDE_KEY}=${storedCurrency}; path=/; max-age=31536000; samesite=lax`
      } catch {
        // ignore
      }
    }

    if (storedLang || storedCurrency) {
      setState((s) => {
        const nextLang = storedLang ?? s.lang
        const nextCurrency = storedCurrency ?? s.currency
        if (nextLang === s.lang && nextCurrency === s.currency) return s
        return { ...s, lang: nextLang, currency: nextCurrency }
      })
    }

    // Server already resolved visitor country (via CDN geo header, server IP lookup, or ff_country cookie).
    // Skip client-side timezone/IP overrides so there is zero post-hydration flash or layout shift.
    if (seeded.current?.countryCode) {
      return () => {
        cancelled = true
      }
    }

    const setLocale = (lang: Lang, currency: string, countryCode: string) => {
      if (cancelled) return
      setState((s) => {
        const nextLang = langOverrideRef.current ?? lang
        const nextCurrency = currencyOverrideRef.current ?? currency
        if (
          s.status === 'ready' &&
          s.lang === nextLang &&
          s.currency === nextCurrency &&
          s.countryCode === countryCode
        ) {
          return s
        }
        return {
          status: 'ready',
          lang: nextLang,
          currency: nextCurrency,
          countryCode,
        }
      })
    }

    const browserLang =
      typeof navigator !== 'undefined'
        ? extractSupportedBrowserLang(navigator.languages?.length ? navigator.languages : [navigator.language])
        : undefined

    // 1. Instant fallback check from timezone (0ms) when server had no public IP/geo header
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    const tzCountry = countryFromTimezone(tz)

    if (tzCountry) {
      const base = localeForCountry(tzCountry, browserLang)
      setLocale(base.lang, base.currency, tzCountry)
    }

    // 2. Race IP-geo providers in parallel to refine & persist ff_country cookie for future SSR requests
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
