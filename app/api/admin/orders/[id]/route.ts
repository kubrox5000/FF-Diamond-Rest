import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { getAdminSession } from '@/lib/admin-session'
import { ORDER_STATUSES } from '@/lib/orders'
import { notifyTelegramPayment } from '@/lib/telegram'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { deleteMockOrderById, getMockOrderById, updateMockOrderById } from '@/lib/mock-orders'

const schema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
  adminNotes: z.string().max(1000).optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const numId = Number(id)
  if (!isDatabaseConfigured()) {
    const current = getMockOrderById(numId)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = updateMockOrderById(numId, {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.adminNotes !== undefined ? { adminNotes: parsed.data.adminNotes } : {}),
    })
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (parsed.data.status === 'completed' && current.status !== 'completed') {
      try { await notifyTelegramPayment(updated, 'Admin') } catch (error) { console.error('[telegram] Admin notification failed', error) }
    }
    return NextResponse.json({ order: updated })
  }

  const current = (await db.select().from(orders).where(eq(orders.id, numId)).limit(1))[0]
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.status) update.status = parsed.data.status
  if (parsed.data.adminNotes !== undefined) update.adminNotes = parsed.data.adminNotes

  const updated = (
    await db.update(orders).set(update).where(eq(orders.id, numId)).returning()
  )[0]
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (parsed.data.status === 'completed' && current.status !== 'completed') {
    try { await notifyTelegramPayment(updated, 'Admin') } catch (error) { console.error('[telegram] Admin notification failed', error) }
  }
  return NextResponse.json({ order: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const numId = Number(id)
  if (!isDatabaseConfigured()) {
    const deleted = deleteMockOrderById(numId)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true, deleted: deleted.id })
  }
  const deleted = (
    await db.delete(orders).where(eq(orders.id, numId)).returning()
  )[0]
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, deleted: deleted.id })
}
