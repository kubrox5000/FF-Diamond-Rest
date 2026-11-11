import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { getSettings } from '@/lib/settings'
import { notifyTelegramPayment } from '@/lib/telegram'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { allowedPlisioSourceStatuses, getPlisioOrderTransition, matchesPlisioOrderAmount, verifyPlisioCallback, type PlisioCallback } from '@/lib/plisio-callback'

export const dynamic = 'force-dynamic'

function parseCallback(rawBody: string, contentType: string): { data: PlisioCallback; format: 'json' | 'form' } | null {
  try {
    if (contentType.includes('application/json')) {
      const value = JSON.parse(rawBody)
      return value && typeof value === 'object' && !Array.isArray(value)
        ? { data: value as PlisioCallback, format: 'json' }
        : null
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams(rawBody)
      const data: Record<string, string> = {}
      for (const [key, value] of params) {
        if (key in data) return null
        data[key] = value
      }
      return { data, format: 'form' }
    }
  } catch {
    return null
  }
  return null
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'webhooks:plisio', 600, 60)
  if (rateLimitResponse) return rateLimitResponse

  const rawBody = await req.text()
  const callback = parseCallback(rawBody, req.headers.get('content-type') ?? '')
  if (!callback) return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 })

  const settings = await getSettings()
  const secret = settings.plisioApiKey || process.env.PLISIO_API_KEY
  if (!secret) return NextResponse.json({ error: 'Payment callback verification is unavailable' }, { status: 503 })
  if (!verifyPlisioCallback(callback.data, secret, callback.format)) {
    return NextResponse.json({ error: 'Invalid callback signature' }, { status: 401 })
  }

  const orderNumber = typeof callback.data.order_number === 'string' ? callback.data.order_number : ''
  const status = typeof callback.data.status === 'string' ? callback.data.status : ''
  const txnId = typeof callback.data.txn_id === 'string' ? callback.data.txn_id : null
  const transition = getPlisioOrderTransition(status)
  if (!orderNumber || !transition && !['pending', 'new', 'processing'].includes(status)) {
    return NextResponse.json({ error: 'Invalid callback reference or status' }, { status: 400 })
  }

  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
  if (!order || order.paymentMethod !== 'PLISIO') {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (transition === 'paid' && !matchesPlisioOrderAmount(callback.data, order.amountUsd)) {
    return NextResponse.json({ error: 'Payment amount or currency does not match order' }, { status: 400 })
  }

  if (!transition) return NextResponse.json({ ok: true, status: order.status })

  const allowedFrom = allowedPlisioSourceStatuses(transition)
  const updated = (await db.update(orders)
    .set({ status: transition, txId: txnId || order.txId, updatedAt: new Date() })
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.paymentMethod, 'PLISIO'), inArray(orders.status, allowedFrom)))
    .returning())[0]

  if (updated?.status === 'paid') {
    try { await notifyTelegramPayment(updated, 'Plisio') } catch (error) { console.error('[telegram] Plisio notification failed', error) }
  }
  // A verified duplicate or stale callback is acknowledged, but cannot change a terminal order.
  return NextResponse.json({ ok: true, status: updated?.status ?? order.status })
}
