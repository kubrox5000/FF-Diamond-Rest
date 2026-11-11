import { NextResponse, type NextRequest } from 'next/server'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { adminRateLimitPolicy } from '@/lib/rate-limit-core'

// Tag the visitor's country from edge/cloud geo headers into a cookie,
// so server components can pick the correct locale and currency immediately.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/admin' || request.nextUrl.pathname.startsWith('/api/admin/')) {
    const policy = adminRateLimitPolicy(request.nextUrl.pathname, request.method)
    const limited = await enforceRateLimit(request, policy.scope, policy.limit, policy.windowSeconds)
    if (limited) return limited
  }

  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-appengine-country') ||
    request.headers.get('x-country-code') ||
    request.headers.get('x-geo-country') ||
    undefined

  if (!country) return NextResponse.next()

  const res = NextResponse.next()
  res.cookies.set('ff_country', country.toUpperCase(), {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
  })
  return res
}

export const config = {
  // Run on page navigations only (skip API, static assets and files with extensions).
  matcher: ['/((?!api/|_next/|.*\\..*).*)', '/api/admin/:path*'],
}
