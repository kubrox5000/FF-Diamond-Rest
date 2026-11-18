import crypto from 'node:crypto'

export const ATLOS_WEBHOOK_TOLERANCE_SECONDS = 300
export const ATLOS_ALLOWED_SOURCE_STATUSES = ['pending_payment', 'payment_review'] as const

const USD_SCALE = 100_000_000 // 10^8 precision for exact decimal comparisons without float rounding

/**
 * Overpayment policy:
 * - `OrderAmount` (whenever present in the Atlos payload) must exactly match the
 *   authoritative server order USD total.
 * - Actual `PaidAmount` (or `Amount` / `OrderAmount` when `PaidAmount` is omitted)
 *   must be strictly >= the expected order USD total.
 * - Any underpayment (`paid < expected`), negative/malformed amount, non-USD currency,
 *   or merchant mismatch is rejected. Valid overpayments (`paid >= expected`) are accepted.
 */
export function parseAtlosUsdScaled(value: unknown): number | null {
  let raw: string
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null
    raw = value.toFixed(8)
  } else if (typeof value === 'string') {
    raw = value.trim()
  } else {
    return null
  }

  if (!/^\d+(?:\.\d{1,8})?$/.test(raw)) return null
  const [whole, fraction = ''] = raw.split('.')
  const paddedFraction = fraction.padEnd(8, '0')
  const scaled = Number(whole) * USD_SCALE + Number(paddedFraction)
  return Number.isSafeInteger(scaled) ? scaled : null
}

export function verifyAtlosWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  timestampHeader: string | null | undefined,
  apiSecret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const secret = apiSecret?.trim()
  const signature = signatureHeader?.trim()
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false

  let message = rawBody
  const ts = timestampHeader?.trim()
  if (ts) {
    if (!/^\d+$/.test(ts)) return false
    const parsedTs = Number(ts)
    if (!Number.isSafeInteger(parsedTs)) return false
    if (Math.abs(nowSeconds - parsedTs) > ATLOS_WEBHOOK_TOLERANCE_SECONDS) return false
    message = `${ts}.${rawBody}`
  }

  try {
    const expected = crypto.createHmac('sha256', secret).update(message, 'utf8').digest()
    const provided = Buffer.from(signature, 'hex')
    return expected.length === provided.length && crypto.timingSafeEqual(expected, provided)
  } catch {
    return false
  }
}

export function extractAtlosOrderNumber(payload: Record<string, unknown>): string {
  const candidate = payload.OrderId ?? payload.orderId ?? payload.order_id ?? payload.Id ?? payload.id
  return typeof candidate === 'string' || typeof candidate === 'number'
    ? String(candidate).trim()
    : ''
}

export function extractAtlosTxId(payload: Record<string, unknown>): string | undefined {
  const candidate = payload.Txid ?? payload.txId ?? payload.tx_id
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined
}

export function isAtlosPaidStatus(status: unknown): boolean {
  if (status === 100) return true
  if (typeof status !== 'string' && typeof status !== 'number') return false
  const normalized = String(status).trim().toLowerCase()
  return normalized === '100' || normalized === 'completed' || normalized === 'confirmed' || normalized === 'paid'
}

export function canTransitionAtlosOrderToPaid(status: string): boolean {
  return status === 'pending_payment' || status === 'payment_review'
}

export interface AtlosOrderSnapshot {
  orderNumber: string
  amountUsd: string
  status: string
  paymentMethod: string
}

export type AtlosValidationResult =
  | { ok: true; orderNumber: string; paidScaled: number; expectedScaled: number; txId?: string }
  | { ok: false; statusCode: number; error: string }

export function validateAtlosPaymentPayload(
  payload: unknown,
  order: AtlosOrderSnapshot,
  expectedMerchantId: string | undefined,
): AtlosValidationResult {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, statusCode: 400, error: 'Malformed webhook payload' }
  }
  const data = payload as Record<string, unknown>

  const orderNumber = extractAtlosOrderNumber(data)
  if (!orderNumber || orderNumber !== order.orderNumber) {
    return { ok: false, statusCode: 400, error: 'Order ID mismatch' }
  }

  if (order.paymentMethod !== 'ATLOS') {
    return { ok: false, statusCode: 404, error: 'Order not found' }
  }

  const configuredMerchant = expectedMerchantId?.trim()
  if (!configuredMerchant) {
    return { ok: false, statusCode: 503, error: 'Atlos merchant is not configured' }
  }

  const payloadMerchant = data.MerchantId ?? data.merchantId ?? data.merchant_id
  if (typeof payloadMerchant !== 'string' || payloadMerchant.trim() !== configuredMerchant) {
    return { ok: false, statusCode: 403, error: 'Invalid merchant ID' }
  }

  const rawCurrency =
    data.OrderCurrency ??
    data.orderCurrency ??
    data.order_currency ??
    data.Currency ??
    data.currency
  if (typeof rawCurrency !== 'string' || rawCurrency.trim().toUpperCase() !== 'USD') {
    return { ok: false, statusCode: 400, error: 'Invalid payment currency' }
  }

  const expectedScaled = parseAtlosUsdScaled(order.amountUsd)
  if (expectedScaled === null || expectedScaled <= 0) {
    return { ok: false, statusCode: 400, error: 'Invalid expected order amount' }
  }

  const rawOrderAmount = data.OrderAmount ?? data.orderAmount ?? data.order_amount
  if (rawOrderAmount !== undefined && rawOrderAmount !== null && rawOrderAmount !== '') {
    const orderAmountScaled = parseAtlosUsdScaled(rawOrderAmount)
    if (orderAmountScaled === null || orderAmountScaled !== expectedScaled) {
      return { ok: false, statusCode: 400, error: 'Order amount mismatch' }
    }
  }

  const rawPaidAmount =
    data.PaidAmount ??
    data.paidAmount ??
    data.paid_amount ??
    data.Amount ??
    data.amount ??
    rawOrderAmount

  const paidScaled = parseAtlosUsdScaled(rawPaidAmount)
  if (paidScaled === null || paidScaled <= 0) {
    return { ok: false, statusCode: 400, error: 'Missing or invalid paid amount' }
  }

  if (paidScaled < expectedScaled) {
    return { ok: false, statusCode: 400, error: 'Underpayment detected' }
  }

  return {
    ok: true,
    orderNumber,
    paidScaled,
    expectedScaled,
    txId: extractAtlosTxId(data),
  }
}
