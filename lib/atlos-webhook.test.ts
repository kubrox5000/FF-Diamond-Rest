import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ATLOS_ALLOWED_SOURCE_STATUSES,
  canTransitionAtlosOrderToPaid,
  isAtlosPaidStatus,
  parseAtlosUsdScaled,
  validateAtlosPaymentPayload,
  verifyAtlosWebhookSignature,
  type AtlosOrderSnapshot,
} from './atlos-callback'

const SECRET = 'atlos-test-secret-key-12345'
const MERCHANT = 'merc-ffdiamond-prod'

function signPayload(rawBody: string, secret = SECRET, timestamp?: string): string {
  const message = timestamp ? `${timestamp}.${rawBody}` : rawBody
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex')
}

function baseOrder(overrides: Partial<AtlosOrderSnapshot> = {}): AtlosOrderSnapshot {
  return {
    orderNumber: 'FF-ATLOS-1001',
    amountUsd: '1.49',
    status: 'pending_payment',
    paymentMethod: 'ATLOS',
    ...overrides,
  }
}

function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    MerchantId: MERCHANT,
    OrderId: 'FF-ATLOS-1001',
    OrderAmount: 1.49,
    PaidAmount: 1.49,
    OrderCurrency: 'USD',
    Status: 100,
    Txid: '0xtxhash123',
    ...overrides,
  }
}

test('verifyAtlosWebhookSignature accepts valid signed requests and rejects tampered/expired ones', () => {
  const payload = JSON.stringify(basePayload())
  const now = 1_750_000_000
  const ts = String(now - 30)

  const sigWithTs = signPayload(payload, SECRET, ts)
  assert.equal(verifyAtlosWebhookSignature(payload, sigWithTs, ts, SECRET, now), true)

  const sigWithoutTs = signPayload(payload, SECRET)
  assert.equal(verifyAtlosWebhookSignature(payload, sigWithoutTs, null, SECRET, now), true)

  // Invalid signature
  assert.equal(verifyAtlosWebhookSignature(payload, '0'.repeat(64), ts, SECRET, now), false)
  assert.equal(verifyAtlosWebhookSignature(payload, 'not-hex', ts, SECRET, now), false)
  assert.equal(verifyAtlosWebhookSignature(payload, null, ts, SECRET, now), false)
  // Tampered body
  assert.equal(verifyAtlosWebhookSignature(payload.replace('1.49', '0.01'), sigWithTs, ts, SECRET, now), false)
  // Expired timestamp (> 300s)
  assert.equal(verifyAtlosWebhookSignature(payload, signPayload(payload, SECRET, String(now - 400)), String(now - 400), SECRET, now), false)
})

test('validateAtlosPaymentPayload accepts valid USD payment and allows documented overpayment when OrderAmount matches', () => {
  const order = baseOrder()
  const valid = validateAtlosPaymentPayload(basePayload(), order, MERCHANT)
  assert.equal(valid.ok, true)
  if (valid.ok) {
    assert.equal(valid.orderNumber, 'FF-ATLOS-1001')
    assert.equal(valid.txId, '0xtxhash123')
  }

  // Documented overpayment policy: OrderAmount matches DB total (1.49), PaidAmount slightly higher (1.55) -> accepted
  const overpaid = validateAtlosPaymentPayload(
    basePayload({ OrderAmount: '1.49', PaidAmount: '1.55' }),
    order,
    MERCHANT,
  )
  assert.equal(overpaid.ok, true)

  // Tampered OrderAmount lower than DB total even if PaidAmount matches -> rejected
  const tamperedOrderAmount = validateAtlosPaymentPayload(
    basePayload({ OrderAmount: '1.00', PaidAmount: '1.49' }),
    order,
    MERCHANT,
  )
  assert.equal(tamperedOrderAmount.ok, false)
})

