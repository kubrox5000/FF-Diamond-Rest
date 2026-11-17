import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { getAdminSession } from '@/lib/admin-session'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { deleteMockPaymentMethod, updateMockPaymentMethod } from '@/lib/mock-admin-store'

const schema = z.object({
  key: z.string().min(1).max(60).optional(),
  label: z.string().min(1).max(80).optional(),
  network: z.string().max(80).optional(),
  cat: z.enum(['crypto', 'wallet']).optional(),
  icon: z.string().max(40).optional(),
  walletAddress: z.string().max(200).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const d = parsed.data

  const update: Record<string, unknown> = {}
  if (d.key !== undefined) update.key = d.key
  if (d.label !== undefined) update.label = d.label
  if (d.network !== undefined) update.network = d.network
  if (d.cat !== undefined) update.cat = d.cat
  if (d.icon !== undefined) update.icon = d.icon
  if (d.walletAddress !== undefined) update.walletAddress = d.walletAddress
  if (d.active !== undefined) update.active = d.active
  if (d.sortOrder !== undefined) update.sortOrder = d.sortOrder

  if (!isDatabaseConfigured()) {
    try {
      const updated = updateMockPaymentMethod(Number(id), update)
      if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ method: updated })
    } catch {
      return NextResponse.json({ error: 'A payment method with this key already exists' }, { status: 409 })
    }
  }

  let updated
  try {
    const rows = await db
      .update(paymentMethods)
      .set(update)
      .where(eq(paymentMethods.id, Number(id)))
      .returning()
    updated = rows[0]
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ error: 'A payment method with this key already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ method: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isDatabaseConfigured()) {
    const ok = deleteMockPaymentMethod(Number(id))
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
  await db.delete(paymentMethods).where(eq(paymentMethods.id, Number(id)))
  return NextResponse.json({ ok: true })
}
