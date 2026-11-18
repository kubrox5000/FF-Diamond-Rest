import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { authorizeMarkReviewed, publicOrderDetails } from './order-access'
import { CURRENCIES, currencyFractionDigits, formatLocalPrice } from './currencies'
import { PAYMENT_METHODS } from './orders'
import { SEED_PAYMENT_METHODS } from './seed-data'
import { SUPPORTED_CRYPTO_CURRENCIES } from './payment-currencies'
import type { Order } from '@/db/schemas'

const VALID_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

test('mark-reviewed authorization rejects missing/wrong tokens and only transitions pending_payment orders', () => {
  const pending = { trackingToken: VALID_TOKEN, status: 'pending_payment' }
  assert.deepEqual(authorizeMarkReviewed(pending, null), {
    ok: false,
    statusCode: 401,
    error: 'Missing tracking token',
  })
  assert.deepEqual(authorizeMarkReviewed(pending, 'f'.repeat(64)), {
    ok: false,
    statusCode: 404,
    error: 'Order not found',
  })
  assert.deepEqual(authorizeMarkReviewed(null, VALID_TOKEN), {
    ok: false,
    statusCode: 404,
    error: 'Order not found',
  })
  assert.deepEqual(authorizeMarkReviewed(pending, VALID_TOKEN), {
    ok: true,
    shouldTransition: true,
  })
  for (const status of ['payment_review', 'paid', 'processing', 'completed', 'cancelled']) {
    assert.deepEqual(authorizeMarkReviewed({ trackingToken: VALID_TOKEN, status }, VALID_TOKEN), {
      ok: true,
      shouldTransition: false,
    })
  }

  const order = {
    orderNumber: 'FF-REV-1',
    packageId: 1,
    diamonds: 360,
    server: 'Global',
    amountUsd: '1.49',
    amountUsdt: '1.49',
    paymentMethod: 'ATLOS',
    status: 'payment_review',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    trackingToken: VALID_TOKEN,
    playerUid: '99887766',
  } as unknown as Order
  const safe = publicOrderDetails(order)
  assert.equal('trackingToken' in safe, false)
  assert.equal('playerUid' in safe, false)

  const route = readFileSync('app/api/orders/[orderNumber]/mark-reviewed/route.ts', 'utf8')
  assert.match(route, /x-order-tracking-token/)
  assert.match(route, /authorizeMarkReviewed/)
  assert.match(route, /publicOrderDetails/)
  assert.match(route, /eq\(orders\.status,\s*'pending_payment'\)/)
})

test('currency formatting preserves standard precision and distinguishes $1.49 vs $2.49 across GBP/EUR/KWD/BHD/JPY/USD/SAR', () => {
  assert.equal(currencyFractionDigits('GBP'), 2)
  assert.equal(currencyFractionDigits('EUR'), 2)
  assert.equal(currencyFractionDigits('USD'), 2)
  assert.equal(currencyFractionDigits('SAR'), 2)
  assert.equal(currencyFractionDigits('KWD'), 3)
  assert.equal(currencyFractionDigits('BHD'), 3)
  assert.equal(currencyFractionDigits('JPY'), 0)

  const gbp1 = formatLocalPrice(1.49, 'en', 'GBP')
  const gbp2 = formatLocalPrice(2.49, 'en', 'GBP')
  assert.equal(gbp1, '1.18 £')
  assert.equal(gbp2, '1.97 £')
  assert.notEqual(gbp1, gbp2)

  assert.equal(formatLocalPrice(1.49, 'en', 'EUR'), '1.37 €')
  assert.equal(formatLocalPrice(2.49, 'en', 'EUR'), '2.29 €')

  assert.equal(formatLocalPrice(1.49, 'ar', 'SAR'), '5.59 ر.س')
  assert.equal(formatLocalPrice(2.49, 'ar', 'SAR'), '9.34 ر.س')

  assert.equal(formatLocalPrice(1.49, 'ar', 'KWD'), '0.462 د.ك')
  assert.equal(formatLocalPrice(2.49, 'ar', 'KWD'), '0.772 د.ك')

  assert.equal(formatLocalPrice(1.49, 'ar', 'BHD'), '0.566 د.ب')
  assert.equal(formatLocalPrice(1.49, 'en', 'JPY'), '231 ¥')
  assert.equal(formatLocalPrice(1.49, 'en', 'USD'), '1.49 $')
  assert.ok(CURRENCIES.GBP)
})

test('inactive Binance Pay routes and placeholder ID 123456789 are removed', () => {
  for (const removedFile of [
    'app/binance-pay/page.tsx',
    'app/binance-pay/review/page.tsx',
    'components/site/BinancePayClient.tsx',
    'components/site/BinancePayReview.tsx',
  ]) {
    assert.equal(existsSync(removedFile), false, `Expected ${removedFile} to be removed`)
  }

  assert.equal(PAYMENT_METHODS.some((m) => m.id === ('BINANCE_PAY' as string)), false)
  assert.equal(SEED_PAYMENT_METHODS.some((m) => m.key === 'BINANCE_PAY' || m.walletAddress === '123456789'), false)

  for (const file of ['app/sitemap.ts', 'app/robots.ts', 'lib/seo.ts', 'db/seed.ts', 'lib/db-seed.ts']) {
    const content = readFileSync(file, 'utf8')
    assert.equal(content.includes('binance-pay'), false, `${file} still mentions binance-pay`)
    assert.equal(content.includes("'123456789'"), false, `${file} still contains placeholder 123456789`)
  }
})

test('BUSD is completely excluded from public crypto currencies, components, payment policy, and FAQ', () => {
  assert.equal((SUPPORTED_CRYPTO_CURRENCIES as readonly string[]).includes('BUSD'), false)

  for (const file of [
    'components/site/TopUpForm.tsx',
    'components/site/PaymentClient.tsx',
    'components/site/SiteFooter.tsx',
    'components/site/CryptoIcon.tsx',
    'app/payment-policy/page.tsx',
    'lib/seed-data.ts',
    'lib/locales/en.ts',
    'lib/locales/ar.ts',
    'lib/locales/fr.ts',
    'lib/locales/es.ts',
  ]) {
    const content = readFileSync(file, 'utf8')
    assert.equal(/\bBUSD\b/i.test(content), false, `${file} still references BUSD`)
  }
})
