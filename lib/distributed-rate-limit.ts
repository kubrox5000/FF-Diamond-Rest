import 'server-only'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'
import { createRateLimitDecision, hasRedisCredentials, unconfiguredRateLimitDecision, UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT, resolveTrustedClientIp, type RateLimitStore } from '@/lib/rate-limit-core'

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
    const decision = unconfiguredRateLimitDecision()
    return NextResponse.json(decision.body, { status: decision.status })
  }
  return createRateLimitGuard(store)(requestIp(request), scope, limit, windowSeconds)
}
