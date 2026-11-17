import 'server-only'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'
import { createRateLimitDecision, hasRedisCredentials, UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT, resolveTrustedClientIp, type RateLimitStore } from '@/lib/rate-limit-core'

export function createRateLimitGuard(store: RateLimitStore) {
  const decide = createRateLimitDecision(store)
  return async (ip: string | null, scope: string, limit: number, windowSeconds = 60): Promise<NextResponse | null> => {
    try {
      const decision = await decide(ip, scope, limit, windowSeconds)
      return decision ? NextResponse.json(decision.body, { status: decision.status, headers: decision.headers }) : null
    } catch (error) {
      console.error('[rate-limit] shared provider unavailable', error)
      return NextResponse.json({ error: 'Rate limiting is temporarily unavailable' }, { status: 503 })
    }
  }
}

let redis: Redis | null | undefined

function getRedisStore(): RateLimitStore | null {
  if (redis === undefined) {
    if (!hasRedisCredentials(process.env)) {
      redis = null
    } else {
      const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!
      const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!
      redis = new Redis({ url, token })
    }
  }
  if (!redis) return null

  const client = redis
  return {
    async incrementWithExpiry(key, windowSeconds) {
      const result = await client.eval(
        UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT,
        [key],
        [windowSeconds, windowSeconds],
      ) as [number | string, number | string]
      return { count: Number(result[0]), ttlSeconds: Number(result[1]) }
    },
  }
}

// In-memory fallback store when Redis/KV credentials are not configured
const memoryRateLimitMap = new Map<string, { count: number; expiresAt: number }>()

const memoryStore: RateLimitStore = {
  async incrementWithExpiry(key, windowSeconds) {
    const now = Date.now()
    const existing = memoryRateLimitMap.get(key)
    if (existing && existing.expiresAt > now) {
      existing.count += 1
      return { count: existing.count, ttlSeconds: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)) }
    }
    const expiresAt = now + windowSeconds * 1000
    memoryRateLimitMap.set(key, { count: 1, expiresAt })
    if (memoryRateLimitMap.size > 5000) {
      for (const [k, v] of memoryRateLimitMap) {
        if (v.expiresAt <= now) memoryRateLimitMap.delete(k)
      }
    }
    return { count: 1, ttlSeconds: windowSeconds }
  },
}

export function requestIp(request: Pick<NextRequest, 'headers'>): string | null {
  // Trust only hosting-edge client IP headers; generic forwarded-for is client-controlled.
  return resolveTrustedClientIp(request.headers)
}

export async function enforceRateLimit(
  request: Pick<NextRequest, 'headers'>,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<NextResponse | null> {
  const store = getRedisStore()
  if (!store) {
    const fallbackIp =
      requestIp(request) ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '127.0.0.1'
    return createRateLimitGuard(memoryStore)(fallbackIp, scope, limit, windowSeconds)
  }
  return createRateLimitGuard(store)(requestIp(request), scope, limit, windowSeconds)
}
