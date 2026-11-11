import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

const schema = z.object({
  txId: z.string().min(4).max(120),
  proofUrl: z
    .string()
    .max(6_000_000)
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,.+$/i, 'Invalid proof image')
    .optional()
    .nullable(),
})

// Customer submits payment proof: tx id + optional proof (data URL / link) -> review
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const rateLimitResponse = await enforceRateLimit(req, 'orders:proof', 6, 300)
  if (rateLimitResponse) return rateLimitResponse

  const { orderNumber } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const order = (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'pending_payment' && order.status !== 'payment_review') {
    return NextResponse.json({ error: 'Order can no longer be updated' }, { status: 409 })
  }

  const updated = (
    await db
      .update(orders)
      .set({
        txId: parsed.data.txId,
        proofUrl: parsed.data.proofUrl || null,
        status: 'payment_review',
        updatedAt: new Date(),
      })
      .where(eq(orders.orderNumber, orderNumber))
      .returning()
  )[0]

  return NextResponse.json({ order: updated })
}
