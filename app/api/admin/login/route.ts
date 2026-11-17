import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPassword, signToken } from '@/lib/auth'
import { ADMIN_COOKIE } from '@/lib/admin-session'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

import { isDatabaseConfigured } from '@/lib/db-ssl'
import { verifyMockAdmin } from '@/lib/mock-admin-store'

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) })

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'admin:login', 5, 300)
  if (rateLimitResponse) return rateLimitResponse

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { username, password } = parsed.data

  // ── Try database first (when DATABASE_URL is configured) ──
  if (isDatabaseConfigured()) {
    try {
      const { db } = await import('@/db')
      const { admins } = await import('@/db/schemas')
      const { eq } = await import('drizzle-orm')

      const admin = (
        await db.select().from(admins).where(eq(admins.username, username)).limit(1)
      )[0]

      if (admin && (await verifyPassword(password, admin.passwordHash))) {
        const token = await signToken({ sub: admin.id, username: admin.username, role: 'admin' })
        const res = NextResponse.json({ ok: true, username: admin.username, token })
        res.cookies.set(ADMIN_COOKIE, token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
        return res
      }
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    } catch {
      // DB unreachable — fall through to env / mock fallback
    }
  }

  // ── Fallback 1: credentials from environment variables ──
  const envUser = process.env.ADMIN_USERNAME
  const envPass = process.env.ADMIN_PASSWORD

  if (envUser && envPass) {
    if (username !== envUser || password !== envPass) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }
    const token = await signToken({ sub: 1, username: envUser, role: 'admin' })
    const res = NextResponse.json({ ok: true, username: envUser, token })
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }

  // ── Fallback 2: in-memory preview admin when neither DB nor env vars are configured ──
  const mockAdmin = await verifyMockAdmin(username, password)
  if (!mockAdmin) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  }

  const token = await signToken({ sub: mockAdmin.id, username: mockAdmin.username, role: 'admin' })
  const res = NextResponse.json({ ok: true, username: mockAdmin.username, token })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
