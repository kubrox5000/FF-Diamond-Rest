import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { and, eq } from 'drizzle-orm'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { authorizeMarkReviewed, publicOrderDetails } from '@/lib/order-access'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { getMockOrder, transitionMockOrderStatus } from '@/lib/mock-orders'

// Customer finished payment flow → move pending order into review (requires private tracking token).
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const rateLimitResponse = await enforceRateLimit(req, 'orders:review', 6, 300)
  if (rateLimitResponse) return rateLimitResponse

  const token = req.headers.get('x-order-tracking-token')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderNumber } = await params
  const dbReady = isDatabaseConfigured()
  if (dbReady) await ensureOrdersSchema()

  const order = dbReady
    ? (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
    : getMockOrder(orderNumber)

  const auth = authorizeMarkReviewed(order, token)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
  }

  if (!auth.shouldTransition) {
    return NextResponse.json({ order: publicOrderDetails(order!) })
  }

  const updated = dbReady
    ? (
        await db
          .update(orders)
          .set({ status: 'payment_review', updatedAt: new Date() })
          .where(and(eq(orders.orderNumber, orderNumber), eq(orders.status, 'pending_payment')))
          .returning()
      )[0]
    : transitionMockOrderStatus(orderNumber, ['pending_payment'], { status: 'payment_review' })

  return NextResponse.json({ order: publicOrderDetails(updated ?? order!) })
}
