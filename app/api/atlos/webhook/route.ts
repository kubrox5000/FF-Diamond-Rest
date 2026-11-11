import { NextRequest, NextResponse } from 'next/server'
import { verifyAtlosWebhook, markAtlosOrderPaid } from '@/lib/atlos'
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

    if (!(await verifyAtlosWebhook(rawBody, signature, timestamp))) {
      console.warn('[atlos] Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Atlos sends OrderId or order_id or Id
    const orderNumber = String(
      payload.OrderId ||
      payload.orderId ||
      payload.order_id ||
      payload.Id ||
      ''
    ).trim()

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    const txId = typeof payload.Txid === 'string' ? payload.Txid : typeof payload.txId === 'string' ? payload.txId : undefined
    const status = payload.Status !== undefined ? payload.Status : payload.status

    // In Atlos, Status 100 or 'confirmed' or 'completed' means success
    const isPaid =
      status === 100 ||
      status === '100' ||
      status === 'completed' ||
      status === 'confirmed' ||
      status === 'paid'

    if (isPaid) {
      const updated = await markAtlosOrderPaid(orderNumber, txId)
      if (updated) {
        console.log(`[atlos] Order ${orderNumber} marked as PAID. Txid: ${txId || 'N/A'}`)
        try { await notifyTelegramPayment(updated, 'Atlos') } catch (error) { console.error('[telegram] Atlos notification failed', error) }
        return NextResponse.json({ ok: true, status: 'paid' })
      }
    }

    return NextResponse.json({ ok: true, received: true })
  } catch (err: unknown) {
    console.error('[atlos] Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
