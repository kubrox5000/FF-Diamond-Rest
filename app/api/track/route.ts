import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { and, eq } from 'drizzle-orm'

// Track by order number OR player UID
export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get('order')?.trim()
  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!orderNumber || !token || !/^[A-Za-z0-9]{32,80}$/.test(token)) {
    return NextResponse.json({ error: 'Order number and private tracking token are required' }, { status: 400 })
  }

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      packageId: orders.packageId,
      diamonds: orders.diamonds,
      server: orders.server,
      amountUsd: orders.amountUsd,
      paymentMethod: orders.paymentMethod,
      status: orders.status,
      adminNotes: orders.adminNotes,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.trackingToken, token)))
    .limit(1)

  return NextResponse.json({ orders: rows })
}
