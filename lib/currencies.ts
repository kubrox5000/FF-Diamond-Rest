// Client-safe country/locale/currency resolution.

export type Lang = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'pt-BR' | 'tr' | 'ru' | 'zh' | 'ja' | 'ko' | 'hi' | 'id'
export type Dir = 'ltr' | 'rtl'

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  /** Fixed conversion rate: 1 USD = rate × local currency. */
  rate: number
}

export interface LocaleConfig {
  lang: Lang
  currency: string
}

export const dirOf = (lang: Lang): Dir => (lang === 'ar' ? 'rtl' : 'ltr')

// Fixed conversion rates (USD → local). Prices shown to the visitor
// are computed as `priceUsd × rate` and never alter the real USDT/USD order amount.
export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
  EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', rate: 48 },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rate: 3.75 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 3.67 },
  IQD: { code: 'IQD', name: 'Iraqi Dinar', symbol: 'د.ع', rate: 1310 },
  MAD: { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م', rate: 10.2 },
  DZD: { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', rate: 134 },
  TND: { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', rate: 3.1 },
  JOD: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ', rate: 0.71 },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', rate: 0.31 },
  QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', rate: 3.64 },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', rate: 0.38 },
  OMR: { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', rate: 0.386 },
  LYD: { code: 'LYD', name: 'Libyan Dinar', symbol: 'د.ل', rate: 4.85 },
  LBP: { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', rate: 89000 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: 1.36 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.65 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rate: 0.89 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.5 },
  PKR: { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', rate: 280 },
  BDT: { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rate: 118 },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', rate: 16200 },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', rate: 58 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 5.1 },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', rate: 18.2 },
  COP: { code: 'COP', name: 'Colombian Peso', symbol: 'Col$', rate: 4100 },
 ARS: { code: 'ARS', name: 'Argentine Peso', symbol: 'ARS$', rate: 980 },
 PYG: { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲', rate: 7800 },
 CLP: { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', rate: 930 },
  PEN: { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', rate: 3.75 },
  TRY: { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 34.5 },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', rate: 1500 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.5 },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', rate: 130 },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', rate: 15.5 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 34 },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', rate: 4.3 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.35 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 155 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', rate: 1380 },
  VND: { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', rate: 25400 },
  SEK: { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 10.8 },
  NOK: { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 10.9 },
  DKK: { code: 'DKK', name: 'Danish Krone', symbol: 'kr', rate: 6.9 },
  CZK: { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', rate: 23.2 },
  HUF: { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', rate: 365 },
  RON: { code: 'RON', name: 'Romanian Leu', symbol: 'lei', rate: 4.6 },
  RUB: { code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: 92 },
}

// Country → Language & Currency mapping
export const COUNTRY_LOCALE: Record<string, LocaleConfig> = {
  // ── MENA / Arabic-speaking ──
  SA: { lang: 'ar', currency: 'SAR' },
  AE: { lang: 'ar', currency: 'AED' },
  EG: { lang: 'ar', currency: 'EGP' },
  IQ: { lang: 'ar', currency: 'IQD' },
  MA: { lang: 'ar', currency: 'MAD' },
  DZ: { lang: 'ar', currency: 'DZD' },
  TN: { lang: 'ar', currency: 'TND' },
  JO: { lang: 'ar', currency: 'JOD' },
  KW: { lang: 'ar', currency: 'KWD' },
  QA: { lang: 'ar', currency: 'QAR' },
  BH: { lang: 'ar', currency: 'BHD' },
  OM: { lang: 'ar', currency: 'OMR' },
  LY: { lang: 'ar', currency: 'LYD' },
  LB: { lang: 'ar', currency: 'LBP' },
  SY: { lang: 'ar', currency: 'USD' },
  YE: { lang: 'ar', currency: 'USD' },
  PS: { lang: 'ar', currency: 'USD' },
  MR: { lang: 'ar', currency: 'USD' },
  SO: { lang: 'ar', currency: 'USD' },
  SD: { lang: 'ar', currency: 'USD' },
  DJ: { lang: 'ar', currency: 'USD' },
  KM: { lang: 'ar', currency: 'USD' },

  // ── French-speaking ──
  FR: { lang: 'fr', currency: 'EUR' },
  BE: { lang: 'fr', currency: 'EUR' },
  CH: { lang: 'fr', currency: 'CHF' },
  LU: { lang: 'fr', currency: 'EUR' },
  MC: { lang: 'fr', currency: 'EUR' },
  SN: { lang: 'fr', currency: 'USD' },
  CI: { lang: 'fr', currency: 'USD' },
  CM: { lang: 'fr', currency: 'USD' },
  ML: { lang: 'fr', currency: 'USD' },
  GN: { lang: 'fr', currency: 'USD' },
  BJ: { lang: 'fr', currency: 'USD' },
  TG: { lang: 'fr', currency: 'USD' },
  GA: { lang: 'fr', currency: 'USD' },
  CG: { lang: 'fr', currency: 'USD' },
  CD: { lang: 'fr', currency: 'USD' },
  MG: { lang: 'fr', currency: 'USD' },
  NE: { lang: 'fr', currency: 'USD' },
  BF: { lang: 'fr', currency: 'USD' },
  TD: { lang: 'fr', currency: 'USD' },
  HT: { lang: 'fr', currency: 'USD' },

  // ── Spanish-speaking ──
  ES: { lang: 'es', currency: 'EUR' },
  MX: { lang: 'es', currency: 'MXN' },
  CO: { lang: 'es', currency: 'COP' },
  AR: { lang: 'es', currency: 'ARS' },
  CL: { lang: 'es', currency: 'CLP' },
  PE: { lang: 'es', currency: 'PEN' },
  VE: { lang: 'es', currency: 'USD' },
  EC: { lang: 'es', currency: 'USD' },
  GT: { lang: 'es', currency: 'USD' },
  CU: { lang: 'es', currency: 'USD' },
  BO: { lang: 'es', currency: 'USD' },
  DO: { lang: 'es', currency: 'USD' },
  HN: { lang: 'es', currency: 'USD' },
  PY: { lang: 'es', currency: 'USD' },
  SV: { lang: 'es', currency: 'USD' },
  NI: { lang: 'es', currency: 'USD' },
  CR: { lang: 'es', currency: 'USD' },
  PA: { lang: 'es', currency: 'USD' },
  UY: { lang: 'es', currency: 'USD' },
  PR: { lang: 'es', currency: 'USD' },

  // ── English & Worldwide ──
  US: { lang: 'en', currency: 'USD' },
  GB: { lang: 'en', currency: 'GBP' },
  CA: { lang: 'en', currency: 'CAD' },
  AU: { lang: 'en', currency: 'AUD' },
  NZ: { lang: 'en', currency: 'NZD' },
  IE: { lang: 'en', currency: 'EUR' },
  IN: { lang: 'en', currency: 'INR' },
  PK: { lang: 'en', currency: 'PKR' },
  BD: { lang: 'en', currency: 'BDT' },
  ID: { lang: 'en', currency: 'IDR' },
  PH: { lang: 'en', currency: 'PHP' },
  MY: { lang: 'en', currency: 'MYR' },
  SG: { lang: 'en', currency: 'SGD' },
  TH: { lang: 'en', currency: 'THB' },
  VN: { lang: 'en', currency: 'VND' },
  TR: { lang: 'en', currency: 'TRY' },
  BR: { lang: 'en', currency: 'BRL' },
  PT: { lang: 'en', currency: 'EUR' },
  DE: { lang: 'en', currency: 'EUR' },
  IT: { lang: 'en', currency: 'EUR' },
  NL: { lang: 'en', currency: 'EUR' },
  AT: { lang: 'en', currency: 'EUR' },
  FI: { lang: 'en', currency: 'EUR' },
  GR: { lang: 'en', currency: 'EUR' },
  CY: { lang: 'en', currency: 'EUR' },
  SE: { lang: 'en', currency: 'SEK' },
  NO: { lang: 'en', currency: 'NOK' },
  DK: { lang: 'en', currency: 'DKK' },
  CZ: { lang: 'en', currency: 'CZK' },
  HUF: { lang: 'en', currency: 'HUF' },
  RO: { lang: 'en', currency: 'RON' },
  ZA: { lang: 'en', currency: 'ZAR' },
  NG: { lang: 'en', currency: 'NGN' },
  KE: { lang: 'en', currency: 'KES' },
  GH: { lang: 'en', currency: 'GHS' },
  JP: { lang: 'en', currency: 'JPY' },
  KR: { lang: 'en', currency: 'KRW' },
  RU: { lang: 'en', currency: 'RUB' },
}

export const FALLBACK_LOCALE: LocaleConfig = { lang: 'ar', currency: 'SAR' }

// Timezone → country mapping across the globe
const TIMEZONE_COUNTRY: Record<string, string> = {
  // Arab / MENA
  'Africa/Casablanca': 'MA',
  'Africa/El_Aaiun': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Tripoli': 'LY',
  'Africa/Cairo': 'EG',
  'Africa/Khartoum': 'SD',
  'Africa/Djibouti': 'DJ',
  'Africa/Mogadishu': 'SO',
  'Africa/Nouakchott': 'MR',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Baghdad': 'IQ',
  'Asia/Dubai': 'AE',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Muscat': 'OM',
  'Asia/Bahrain': 'BH',
  'Asia/Jerusalem': 'PS',
  'Asia/Aden': 'YE',

  // Europe
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Lisbon': 'PT',
  'Europe/Vienna': 'AT',
  'Europe/Dublin': 'IE',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Athens': 'GR',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',

  // Americas
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Halifax': 'CA',
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Monterrey': 'MX',
  'America/Tijuana': 'MX',
  'America/Bogota': 'CO',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  'America/Sao_Paulo': 'BR',
  'America/Fortaleza': 'BR',
  'America/Manaus': 'BR',

  // Asia / Pacific / Africa
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Lagos': 'NG',
  'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE',
  'Africa/Accra': 'GH',
}

/** Resolve a country code from the browser timezone, if one is known. */
export function countryFromTimezone(timeZone?: string): string | undefined {
  if (!timeZone) return undefined
  return TIMEZONE_COUNTRY[timeZone]
}

/**
 * Map an ISO country code to the visitor's locale and currency.
 * Automatically selects the appropriate language (Arabic, English, French, Spanish)
 * and the visitor's local currency.
 */
export function localeForCountry(countryCode: string | undefined, browserLang?: string): LocaleConfig {
  const code = (countryCode ?? '').trim().toUpperCase()
  if (code && COUNTRY_LOCALE[code]) {
    const matched = { ...COUNTRY_LOCALE[code] }
    // If country is multilingual (like Morocco, Algeria, Tunisia, Canada, Belgium) and browser prefers another supported language:
    if (browserLang) {
      const primary = browserLang.toLowerCase().split(/[-_]/)[0] as Lang
      if ((primary === 'ar' || primary === 'fr' || primary === 'en' || primary === 'es') && ['MA', 'DZ', 'TN', 'LB', 'CA', 'BE', 'CH'].includes(code)) {
        matched.lang = primary
      }
    }
    return matched
  }

  // If country is not in the list, infer from browser language if provided:
  if (browserLang) {
    const primary = browserLang.toLowerCase().split(/[-_]/)[0] as Lang
    if (primary === 'ar' || primary === 'fr' || primary === 'es' || primary === 'en') {
      const defCurrency = primary === 'ar' ? 'SAR' : primary === 'fr' ? 'EUR' : 'USD'
      return { lang: primary, currency: defCurrency }
    }
  }

  return { lang: 'en', currency: 'USD' }
}

/** A "generic" interface used by the provider before a final decision. */
export interface LocaleState {
  status: 'loading' | 'ready'
  lang: Lang
  dir: Dir
  currency: string
}

/** Format a number using Latin (Western) digits with standard grouping. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

/** Format a USD base price into the active display currency (whole number). */
export function formatLocalPrice(usd: number, lang: Lang, currency: string): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.USD
  // Drop any fractional part so prices always show as whole numbers (203.9 → 203).
  const amount = Math.floor(usd * info.rate)
  // Keep Latin (Western) digits even in Arabic; only the currency symbol changes.
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
  return `${nf.format(amount)} ${info.symbol}`
}
