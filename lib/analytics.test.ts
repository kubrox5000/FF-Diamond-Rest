import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildBeginCheckoutPayload,
  buildGoogleAdsConversionPayload,
  buildPurchasePayload,
  isPaidConversionOrderStatus,
  resetPurchaseTrackingCacheForTests,
  trackVerifiedPurchaseOnce,
  type StorageLike,
} from './analytics'

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
  }
}

test('isPaidConversionOrderStatus only permits verified paid/processing/completed statuses', () => {
  for (const status of ['paid', 'processing', 'completed']) {
    assert.equal(isPaidConversionOrderStatus(status), true)
  }
  for (const status of ['pending_payment', 'payment_review', 'cancelled', 'failed', '', null, undefined]) {
    assert.equal(isPaidConversionOrderStatus(status), false)
  }
})

test('analytics payloads include transaction value/currency/items and strictly omit PII', () => {
  const checkout = buildBeginCheckoutPayload({ packageId: 3, diamonds: 1210, amountUsd: 3.49 })
  assert.deepEqual(checkout, {
    currency: 'USD',
    value: 3.49,
    items: [{ item_id: '3', item_name: '1210 Free Fire Diamonds', price: 3.49, quantity: 1 }],
  })

  // Pass extra PII properties via cast to prove stripping
  const sensitiveOrder = {
    orderNumber: 'FF-PAID-42',
    amountUsd: '3.49',
    status: 'paid',
    packageId: 3,
    diamonds: 1210,
    playerUid: '99887766',
    email: 'customer@example.test',
    phone: '+15551234567',
    trackingToken: 'secret-token-value',
    walletAddress: 'secret-wallet',
  }

  const purchase = buildPurchasePayload(sensitiveOrder)
  assert.ok(purchase)
  assert.equal(purchase.transaction_id, 'FF-PAID-42')
  assert.equal(purchase.value, 3.49)
  assert.equal(purchase.currency, 'USD')
  for (const piiKey of ['playerUid', 'email', 'phone', 'trackingToken', 'walletAddress']) {
    assert.equal(piiKey in purchase, false)
  }

  const ads = buildGoogleAdsConversionPayload(sensitiveOrder, {
    googleAdsPixelId: 'AW-123456789',
    googleAdsConversionLabel: 'PurchaseConv',
  })
  assert.deepEqual(ads, {
    send_to: 'AW-123456789/PurchaseConv',
    value: 3.49,
    currency: 'USD',
    transaction_id: 'FF-PAID-42',
  })
})

test('purchase tracking never fires on pending_payment/payment_review/cancelled and deduplicates repeated verified fires', () => {
  resetPurchaseTrackingCacheForTests()
  const storage = memoryStorage()
  const calls: unknown[][] = []
  const gtag = (...args: unknown[]) => { calls.push(args) }
  const cfg = { gaMeasurementId: 'G-TEST12345', googleAdsPixelId: 'AW-987654321', googleAdsConversionLabel: 'BuyLabel' }

  for (const blockedStatus of ['pending_payment', 'payment_review', 'cancelled', 'failed']) {
    const fired = trackVerifiedPurchaseOnce(
      { orderNumber: 'FF-BLOCKED-1', amountUsd: '5.49', status: blockedStatus },
      gtag,
      cfg,
      storage,
    )
    assert.equal(fired, false)
  }
  assert.equal(calls.length, 0)

  // Verified paid order fires GA4 purchase + Google Ads conversion once
  const first = trackVerifiedPurchaseOnce(
    { orderNumber: 'FF-PAID-99', amountUsd: '5.49', status: 'paid' },
    gtag,
    cfg,
    storage,
  )
  assert.equal(first, true)
  assert.equal(calls.length, 2)
  assert.equal(calls[0][1], 'purchase')
  assert.equal(calls[1][1], 'conversion')

  // Repeat call (same session) is deduplicated
  const second = trackVerifiedPurchaseOnce(
    { orderNumber: 'FF-PAID-99', amountUsd: '5.49', status: 'completed' },
    gtag,
    cfg,
    storage,
  )
  assert.equal(second, false)
  assert.equal(calls.length, 2)

  // Simulated page reload (in-memory cache cleared, localStorage persists) is STILL deduplicated
  resetPurchaseTrackingCacheForTests()
  const afterReload = trackVerifiedPurchaseOnce(
    { orderNumber: 'FF-PAID-99', amountUsd: '5.49', status: 'completed' },
    gtag,
    cfg,
    storage,
  )
  assert.equal(afterReload, false)
  assert.equal(calls.length, 2)

  // Distinct transaction ID fires once
  const other = trackVerifiedPurchaseOnce(
    { orderNumber: 'FF-PAID-100', amountUsd: '1.49', status: 'completed' },
    gtag,
    cfg,
    storage,
  )
  assert.equal(other, true)
  assert.equal(calls.length, 4)
})

test('conversion components verify server-confirmed paid status before calling fireVerifiedPurchase', () => {
  const confirmed = readFileSync('components/site/PaymentConfirmedClient.tsx', 'utf8')
  assert.match(confirmed, /x-order-tracking-token/)
  assert.match(confirmed, /isPaidConversionOrderStatus\(d\.order\.status\)/)
  assert.match(confirmed, /fireVerifiedPurchase\(d\.order\)/)

  const paymentClient = readFileSync('components/site/PaymentClient.tsx', 'utf8')
  assert.match(paymentClient, /isPaidConversionOrderStatus\(data\.order\.status\)/)
  assert.match(paymentClient, /fireVerifiedPurchase/)
})
