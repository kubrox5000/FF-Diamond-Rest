import assert from 'node:assert/strict'
import test from 'node:test'
import { discountedCents, discountedPrice, validateDiscountPct } from './orders'
import {
  OFFICIAL_PACKAGE_CATALOG,
  calculateOrderPricingCents,
  getOfficialPackage,
  normalizePackage,
} from './package-catalog'
import {
  STOREFRONT_ALLOWED_PAYMENT_KEYS,
  SUPPORTED_CRYPTO_COMMA_LIST,
  SUPPORTED_CRYPTO_CURRENCIES,
  SUPPORTED_CRYPTO_DOT_LIST,
} from './payment-currencies'

test('valid coupon percentages produce positive integer-cent totals', () => {
  assert.equal(discountedCents(100, 0), 100)
  assert.equal(discountedCents(100, 20), 80)
  assert.equal(discountedCents(100, 99), 1)
})

test('100 percent and invalid coupon discounts are rejected', () => {
  assert.equal(discountedCents(100, 100), null)
  for (const value of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY, null, '20', 20.5]) {
    assert.equal(validateDiscountPct(value), null)
    assert.equal(discountedCents(100, value), null)
  }
})

test('invalid base totals are rejected', () => {
  assert.equal(discountedCents(0, 0), null)
  assert.equal(discountedCents(-100, 0), null)
  assert.equal(discountedCents(Number.NaN, 20), null)
})

test('authoritative package catalog preserves production pricing ($1.49 - $13.49)', () => {
  const pkg1 = getOfficialPackage(1)
  assert.equal(pkg1?.diamonds, 310)
  assert.equal(pkg1?.bonusDiamonds, 50)
  assert.equal(pkg1?.priceCents, 149)
  assert.equal(pkg1?.priceUsd, '1.49')

  const pkg3 = getOfficialPackage(3)
  assert.equal(pkg3?.diamonds, 1060)
  assert.equal(pkg3?.bonusDiamonds, 150)
  assert.equal(pkg3?.priceCents, 349)
  assert.equal(pkg3?.priceUsd, '3.49')

  const pkg11 = getOfficialPackage(11)
  assert.equal(pkg11?.diamonds, 11500)
  assert.equal(pkg11?.priceCents, 1349)
  assert.equal(pkg11?.priceUsd, '13.49')

  assert.equal(OFFICIAL_PACKAGE_CATALOG.length, 11)
  assert.equal(getOfficialPackage(999), undefined)
})

test('client and server pricing calculations match identically using integer cents', () => {
  const pkg = normalizePackage({
    id: 119,
    diamonds: 310,
    bonusDiamonds: 0,
    priceUsd: '1.49',
    priceUsdt: '1.49',
    discountPct: 10,
    popular: false,
    flashSale: false,
    deliveryEta: '1-5 minutes',
    active: true,
    sortOrder: 1,
  })

  assert.equal(pkg.bonusDiamonds, 50)
  assert.equal(pkg.basePriceCents, 149)
  assert.equal(pkg.priceCents, 134)

  const pkgOnlyUsd = discountedPrice(pkg.priceUsd, pkg.discountPct)
  assert.equal(pkgOnlyUsd, 1.34)

  const withCoupon = calculateOrderPricingCents(pkg, 15)
  assert.ok(withCoupon)
  assert.equal(withCoupon.packageCents, 134)
  assert.equal(withCoupon.finalCents, 114)
  assert.equal(withCoupon.finalUsd, 1.14)
})

test('supported storefront crypto currencies exclude BUSD and stay synchronized', () => {
  assert.deepEqual([...SUPPORTED_CRYPTO_CURRENCIES], ['USDT', 'BTC', 'ETH', 'SOL', 'LTC', 'BNB'])
  assert.equal(SUPPORTED_CRYPTO_COMMA_LIST, 'USDT, BTC, ETH, SOL, LTC, BNB')
  assert.equal(SUPPORTED_CRYPTO_DOT_LIST, 'USDT · BTC · ETH · SOL · LTC · BNB')
  assert.equal(STOREFRONT_ALLOWED_PAYMENT_KEYS.has('BUSD'), false)
  assert.equal(STOREFRONT_ALLOWED_PAYMENT_KEYS.has('ATLOS'), true)
  assert.equal(STOREFRONT_ALLOWED_PAYMENT_KEYS.has('USDT_TRC20'), true)
  assert.equal(STOREFRONT_ALLOWED_PAYMENT_KEYS.has('BNB'), true)
})
