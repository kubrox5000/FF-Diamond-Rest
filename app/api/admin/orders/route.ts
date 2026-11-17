import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { desc, eq, or, ilike, and, SQL } from 'drizzle-orm'
import { getAdminSession } from '@/lib/admin-session'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { deleteMockOrders, listMockOrders } from '@/lib/mock-orders'

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')?.trim()
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ orders: listMockOrders({ status, q }) })
  }

  await ensureOrdersSchema()

  const conditions: SQL[] = []
  if (status && status !== 'all') conditions.push(eq(orders.status, status))
  if (q) {
    conditions.push(
      or(ilike(orders.orderNumber, `%${q}%`), ilike(orders.playerUid, `%${q}%`), ilike(orders.txId, `%${q}%`))!,
    )
  }

  const where = conditions.length ? and(...conditions) : undefined
  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(200)

  return NextResponse.json({ orders: rows })
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')?.trim()
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!isDatabaseConfigured()) {
    const count = deleteMockOrders({ status, q })
    return NextResponse.json({ ok: true, count })
  }

  await ensureOrdersSchema()

  const conditions: SQL[] = []
  if (status && status !== 'all') conditions.push(eq(orders.status, status))
  if (q) {
    conditions.push(
      or(ilike(orders.orderNumber, `%${q}%`), ilike(orders.playerUid, `%${q}%`), ilike(orders.txId, `%${q}%`))!,
    )
  }

  const where = conditions.length ? and(...conditions) : undefined
  const deleted = await db.delete(orders).where(where).returning({ id: orders.id })
  return NextResponse.json({ ok: true, count: deleted.length })
}