test('validateAtlosPaymentPayload rejects underpayment, fractional underpayment, wrong currency, wrong merchant, and unknown/mismatched order', () => {
  const order = baseOrder()

  // Underpayment (whole cent and sub-cent precision check: 1.489 < 1.49)
  assert.equal(validateAtlosPaymentPayload(basePayload({ PaidAmount: 1.48 }), order, MERCHANT).ok, false)
  assert.equal(validateAtlosPaymentPayload(basePayload({ PaidAmount: '1.489' }), order, MERCHANT).ok, false)
  assert.equal(validateAtlosPaymentPayload(basePayload({ PaidAmount: 0 }), order, MERCHANT).ok, false)
  assert.equal(validateAtlosPaymentPayload(basePayload({ PaidAmount: -1.49 }), order, MERCHANT).ok, false)
  assert.equal(parseAtlosUsdScaled('1.489')! < parseAtlosUsdScaled('1.49')!, true)

  // Wrong or missing currency
  const wrongCur = validateAtlosPaymentPayload(basePayload({ OrderCurrency: 'EUR' }), order, MERCHANT)
  assert.equal(wrongCur.ok, false)
  const missingCur = validateAtlosPaymentPayload(basePayload({ OrderCurrency: undefined }), order, MERCHANT)
  assert.equal(missingCur.ok, false)

  // Wrong or missing merchant ID
  const wrongMerch = validateAtlosPaymentPayload(basePayload({ MerchantId: 'evil-merchant' }), order, MERCHANT)
  assert.equal(wrongMerch.ok, false)
  if (!wrongMerch.ok) assert.equal(wrongMerch.statusCode, 403)
  const missingMerch = validateAtlosPaymentPayload(basePayload({ MerchantId: undefined }), order, MERCHANT)
  assert.equal(missingMerch.ok, false)

  // Unknown/mismatched order ID or non-ATLOS payment method
  const wrongOrder = validateAtlosPaymentPayload(basePayload({ OrderId: 'FF-OTHER' }), order, MERCHANT)
  assert.equal(wrongOrder.ok, false)
  const nonAtlosOrder = validateAtlosPaymentPayload(basePayload(), baseOrder({ paymentMethod: 'PLISIO' }), MERCHANT)
  assert.equal(nonAtlosOrder.ok, false)

  // Non-paid / failed status never counts as paid
  assert.equal(isAtlosPaidStatus(100), true)
  assert.equal(isAtlosPaidStatus('completed'), true)
  assert.equal(isAtlosPaidStatus('failed'), false)
  assert.equal(isAtlosPaidStatus(0), false)
})

test('status transitions prevent duplicate, late (processing/completed), cancelled, and concurrent double-notifications', async () => {
  assert.deepEqual([...ATLOS_ALLOWED_SOURCE_STATUSES], ['pending_payment', 'payment_review'])
  assert.equal(canTransitionAtlosOrderToPaid('pending_payment'), true)
  assert.equal(canTransitionAtlosOrderToPaid('payment_review'), true)
  assert.equal(canTransitionAtlosOrderToPaid('paid'), false)
  assert.equal(canTransitionAtlosOrderToPaid('processing'), false)
  assert.equal(canTransitionAtlosOrderToPaid('completed'), false)
  assert.equal(canTransitionAtlosOrderToPaid('cancelled'), false)

  // Simulate atomic DB row transition across concurrent/duplicate/late/cancelled cases
  async function runAtomicWebhook(row: AtlosOrderSnapshot, payload: Record<string, unknown>, onNotify: () => void) {
    const validation = validateAtlosPaymentPayload(payload, row, MERCHANT)
    if (!validation.ok) return { statusCode: validation.statusCode, updated: false }
    // Atomic check-and-set mirroring `WHERE status IN ('pending_payment', 'payment_review')`
    if (!canTransitionAtlosOrderToPaid(row.status)) {
      return { statusCode: 200, updated: false, duplicate: true }
    }
    row.status = 'paid'
    await Promise.resolve()
    onNotify()
    return { statusCode: 200, updated: true, duplicate: false }
  }

  // Concurrent identical webhooks
  const concurrentRow = baseOrder()
  let notifyCount = 0
  const results = await Promise.all(
    Array.from({ length: 5 }, () => runAtomicWebhook(concurrentRow, basePayload(), () => { notifyCount += 1 })),
  )
  assert.equal(results.filter((r) => r.updated).length, 1)
  assert.equal(results.filter((r) => r.duplicate).length, 4)
  assert.equal(notifyCount, 1)
  assert.equal(concurrentRow.status, 'paid')

  // Duplicate webhook on already paid order
  const dup = await runAtomicWebhook(concurrentRow, basePayload(), () => { notifyCount += 1 })
  assert.equal(dup.updated, false)
  assert.equal(notifyCount, 1)

  // Late webhook after processing or completed
  for (const terminal of ['processing', 'completed', 'cancelled']) {
    const row = baseOrder({ status: terminal })
    let alerted = 0
    const res = await runAtomicWebhook(row, basePayload(), () => { alerted += 1 })
    assert.equal(res.updated, false)
    assert.equal(row.status, terminal)
    assert.equal(alerted, 0)
  }
})

test('Atlos webhook route verifies signature, validates payload, and guards atomic transition before notifying Telegram', () => {
  const route = readFileSync('app/api/atlos/webhook/route.ts', 'utf8')
  const handler = route.slice(route.indexOf('export async function POST'))
  assert.ok(handler.indexOf('verifyAtlosWebhookSignature') > -1)
  assert.ok(handler.indexOf('verifyAtlosWebhookSignature') < handler.indexOf('findAtlosOrder'))
  assert.ok(handler.indexOf('validateAtlosPaymentPayload') < handler.indexOf('markAtlosOrderPaid'))
  assert.ok(handler.indexOf('if (!updated)') < handler.indexOf('notifyTelegramPayment'))

  const libAtlos = readFileSync('lib/atlos.ts', 'utf8')
  assert.match(libAtlos, /db\.transaction/)
  assert.match(libAtlos, /inArray\(orders\.status,\s*\[\.\.\.ATLOS_ALLOWED_SOURCE_STATUSES\]\)/)
})
