// Server-side locale resolution so the first render already matches the visitor.
// Imported only from server components (App Router) — never from client code.
import { headers, cookies } from 'next/headers'
import {
  CURRENCIES,
  FALLBACK_LOCALE,
  extractSupportedBrowserLang,
  isValidCountryCode,
  localeForCountry,
  type Lang,
} from './currencies'
import { DETECTED_COUNTRY_HEADER, extractGeoCountryFromHeaders } from './geo-server'

export const OVERRIDE_COOKIE = 'ff_locale_lang'
export const CURRENCY_OVERRIDE_COOKIE = 'ff_locale_currency'
export const COUNTRY_COOKIE = 'ff_country'

export interface ServerLocale {
  lang: Lang
  currency: string
  countryCode?: string
}

/** Resolve the visitor's locale on the server, without blocking rendering. */
export async function resolveServerLocale(): Promise<ServerLocale> {
  const [h, c] = await Promise.all([headers(), cookies()])

  // 1. Manual language & currency overrides (persisted from switchers).
  const langOverride = c.get(OVERRIDE_COOKIE)?.value
  const storedLang: Lang | undefined =
    langOverride === 'en' || langOverride === 'ar' || langOverride === 'fr' || langOverride === 'es'
      ? (langOverride as Lang)
      : undefined

  const rawCurrencyOverride = c.get(CURRENCY_OVERRIDE_COOKIE)?.value?.trim().toUpperCase()
  const storedCurrency =
    rawCurrencyOverride && Boolean(CURRENCIES[rawCurrencyOverride]) ? rawCurrencyOverride : undefined

  // 2. Country: prefer proxy-resolved header, CDN geo headers, or valid geo cookie.
  const detectedHeader = h.get(DETECTED_COUNTRY_HEADER)
  const rawCookieCountry = c.get(COUNTRY_COOKIE)?.value
  const geoCountry =
    (isValidCountryCode(detectedHeader) ? detectedHeader.trim().toUpperCase() : undefined) ||
    extractGeoCountryFromHeaders(h) ||
    (isValidCountryCode(rawCookieCountry) ? rawCookieCountry.trim().toUpperCase() : undefined)

  const acceptLanguage = h.get('accept-language') ?? ''
  const browserLang = extractSupportedBrowserLang(acceptLanguage)

  // Only infer country from Accept-Language region subtag when it isn't the generic `en-US` browser default.
  let inferredCountry = geoCountry
  if (!inferredCountry) {
    const m = acceptLanguage.match(/(?:^|,)\s*([a-z]{2})-([A-Z]{2})\b/i)
    if (m && m[2]) {
      const langPart = m[1].toLowerCase()
      const regionPart = m[2].toUpperCase()
      if (!(langPart === 'en' && regionPart === 'US') && isValidCountryCode(regionPart)) {
        inferredCountry = regionPart
      }
    }
  }

  const base = inferredCountry
    ? localeForCountry(inferredCountry, browserLang)
    : browserLang
    ? { lang: browserLang, currency: browserLang === 'ar' ? 'SAR' : browserLang === 'fr' ? 'EUR' : 'USD' }
    : FALLBACK_LOCALE

  const lang: Lang = storedLang ?? base.lang
  const currency: string = storedCurrency ?? base.currency

  return { lang, currency, countryCode: geoCountry }
}
