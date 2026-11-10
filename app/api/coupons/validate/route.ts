import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { coupons } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { validateDiscountPct } from '@/lib/orders'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const code = (body?.code ?? '').toString().trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'Enter a code' }, { status: 400 })

  const coupon = (await db.select().from(coupons).where(eq(coupons.code, code)).limit(1))[0]
  const discountPct = validateDiscountPct(coupon?.discountPct)
  if (!coupon || !coupon.active || (coupon.maxUses && coupon.usedCount >= coupon.maxUses) || discountPct === null) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired code' }, { status: 200 })
  }
  return NextResponse.json({ valid: true, discountPct, code: coupon.code })
}
