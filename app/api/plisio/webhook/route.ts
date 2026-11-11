import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { notifyTelegramPayment } from '@/lib/telegram'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

const paidStatuses = new Set(['completed', 'mismatch'])

export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'webhooks:plisio', 600, 60)
  if (rateLimitResponse) return rateLimitResponse

  const payload = await req.json().catch(() => null) as Record<string, unknown> | null
  const orderNumber = typeof payload?.order_number === 'string' ? payload.order_number : ''
  const status = typeof payload?.status === 'string' ? payload.status : ''
  const txnId = typeof payload?.txn_id === 'string' ? payload.txn_id : null
  if (!orderNumber || !status) return NextResponse.json({ error: 'Invalid callback' }, { status: 400 })

  const nextStatus = paidStatuses.has(status) ? 'paid' : status === 'cancelled' || status === 'expired' ? 'cancelled' : 'pending_payment'
  const current = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
  const updated = (await db.update(orders).set({ status: nextStatus, txId: txnId, updatedAt: new Date() }).where(eq(orders.orderNumber, orderNumber)).returning())[0]
  if (updated && nextStatus === 'paid' && current?.status !== 'paid') {
    try { await notifyTelegramPayment(updated, 'Plisio') } catch (error) { console.error('[telegram] Plisio notification failed', error) }
  }
  return NextResponse.json({ ok: true })
}
