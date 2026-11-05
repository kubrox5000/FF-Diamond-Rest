import 'server-only'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'

let redis: Redis | null | undefined

function getRedis() {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

export function requestIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<NextResponse | null> {
  const client = getRedis()
  if (!client) {
    return NextResponse.json({ error: 'Rate limiting is not configured' }, { status: 503 })
  }

  const key = `rate:${scope}:${requestIp(request)}`
  try {
    const count = await client.incr(key)
    if (count === 1) await client.expire(key, windowSeconds)
    const reset = windowSeconds
    if (count > limit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(reset), 'X-RateLimit-Remaining': '0' } },
      )
    }
    return null
  } catch (error) {
    console.error('[rate-limit] shared provider unavailable', error)
    return NextResponse.json({ error: 'Rate limiting is temporarily unavailable' }, { status: 503 })
  }
}
