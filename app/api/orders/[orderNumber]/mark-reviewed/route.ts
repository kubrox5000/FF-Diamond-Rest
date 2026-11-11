import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

// Customer finished the card OTP verification → move order into review.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const rateLimitResponse = await enforceRateLimit(req, 'orders:review', 6, 300)
  if (rateLimitResponse) return rateLimitResponse

  const { orderNumber } = await params

  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'pending_payment') {
    return NextResponse.json({ order })
  }

  const updated = (
    await db
      .update(orders)
      .set({ status: 'payment_review', updatedAt: new Date() })
      .where(eq(orders.orderNumber, orderNumber))
      .returning()
  )[0]

  return NextResponse.json({ order: updated })
}
