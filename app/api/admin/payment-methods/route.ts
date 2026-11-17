import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { asc } from 'drizzle-orm'
import { getAdminSession } from '@/lib/admin-session'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { createMockPaymentMethod, listMockPaymentMethods } from '@/lib/mock-admin-store'

const schema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  network: z.string().max(80).default(''),
  cat: z.enum(['crypto', 'wallet']).default('wallet'),
  icon: z.string().max(40).default('usdt'),
  walletAddress: z.string().max(200).default(''),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ methods: listMockPaymentMethods() })
  }
  const rows = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder))
  return NextResponse.json({ methods: rows })
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  const d = parsed.data
  if (!isDatabaseConfigured()) {
    try {
      const created = createMockPaymentMethod({
        key: d.key,
        label: d.label,
        network: d.network,
        cat: d.cat,
        icon: d.icon,
        walletAddress: d.walletAddress,
        active: d.active,
        sortOrder: d.sortOrder,
      })
      return NextResponse.json({ method: created })
    } catch {
      return NextResponse.json({ error: 'A payment method with this key already exists' }, { status: 409 })
    }
  }
  let inserted
  try {
    const rows = await db
      .insert(paymentMethods)
      .values({
        key: d.key,
        label: d.label,
        network: d.network,
        cat: d.cat,
        icon: d.icon,
        walletAddress: d.walletAddress,
        active: d.active,
        sortOrder: d.sortOrder,
      })
      .returning()
    inserted = rows[0]
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (/duplicate key|unique/i.test(msg)) {
      return NextResponse.json({ error: 'A payment method with this key already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to save payment method' }, { status: 500 })
  }
  return NextResponse.json({ method: inserted })
}
