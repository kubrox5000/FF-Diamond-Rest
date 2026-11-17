import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { admins } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword, signToken } from '@/lib/auth'
import { getAdminSession, ADMIN_COOKIE } from '@/lib/admin-session'

import { isDatabaseConfigured } from '@/lib/db-ssl'
import { getMockAdmin, updateMockAdmin, verifyMockAdmin } from '@/lib/mock-admin-store'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newUsername: z.string().min(3).max(32).optional(),
  newPassword: z.string().min(6).optional(),
})

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ username: session.username })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  if (!isDatabaseConfigured()) {
    const envUser = process.env.ADMIN_USERNAME
    const envPass = process.env.ADMIN_PASSWORD
    if (envUser && envPass) {
      return NextResponse.json(
        { error: 'Admin credentials are managed via environment variables while no database is connected.' },
        { status: 400 },
      )
    }
    const current = await getMockAdmin()
    const valid = await verifyMockAdmin(current.username, parsed.data.currentPassword)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    const updated = await updateMockAdmin({
      username: parsed.data.newUsername,
      newPassword: parsed.data.newPassword,
    })
    const token = await signToken({ sub: session.id, username: updated.username, role: 'admin' })
    const res = NextResponse.json({ ok: true, username: updated.username, token })
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }

  const admin = (
    await db.select().from(admins).where(eq(admins.id, session.id)).limit(1)
  )[0]
  if (!admin) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  if (!(await verifyPassword(parsed.data.currentPassword, admin.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  let finalUsername = admin.username
  const updates: Partial<typeof admin> = {}

  if (parsed.data.newUsername && parsed.data.newUsername !== admin.username) {
    const conflict = (
      await db.select({ id: admins.id }).from(admins).where(eq(admins.username, parsed.data.newUsername)).limit(1)
    )[0]
    if (conflict) return NextResponse.json({ error: 'That username is already in use' }, { status: 409 })
    updates.username = parsed.data.newUsername
    finalUsername = parsed.data.newUsername
  }

  if (parsed.data.newPassword) {
    updates.passwordHash = await hashPassword(parsed.data.newPassword)
  }

  if (Object.keys(updates).length > 0) {
    await db.update(admins).set(updates).where(eq(admins.id, session.id))
  }

  // Refresh the session cookie so the stored username stays current.
  const token = await signToken({ sub: session.id, username: finalUsername, role: 'admin' })
  const res = NextResponse.json({ ok: true, username: finalUsername, token })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}