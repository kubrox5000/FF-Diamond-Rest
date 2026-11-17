import 'server-only'
import { isValidCountryCode } from '@/lib/currencies'

export const DETECTED_COUNTRY_HEADER = 'x-detected-country'

const GEO_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-appengine-country',
  'cloudfront-viewer-country',
  'fastly-client-country',
  'x-country-code',
  'x-geo-country',
] as const

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 10_000
const LOOKUP_TIMEOUT_MS = 450

interface CachedGeo {
  country: string
  expiresAt: number
}

const globalGeo = globalThis as unknown as {
  __ffGeoIpCache?: Map<string, CachedGeo>
  __ffGeoIpInFlight?: Map<string, Promise<string | undefined>>
}

function getCache(): Map<string, CachedGeo> {
  if (!globalGeo.__ffGeoIpCache) globalGeo.__ffGeoIpCache = new Map()
  return globalGeo.__ffGeoIpCache
}

function getInFlight(): Map<string, Promise<string | undefined>> {
  if (!globalGeo.__ffGeoIpInFlight) globalGeo.__ffGeoIpInFlight = new Map()
  return globalGeo.__ffGeoIpInFlight
}

export function extractGeoCountryFromHeaders(headers: Pick<Headers, 'get'>): string | undefined {
  for (const name of GEO_HEADERS) {
    const raw = headers.get(name)
    if (isValidCountryCode(raw)) {
      return raw.trim().toUpperCase()
    }
  }
  return undefined
}

function stripPortAndBrackets(raw: string): string {
  let ip = raw.trim()
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']')
    if (end !== -1) ip = ip.slice(1, end)
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'))
  }
  if (ip.startsWith('::ffff:')) ip = ip.slice(7)
  return ip
}

export function isPrivateOrLocalIp(rawIp: string): boolean {
  const ip = stripPortAndBrackets(rawIp).toLowerCase()
  if (!ip || ip === '::1' || ip === '::' || ip === 'localhost') return true

  // IPv6 private/link-local
  if (ip.includes(':')) {
    return ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')
  }

  // IPv4 validation + private/reserved ranges
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true
  }
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

export function extractClientIp(headers: Pick<Headers, 'get'>): string | undefined {
  const singleHeaders = [
    'cf-connecting-ip',
    'x-nf-client-connection-ip',
    'x-real-ip',
    'x-client-ip',
  ]
  for (const name of singleHeaders) {
    const val = headers.get(name)
    if (val) {
      const ip = stripPortAndBrackets(val)
      if (!isPrivateOrLocalIp(ip)) return ip
    }
  }

  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    for (const part of forwarded.split(',')) {
      const ip = stripPortAndBrackets(part)
      if (!isPrivateOrLocalIp(ip)) return ip
    }
  }

  return undefined
}

/** Lightweight non-reversible FNV-1a hash used only to detect IP changes. */
export function hashIp(ip: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

async function queryIpProviders(ip: string): Promise<string | undefined> {
  const encoded = encodeURIComponent(ip)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), LOOKUP_TIMEOUT_MS)

  const providers: Array<{ url: string; pick: (j: Record<string, unknown>) => unknown }> = [
    { url: `https://ipwho.is/${encoded}`, pick: (j) => j.country_code },
    { url: `https://api.country.is/${encoded}`, pick: (j) => j.country },
    { url: `https://freeipapi.com/api/json/${encoded}`, pick: (j) => j.countryCode },
  ]

  try {
    const code = await Promise.any(
      providers.map(async (p) => {
        const res = await fetch(p.url, { signal: ctrl.signal, cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as Record<string, unknown>
        const raw = String(p.pick(json) ?? '')
        if (!isValidCountryCode(raw)) throw new Error('Invalid country code')
        return raw.trim().toUpperCase()
      }),
    )
    ctrl.abort()
    return code
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveCountryFromIp(ip: string): Promise<string | undefined> {
  if (isPrivateOrLocalIp(ip)) return undefined

  const cache = getCache()
  const now = Date.now()
  const cached = cache.get(ip)
  if (cached && cached.expiresAt > now) {
    return cached.country
  }
  if (cached) cache.delete(ip)

  const inFlight = getInFlight()
  const pending = inFlight.get(ip)
  if (pending) return pending

  const job = queryIpProviders(ip)
    .then((country) => {
      if (country) {
        if (cache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = cache.keys().next().value
          if (oldestKey) cache.delete(oldestKey)
        }
        cache.set(ip, { country, expiresAt: Date.now() + CACHE_TTL_MS })
      }
      return country
    })
    .finally(() => {
      inFlight.delete(ip)
    })

  inFlight.set(ip, job)
  return job
}
