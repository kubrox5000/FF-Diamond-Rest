import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { hasValidTrackingToken, publicOrderDetails } from '@/lib/order-access'

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const rateLimitResponse = await enforceRateLimit(req, 'orders:lookup', 30, 60)
  if (rateLimitResponse) return rateLimitResponse

  const { orderNumber } = await params
  const token = req.headers.get('x-order-tracking-token')
  const order = (
    await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)
  )[0]
  if (!order || !hasValidTrackingToken(order.trackingToken, token)) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  return NextResponse.json({ order: publicOrderDetails(order) })
}
