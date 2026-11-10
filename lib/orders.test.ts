import assert from 'node:assert/strict'
import test from 'node:test'
import { discountedCents, validateDiscountPct } from './orders'
import { getOfficialPackage } from './package-catalog'

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

test('package pricing comes from the catalog, not a submitted amount', () => {
  const pkg = getOfficialPackage(1)
  assert.equal(pkg?.priceCents, 100)
  assert.equal(pkg?.priceUsd, '1.00')
  assert.equal(getOfficialPackage(999), undefined)
})
