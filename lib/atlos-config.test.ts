import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { hasCompleteAtlosCredentials, resolveAtlosCredentials } from './atlos-config'

test('Atlos configured only in admin settings is available to payment consumers', async () => {
  const credentials = await resolveAtlosCredentials({}, async () => ({
    atlosMerchantId: ' test-merchant ',
  }))
  assert.equal(credentials.merchantId, 'test-merchant')
})

test('environment configuration takes precedence over admin settings', async () => {
  const credentials = await resolveAtlosCredentials({
    ATLOS_MERCHANT_ID: 'test-server-merchant',
    NEXT_PUBLIC_ATLOS_MERCHANT_ID: 'test-public-merchant',
  }, async () => ({ atlosMerchantId: 'test-admin-merchant' }))
  assert.equal(credentials.merchantId, 'test-server-merchant')
})

test('legacy public environment configuration remains supported', async () => {
  const credentials = await resolveAtlosCredentials({
    NEXT_PUBLIC_ATLOS_MERCHANT_ID: ' test-public-merchant ',
  }, async () => ({}))
  assert.equal(credentials.merchantId, 'test-public-merchant')
})

test('blank environment values fall back to saved settings', async () => {
  const credentials = await resolveAtlosCredentials({ ATLOS_MERCHANT_ID: '  ' },
    async () => ({ atlosMerchantId: 'test-admin-merchant' }))
  assert.equal(credentials.merchantId, 'test-admin-merchant')
})

test('missing or blank configuration leaves Atlos unavailable', async () => {
  const credentials = await resolveAtlosCredentials({}, async () => ({ atlosMerchantId: '  ' }))
  assert.equal(Boolean(credentials.merchantId), false)
})

test('subsequent resolutions reflect saved settings changes and removal', async () => {
  let merchantId = 'test-first-merchant'
  const loadSettings = async () => ({ atlosMerchantId: merchantId })
  assert.equal((await resolveAtlosCredentials({}, loadSettings)).merchantId, merchantId)
  merchantId = 'test-updated-merchant'
  assert.equal((await resolveAtlosCredentials({}, loadSettings)).merchantId, merchantId)
  merchantId = ''
  assert.equal((await resolveAtlosCredentials({}, loadSettings)).merchantId, undefined)
})

test('Atlos is configured only when both non-blank merchantId and apiSecret are present', async () => {
  const both = await resolveAtlosCredentials({
    ATLOS_MERCHANT_ID: 'merchant-123',
    ATLOS_API_SECRET: 'secret-abc',
  }, async () => ({}))
  assert.equal(hasCompleteAtlosCredentials(both), true)

  const missingMerchant = await resolveAtlosCredentials({
    ATLOS_API_SECRET: 'secret-abc',
  }, async () => ({ atlosMerchantId: '   ' }))
  assert.equal(hasCompleteAtlosCredentials(missingMerchant), false)

  const missingSecret = await resolveAtlosCredentials({
    ATLOS_MERCHANT_ID: 'merchant-123',
  }, async () => ({ atlosApiSecret: '   ' }))
  assert.equal(hasCompleteAtlosCredentials(missingSecret), false)

  const missingBoth = await resolveAtlosCredentials({}, async () => ({}))
  assert.equal(hasCompleteAtlosCredentials(missingBoth), false)
})

test('public Atlos endpoints and .env.example do not expose apiSecret or obsolete variable names', () => {
  const configRoute = readFileSync('app/api/atlos/config/route.ts', 'utf8')
  assert.match(configRoute, /isAtlosConfigured\(\)/)
  assert.equal(configRoute.includes('apiSecret'), false)
  assert.equal(configRoute.includes('ATLOS_API_SECRET'), false)

  const libAtlos = readFileSync('lib/atlos.ts', 'utf8')
  assert.match(libAtlos, /hasCompleteAtlosCredentials\(credentials\)/)

  const envExample = readFileSync('.env.example', 'utf8')
  assert.match(envExample, /^ATLOS_MERCHANT_ID=$/m)
  assert.match(envExample, /^ATLOS_API_SECRET=$/m)
  assert.equal(envExample.includes('ATLOS_WEBHOOK_SECRET'), false)
  assert.equal(envExample.includes('NEXT_PUBLIC_ATLOS_MERCHANT_ID'), false)
})

