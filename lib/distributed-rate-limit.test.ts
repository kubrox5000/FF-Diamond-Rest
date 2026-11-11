import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { adminRateLimitPolicy, createRateLimitDecision, hasRedisCredentials, resolveTrustedClientIp, unconfiguredRateLimitDecision, UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT, type RateLimitStore } from './rate-limit-core'

class MemoryStore implements RateLimitStore {
  private values = new Map<string, { count: number; expiresAt: number }>()
  now = 1_000

  async incrementWithExpiry(key: string, windowSeconds: number) {
    const existing = this.values.get(key)
    if (existing && existing.expiresAt > this.now) {
      existing.count += 1
      return { count: existing.count, ttlSeconds: Math.ceil((existing.expiresAt - this.now) / 1000) }
    }
    const entry = { count: 1, expiresAt: this.now + windowSeconds * 1000 }
    this.values.set(key, entry)
    return { count: 1, ttlSeconds: windowSeconds }
  }
}

test('rate limiter allows within limit and returns 429 with Retry-After after limit', async () => {
  const store = new MemoryStore()
  const decide = createRateLimitDecision(store)
  assert.equal(await decide('203.0.113.2', 'coupon', 2, 15), null)
  assert.equal(await decide('203.0.113.2', 'coupon', 2, 15), null)
  const blocked = await decide('203.0.113.2', 'coupon', 2, 15)
  assert.equal(blocked?.status, 429)
  assert.equal(blocked?.headers?.['Retry-After'], '15')
  assert.equal(blocked?.headers?.['X-RateLimit-Remaining'], '0')
})

test('concurrent calls share a single counter and expiration resets the window', async () => {
  const store = new MemoryStore()
  const decide = createRateLimitDecision(store)
  const parallel = await Promise.all(Array.from({ length: 12 }, () => decide('192.0.2.1', 'orders', 5, 10)))
  assert.equal(parallel.filter((result) => result?.status === 429).length, 7)
  store.now += 10_001
  assert.equal(await decide('192.0.2.1', 'orders', 5, 10), null)
})

test('Redis failure and missing trusted IP fail closed', async () => {
  const brokenStore: RateLimitStore = { incrementWithExpiry: async () => { throw new Error('redis offline') } }
  const decide = createRateLimitDecision(brokenStore)
  assert.equal((await decide('198.51.100.1', 'admin', 2))?.status, 503)
  assert.equal((await decide(null, 'admin', 2))?.status, 503)
})

test('only hosting-edge client IP headers are trusted', () => {
  const spoofed = new Headers({ 'x-forwarded-for': '203.0.113.99' })
  assert.equal(resolveTrustedClientIp(spoofed), null)
  assert.equal(resolveTrustedClientIp(new Headers({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2')
  assert.equal(resolveTrustedClientIp(new Headers({ 'x-nf-client-connection-ip': '192.0.2.3' })), '192.0.2.3')
})

test('KV credentials are recognized without requiring alternate names', () => {
  assert.equal(hasRedisCredentials({ KV_REST_API_URL: 'url', KV_REST_API_TOKEN: 'token' }), true)
  assert.equal(hasRedisCredentials({ UPSTASH_REDIS_REST_URL: 'url', UPSTASH_REDIS_REST_TOKEN: 'token' }), true)
  assert.equal(hasRedisCredentials({ KV_REST_API_URL: 'url' }), false)
  assert.equal(unconfiguredRateLimitDecision().status, 503)
  assert.match(UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT, /INCR[\s\S]*EXPIRE/)
})

test('sensitive route handlers use distributed guards and admin proxy has route-specific policies', () => {
  const guardedRoutes = [
    'app/api/coupons/validate/route.ts',
    'app/api/track/route.ts',
    'app/api/orders/route.ts',
    'app/api/orders/[orderNumber]/route.ts',
    'app/api/orders/[orderNumber]/proof/route.ts',
    'app/api/orders/[orderNumber]/mark-reviewed/route.ts',
    'app/api/atlos/config/route.ts',
    'app/api/atlos/webhook/route.ts',
    'app/api/plisio/webhook/route.ts',
    'app/api/heleket/webhook/route.ts',
  ]
  for (const path of guardedRoutes) {
    assert.match(readFileSync(path, 'utf8'), /enforceRateLimit/)
  }
  const proxy = readFileSync('proxy.ts', 'utf8')
  assert.match(proxy, /\/api\/admin\/:path\*/)
  assert.deepEqual(adminRateLimitPolicy('/api/admin/database-migrate', 'POST'), {
    scope: 'admin:database-migrate:POST', limit: 3, windowSeconds: 300,
  })
  assert.equal(adminRateLimitPolicy('/api/admin/orders', 'GET').limit, 120)
  assert.equal(adminRateLimitPolicy('/api/admin/orders', 'DELETE').limit, 20)
})
