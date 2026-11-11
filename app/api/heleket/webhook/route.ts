import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { HELEKET_KEY, verifyWebhookSign, syncHeleketOrder } from '@/lib/heleket'
import { notifyTelegramPayment } from '@/lib/telegram'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

export const dynamic = 'force-dynamic'

// Heleket payment webhook. The signature is checked, then the invoice status is
// re-read from the Heleket API so the order is only updated from trusted data.
export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'webhooks:heleket', 600, 60)
  if (rateLimitResponse) return rateLimitResponse

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!payload || typeof payload.order_id !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!verifyWebhookSign(payload)) {
    console.warn('[heleket] webhook signature mismatch for', payload.order_id)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const order = (
    await db.select().from(orders).where(eq(orders.orderNumber, payload.order_id)).limit(1)
  )[0]
  if (!order || order.paymentMethod !== HELEKET_KEY) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  try {
    const updated = await syncHeleketOrder(order)
    if (updated.status === 'paid' && order.status !== 'paid') {
      try { await notifyTelegramPayment(updated, 'Heleket') } catch (error) { console.error('[telegram] Heleket notification failed', error) }
    }
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e) {
    console.error('[heleket] webhook sync failed', e)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
