import { NextResponse, type NextRequest } from 'next/server'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { adminRateLimitPolicy } from '@/lib/rate-limit-core'
import { isValidCountryCode } from '@/lib/currencies'
import {
  DETECTED_COUNTRY_HEADER,
  extractClientIp,
  extractGeoCountryFromHeaders,
  hashIp,
  resolveCountryFromIp,
} from '@/lib/geo-server'

// Tag the visitor's country before Server Components render,
// so the very first HTML byte already matches their language and currency.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/admin' || request.nextUrl.pathname.startsWith('/api/admin/')) {
    const policy = adminRateLimitPolicy(request.nextUrl.pathname, request.method)
    const limited = await enforceRateLimit(request, policy.scope, policy.limit, policy.windowSeconds)
    if (limited) return limited
  }

  const headerCountry = extractGeoCountryFromHeaders(request.headers)
  const rawCookieCountry = request.cookies.get('ff_country')?.value
  const cookieCountry = isValidCountryCode(rawCookieCountry) ? rawCookieCountry.trim().toUpperCase() : undefined
  const cookieIpHash = request.cookies.get('ff_ip_hash')?.value

  const clientIp = extractClientIp(request.headers)
  const currentIpHash = clientIp ? hashIp(clientIp) : undefined

  let country = headerCountry

  if (!country) {
    const ipChanged = Boolean(currentIpHash && cookieIpHash && cookieIpHash !== currentIpHash)
    if (cookieCountry && !ipChanged) {
      country = cookieCountry
    } else if (clientIp) {
      country = await resolveCountryFromIp(clientIp)
    }
  }

  const needsDevCacheReset =
    process.env.NODE_ENV !== 'production' &&
    !request.nextUrl.pathname.startsWith('/api/') &&
    request.cookies.get('ff_dev_cache_reset')?.value !== '2'

  if (!country && !needsDevCacheReset) return NextResponse.next()

  const requestHeaders = new Headers(request.headers)
  if (country) requestHeaders.set(DETECTED_COUNTRY_HEADER, country)

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (needsDevCacheReset) {
    const isHttps =
      request.nextUrl.protocol === 'https:' ||
      request.headers.get('x-forwarded-proto') === 'https'
    res.headers.set('Clear-Site-Data', '"cache"')
    res.cookies.set('ff_dev_cache_reset', '2', {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
    })
  }

  if (country && cookieCountry !== country) {
    res.cookies.set('ff_country', country, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  if (currentIpHash && cookieIpHash !== currentIpHash) {
    res.cookies.set('ff_ip_hash', currentIpHash, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  return res
}

export const config = {
  // Run on page navigations only (skip API, static assets and files with extensions).
  matcher: ['/((?!api/|_next/|.*\\..*).*)', '/api/admin/:path*'],
}
