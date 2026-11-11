import crypto from 'node:crypto'

export type PlisioCallback = Record<string, unknown>

function phpSerializeStringMap(data: Record<string, string>): string {
  const entries = Object.entries(data).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
  const serialized = entries.map(([key, value]) => {
    const keyLength = Buffer.byteLength(key, 'utf8')
    const valueLength = Buffer.byteLength(value, 'utf8')
    return `s:${keyLength}:"${key}";s:${valueLength}:"${value}";`
  }).join('')
  return `a:${entries.length}:{${serialized}}`
}

export function canonicalPlisioCallback(data: PlisioCallback, format: 'json' | 'form'): string | null {
  const unsigned = { ...data }
  delete unsigned.verify_hash
  if (Object.values(unsigned).some((value) => value !== null && typeof value === 'object')) return null

  if (format === 'json') {
    const sorted = Object.fromEntries(Object.entries(unsigned).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    return JSON.stringify(sorted)
  }

  const strings: Record<string, string> = {}
  for (const [key, value] of Object.entries(unsigned)) {
    if (typeof value !== 'string') return null
    strings[key] = value
  }
  return phpSerializeStringMap(strings)
}

export function verifyPlisioCallback(data: PlisioCallback, secret: string, format: 'json' | 'form'): boolean {
  const signature = data.verify_hash
  const canonical = canonicalPlisioCallback(data, format)
  if (!canonical || typeof signature !== 'string' || !/^[a-f0-9]{40}$/i.test(signature)) return false
  const expected = crypto.createHmac('sha1', secret).update(canonical, 'utf8').digest()
  const provided = Buffer.from(signature, 'hex')
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
}

export function parseUsdCents(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value)
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export function matchesPlisioOrderAmount(payload: PlisioCallback, amountUsd: string): boolean {
  return payload.source_currency === 'USD'
    && parseUsdCents(payload.source_amount) !== null
    && parseUsdCents(payload.source_amount) === parseUsdCents(amountUsd)
}

export function allowedPlisioSourceStatuses(transition: 'paid' | 'cancelled' | 'payment_review'): string[] {
  return transition === 'paid' ? ['pending_payment', 'payment_review'] : ['pending_payment']
}

export function getPlisioOrderTransition(status: string): 'paid' | 'cancelled' | 'payment_review' | null {
  if (status === 'completed') return 'paid'
  if (status === 'cancelled' || status === 'expired' || status === 'error') return 'cancelled'
  if (status === 'mismatch') return 'payment_review'
  return null
}
