import { NextRequest, NextResponse } from 'next/server'
import {
  findAtlosOrder,
  getAtlosCredentials,
  markAtlosOrderPaid,
} from '@/lib/atlos'
import {
  extractAtlosOrderNumber,
  isAtlosPaidStatus,
  validateAtlosPaymentPayload,
  verifyAtlosWebhookSignature,
} from '@/lib/atlos-callback'
import { notifyTelegramPayment } from '@/lib/telegram'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'webhooks:atlos', 600, 60)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature')
    const timestamp = req.headers.get('x-webhook-timestamp')

    const { merchantId, apiSecret } = await getAtlosCredentials()
    if (!merchantId || !apiSecret) {
      console.error('[atlos] Webhook received while merchantId or apiSecret is not configured')
      return NextResponse.json({ error: 'Payment webhook verification is unavailable' }, { status: 503 })
    }

    if (!verifyAtlosWebhookSignature(rawBody, signature, timestamp, apiSecret)) {
      console.warn('[atlos] Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 })
    }
    const record = payload as Record<string, unknown>

    const orderNumber = extractAtlosOrderNumber(record)
    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const status = record.Status !== undefined ? record.Status : record.status
    if (!isAtlosPaidStatus(status)) {
      return NextResponse.json({ ok: true, received: true, paid: false })
    }

    const order = await findAtlosOrder(orderNumber)
    if (!order || order.paymentMethod !== 'ATLOS') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const validation = validateAtlosPaymentPayload(
      record,
      {
        orderNumber: order.orderNumber,
        amountUsd: order.amountUsd,
        status: order.status,
        paymentMethod: order.paymentMethod,
      },
      merchantId,
    )

    if (!validation.ok) {
      console.warn(`[atlos] Webhook rejected for ${orderNumber}: ${validation.error}`)
      return NextResponse.json({ error: validation.error }, { status: validation.statusCode })
    }

    const updated = await markAtlosOrderPaid(order.orderNumber, validation.txId)
    if (!updated) {
      // Duplicate, concurrent, late (processing/completed), or cancelled order: acknowledge safely without mutation or duplicate alerts.
      return NextResponse.json({ ok: true, status: order.status, duplicate: true })
    }

    console.log(`[atlos] Order ${order.orderNumber} marked as PAID. Txid: ${validation.txId || 'N/A'}`)
    try {
      await notifyTelegramPayment(updated, 'Atlos')
    } catch (error) {
      console.error('[telegram] Atlos notification failed', error)
    }
    return NextResponse.json({ ok: true, status: 'paid' })
  } catch (err: unknown) {
    console.error('[atlos] Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
