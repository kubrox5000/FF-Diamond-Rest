import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { packages } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { getAdminSession } from '@/lib/admin-session'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { deleteMockPackage, updateMockPackage } from '@/lib/mock-admin-store'

const schema = z.object({
  diamonds: z.number().int().positive().optional(),
  bonusDiamonds: z.number().int().min(0).optional(),
  priceUsd: z.number().positive().optional(),
  priceUsdt: z.number().positive().optional(),
  discountPct: z.number().int().min(0).max(90).optional(),
  popular: z.boolean().optional(),
  flashSale: z.boolean().optional(),
  deliveryEta: z.string().min(1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const d = parsed.data
  const update: Record<string, unknown> = {}
  if (d.diamonds !== undefined) update.diamonds = d.diamonds
  if (d.bonusDiamonds !== undefined) update.bonusDiamonds = d.bonusDiamonds
  if (d.priceUsd !== undefined) update.priceUsd = d.priceUsd.toFixed(2)
  if (d.priceUsdt !== undefined) update.priceUsdt = d.priceUsdt.toFixed(2)
  if (d.discountPct !== undefined) update.discountPct = d.discountPct
  if (d.popular !== undefined) update.popular = d.popular
  if (d.flashSale !== undefined) update.flashSale = d.flashSale
  if (d.deliveryEta !== undefined) update.deliveryEta = d.deliveryEta
  if (d.active !== undefined) update.active = d.active
  if (d.sortOrder !== undefined) update.sortOrder = d.sortOrder

  if (!isDatabaseConfigured()) {
    const updated = updateMockPackage(Number(id), update)
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ package: updated })
  }

  const updated = (
    await db.update(packages).set(update).where(eq(packages.id, Number(id))).returning()
  )[0]
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  revalidateTag('home', 'seconds')
  return NextResponse.json({ package: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isDatabaseConfigured()) {
    const ok = deleteMockPackage(Number(id))
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }
  await db.delete(packages).where(eq(packages.id, Number(id)))
  revalidateTag('home', 'seconds')
  return NextResponse.json({ ok: true })
}
