export const UPSTASH_INCREMENT_WITH_EXPIRY_SCRIPT = "local count=redis.call('INCR',KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {count,redis.call('TTL',KEYS[1])}"

export function hasRedisCredentials(env: Record<string, string | undefined>): boolean {
  return Boolean(
    (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) &&
    (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN),
  )
}

export function resolveTrustedClientIp(headers: Pick<Headers, 'get'>): string | null {
  const ip = headers.get('x-nf-client-connection-ip')?.trim()
    || headers.get('x-real-ip')?.trim()
    || null
  return ip && ip.length <= 64 ? ip : null
}

export interface RateLimitStore {
  incrementWithExpiry(key: string, windowSeconds: number): Promise<{ count: number; ttlSeconds: number }>
}

export interface RateLimitDecision {
  status: 429 | 503
  body: { error: string }
  headers?: Record<string, string>
}

export function unconfiguredRateLimitDecision(): RateLimitDecision {
  return { status: 503, body: { error: 'Rate limiting is not configured' } }
}

export function createRateLimitDecision(store: RateLimitStore) {
  return async (ip: string | null, scope: string, limit: number, windowSeconds = 60): Promise<RateLimitDecision | null> => {
    if (!ip || !ip.trim()) {
      return { status: 503, body: { error: 'Trusted client IP is unavailable' } }
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
      return { status: 503, body: { error: 'Rate limit configuration is invalid' } }
    }

    try {
      const { count, ttlSeconds } = await store.incrementWithExpiry(`rate:${scope}:${ip.trim()}`, windowSeconds)
      if (!Number.isSafeInteger(count) || count < 1) throw new Error('Rate limit store returned an invalid count')
      const retryAfter = Math.max(1, Number.isFinite(ttlSeconds) ? ttlSeconds : windowSeconds)
      const headers = {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(Math.max(0, limit - count)),
      }
      if (count > limit) {
        return { status: 429, body: { error: 'Too many requests. Please try again later.' }, headers }
      }
      return null
    } catch {
      return { status: 503, body: { error: 'Rate limiting is temporarily unavailable' } }
    }
  }
}

export function adminRateLimitPolicy(path: string, method: string): { scope: string; limit: number; windowSeconds: number } {
  const route = path.replace(/^\/api\/admin\/?/, '') || 'root'
  const verb = method.toUpperCase()
  if (/^(database-(connect|migrate|seed|setup))$/.test(route)) {
    return { scope: `admin:${route}:${verb}`, limit: 3, windowSeconds: 300 }
  }
  if (/^(env-file|download-project|orders\/export)$/.test(route)) {
    return { scope: `admin:${route}:${verb}`, limit: 10, windowSeconds: 60 }
  }
  const write = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)
  return { scope: `admin:${route}:${verb}`, limit: write ? 20 : 120, windowSeconds: 60 }
}
