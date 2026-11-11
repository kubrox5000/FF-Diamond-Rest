import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { databaseSetupGate } from './database-setup-guard'
import { hasValidTrackingToken, publicOrderDetails } from './order-access'
import { allowedPlisioSourceStatuses, canonicalPlisioCallback, getPlisioOrderTransition, matchesPlisioOrderAmount, verifyPlisioCallback } from './plisio-callback'
import type { Order } from '@/db/schemas'

const token = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

test('database setup gate rejects unauthorized requests and prevents replacement', () => {
  assert.deepEqual(databaseSetupGate(false, false), { allowed: false, status: 401, error: 'Unauthorized' })
  assert.deepEqual(databaseSetupGate(true, true), { allowed: false, status: 409, error: 'Database is already configured' })
  assert.deepEqual(databaseSetupGate(true, false), { allowed: true })
})

test('order details require the private tracking token and reveal only a safe summary', () => {
  assert.equal(hasValidTrackingToken(token, null), false)
  assert.equal(hasValidTrackingToken(token, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), false)
  assert.equal(hasValidTrackingToken(token, token), true)
  const order = {
    orderNumber: 'FF-TEST', packageId: 1, diamonds: 360, server: 'Global', amountUsd: '1.00', amountUsdt: '1.00',
    paymentMethod: 'ATLOS', status: 'pending_payment', createdAt: new Date(0), updatedAt: new Date(0),
    trackingToken: token, playerUid: '12345678', nickname: null, email: 'private@example.test', phone: null,
    country: null, walletAddress: 'secret-wallet', txId: null, proofUrl: null, couponCode: null, adminNotes: null, id: 1,
  } as unknown as Order
  const safe = publicOrderDetails(order)
  assert.equal(safe.orderNumber, 'FF-TEST')
  assert.equal('trackingToken' in safe, false)
  assert.equal('email' in safe, false)
  assert.equal('walletAddress' in safe, false)
  assert.equal('playerUid' in safe, false)
})

test('security-sensitive route handlers enforce authorization and verification before mutations', () => {
  const setupRoute = readFileSync('app/api/admin/database-setup/route.ts', 'utf8')
  assert.equal((setupRoute.match(/await getAdminSession\(\)/g) ?? []).length, 3)
  assert.match(setupRoute, /databaseSetupGate\(authenticated, isDatabaseConfigured\(\)\)/)
  assert.ok(setupRoute.indexOf('const denied = gateResponse(Boolean(session))') < setupRoute.indexOf('sql = postgres(url'))
  const orderRoute = readFileSync('app/api/orders/[orderNumber]/route.ts', 'utf8')
  assert.match(orderRoute, /x-order-tracking-token/)
  assert.match(orderRoute, /hasValidTrackingToken/)
  assert.match(orderRoute, /publicOrderDetails/)
  const plisioRoute = readFileSync('app/api/plisio/webhook/route.ts', 'utf8')
  assert.ok(plisioRoute.indexOf('verifyPlisioCallback') < plisioRoute.indexOf('db.update(orders)'))
  assert.match(plisioRoute, /inArray\(orders.status, allowedFrom\)/)
  const invoiceSource = readFileSync('app/api/orders/route.ts', 'utf8')
  assert.match(invoiceSource, /api\/plisio\/webhook\?json=true/)
})

test('Plisio JSON callback uses documented sorted payload and HMAC-SHA1 verify_hash', () => {
  const unsigned = { status: 'completed', order_number: 'FF-1', source_currency: 'USD', source_amount: '1.00' }
  const canonical = canonicalPlisioCallback(unsigned, 'json')
  assert.equal(canonical, '{"order_number":"FF-1","source_amount":"1.00","source_currency":"USD","status":"completed"}')
  const secret = 'test-shop-api-key'
  const verify_hash = crypto.createHmac('sha1', secret).update(canonical!).digest('hex')
  assert.equal(verifyPlisioCallback({ ...unsigned, verify_hash }, secret, 'json'), true)
  assert.equal(verifyPlisioCallback({ ...unsigned, verify_hash: '0'.repeat(40) }, secret, 'json'), false)
  assert.equal(verifyPlisioCallback(unsigned, secret, 'json'), false)
})

test('Plisio legacy form callback verification and payment-state constraints', () => {
  const data = { order_number: 'FF-2', source_amount: '5.00', source_currency: 'USD', status: 'completed' }
  const canonical = canonicalPlisioCallback(data, 'form')!
  const hash = crypto.createHmac('sha1', 'shop-key').update(canonical).digest('hex')
  assert.equal(verifyPlisioCallback({ ...data, verify_hash: hash }, 'shop-key', 'form'), true)
  assert.equal(matchesPlisioOrderAmount({ ...data }, '5.00'), true)
  assert.equal(matchesPlisioOrderAmount({ ...data, source_amount: '5.01' }, '5.00'), false)
  assert.equal(matchesPlisioOrderAmount({ ...data, source_currency: 'EUR' }, '5.00'), false)
  assert.equal(getPlisioOrderTransition('completed'), 'paid')
  assert.equal(getPlisioOrderTransition('mismatch'), 'payment_review')
  assert.equal(getPlisioOrderTransition('expired'), 'cancelled')
  assert.equal(getPlisioOrderTransition('pending'), null)
  assert.deepEqual(allowedPlisioSourceStatuses('paid'), ['pending_payment', 'payment_review'])
  assert.deepEqual(allowedPlisioSourceStatuses('cancelled'), ['pending_payment'])
  assert.deepEqual(allowedPlisioSourceStatuses('payment_review'), ['pending_payment'])
})
