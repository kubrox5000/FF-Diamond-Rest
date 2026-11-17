import { NextResponse } from 'next/server'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { sql, eq, desc } from 'drizzle-orm'
import { getAdminSession } from '@/lib/admin-session'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { getMockOrderStats } from '@/lib/mock-orders'

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDatabaseConfigured()) {
    return NextResponse.json(getMockOrderStats())
  }

  await ensureOrdersSchema()

  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfMonth = new Date(now)
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

  // The postgres driver requires string params, not Date objects.
  const daySql = startOfDay.toISOString()
  const weekSql = startOfWeek.toISOString()
  const monthSql = startOfMonth.toISOString()
  const paid = sql`${orders.status} in ('paid','processing','completed')`

  const sumSince = (d: string | null) =>
    db
      .select({ sum: sql<number>`coalesce(sum(${orders.amountUsd}), 0)` })
      .from(orders)
      .where(d ? sql`${paid} and ${orders.createdAt} >= ${d}` : paid)

  const [todayOrders, revenueRow, revenueTodayRow, revenueWeekRow, revenueMonthRow, pendingRow, completedRow, cancelledRow, totalRow] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(orders).where(sql`${orders.createdAt} >= ${daySql}`),
    sumSince(null),
    sumSince(daySql),
    sumSince(weekSql),
    sumSince(monthSql),
    db.select({ c: sql<number>`count(*)` }).from(orders).where(sql`${orders.status} in ('pending_payment','payment_review')`),
    db.select({ c: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'completed')),
    db.select({ c: sql<number>`count(*)` }).from(orders).where(eq(orders.status, 'cancelled')),
    db.select({ c: sql<number>`count(*)` }).from(orders),
  ])

  const sum = (row?: { sum: number | string | null }[] | { sum: number | string | null }) =>
    Number(Array.isArray(row) ? row[0]?.sum : row?.sum ?? 0) || 0
  const cnt = (row: { c: number | string | bigint }[]) => Number(row[0]?.c ?? 0)

  // Daily revenue last 14 days
  const daily = await db.execute(sql`
    SELECT to_char(date_trunc('day', created_at), 'MM-DD') AS day,
           coalesce(sum(case when status in ('paid','processing','completed') then amount_usd else 0 end), 0) AS revenue,
           count(*) AS orders
    FROM orders
    WHERE created_at >= now() - interval '14 days'
    GROUP BY 1 ORDER BY 1
  `)

  // Monthly revenue last 6 months
  const monthly = await db.execute(sql`
    SELECT to_char(date_trunc('month', created_at), 'Mon') AS month,
           coalesce(sum(case when status in ('paid','processing','completed') then amount_usd else 0 end), 0) AS revenue
    FROM orders
    WHERE created_at >= now() - interval '6 months'
    GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at)
  `)

  // Top selling packages
  const top = await db.execute(sql`
    SELECT o.package_id, p.diamonds, count(*) AS sold
    FROM orders o JOIN packages p ON p.id = o.package_id
    WHERE o.status in ('paid','processing','completed')
    GROUP BY o.package_id, p.diamonds
    ORDER BY sold DESC LIMIT 6
  `)

  const recent = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6)

  return NextResponse.json({
    stats: {
      todayOrders: cnt(todayOrders),
      revenue: sum(revenueRow),
      revenueToday: sum(revenueTodayRow),
      revenueWeek: sum(revenueWeekRow),
      revenueMonth: sum(revenueMonthRow),
      pending: cnt(pendingRow),
      completed: cnt(completedRow),
      cancelled: cnt(cancelledRow),
      total: cnt(totalRow),
    },
    daily: (daily as unknown as { day: string; revenue: string; orders: string }[]).map((r) => ({
      day: r.day,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    })),
    monthly: (monthly as unknown as { month: string; revenue: string }[]).map((r) => ({
      month: r.month,
      revenue: Number(r.revenue),
    })),
    top: (top as unknown as { diamonds: number; sold: string }[]).map((r) => ({
      name: `${r.diamonds} 💎`,
      sold: Number(r.sold),
    })),
    recent,
  })
}