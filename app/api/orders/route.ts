import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { packages, orders, coupons, paymentMethods } from '@/db/schemas'
import { eq, sql } from 'drizzle-orm'
import { generateOrderNumber, discountedPrice } from '@/lib/orders'
import { getSettings } from '@/lib/settings'
import { HELEKET_KEY, isHeleketConfigured, createHeleketInvoice } from '@/lib/heleket'
import { ATLOS_KEY } from '@/lib/atlos'
import { PLISIO_KEY, createPlisioInvoice, isPlisioConfigured } from '@/lib/plisio'

const createSchema = z.object({
  packageId: z.number().int().positive(),
  playerUid: z.string().min(4).max(32).regex(/^[0-9]+$/, 'UID must be numeric'),
  nickname: z.string().max(40).optional().nullable(),
  server: z.string().min(1).max(40),
  email: z.string().email().optional().nullable().or(z.literal('')),
  country: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  paymentMethod: z.string().min(1).max(60),
  couponCode: z.string().max(40).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const data = parsed.data

  // ── Fetch package + settings + payment method + coupon in parallel ──────────
  const couponCode = data.couponCode ? data.couponCode.trim().toUpperCase() : null

  const [pkgRows, settingsData, pmRows, couponRows] = await Promise.all([
    db.select().from(packages).where(eq(packages.id, data.packageId)).limit(1),
    getSettings(),
    db.select().from(paymentMethods).where(eq(paymentMethods.key, data.paymentMethod)).limit(1),
    couponCode
      ? db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1)
      : Promise.resolve([] as typeof coupons.$inferSelect[]),
  ])

  const pkg = pkgRows[0]
  if (!pkg || !pkg.active) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // ── Apply coupon (if valid) ───────────────────────────────────────────────
  let baseUsd  = discountedPrice(pkg.priceUsd,  pkg.discountPct)
  let baseUsdt = discountedPrice(pkg.priceUsdt, pkg.discountPct)
  let appliedCoupon: string | null = null

  const coupon = couponRows[0]
  if (couponCode && coupon && coupon.active && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
    baseUsd   = +(baseUsd  * (1 - coupon.discountPct / 100)).toFixed(2)
    baseUsdt  = +(baseUsdt * (1 - coupon.discountPct / 100)).toFixed(2)
    appliedCoupon = couponCode
    // Fire coupon usage increment without blocking the response
    void db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.id, coupon.id))
  }

  const allowedMethods = new Set(['USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'])
  const selectedPaymentMethod = pmRows[0]
  if (!allowedMethods.has(data.paymentMethod) || (selectedPaymentMethod && !selectedPaymentMethod.active)) {
    return NextResponse.json({ error: 'This payment method is not currently available' }, { status: 400 })
  }

  // ── Resolve wallet address ────────────────────────────────────────────────
  const WALLETS: Record<string, string | undefined> = {
    USDT_TRC20:  settingsData.walletTrc20,
    USDT_BEP20:  settingsData.walletBep20,
    BINANCE_PAY: settingsData.binancePayId,
    BTC:         settingsData.walletBtc,
    ETH:         settingsData.walletEth,
    BNB:         settingsData.walletBnb,
    USDC:        settingsData.walletUsdc,
    SOL:         settingsData.walletSol,
    WISE:        settingsData.paymentWise,
    PAYONEER:    settingsData.paymentPayoneer,
    SKRILL:      settingsData.paymentSkrill,
    NETELLER:    settingsData.paymentNeteller,
    REDOTPAY:    settingsData.paymentRedotpay,
    BYBIT:       settingsData.paymentBybit,
    REVOLUT:     settingsData.paymentRevolut,
  }

  let walletAddress = pmRows[0]?.walletAddress?.trim() || (WALLETS[data.paymentMethod] ?? '')
  const orderNumber = generateOrderNumber()
  const trackingToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  // ── Heleket: create a hosted invoice; its URL is the payment destination ──
  let heleketUuid: string | null = null
  if (data.paymentMethod === HELEKET_KEY) {
    if (!isHeleketConfigured()) {
      return NextResponse.json({ error: 'Heleket payments are not configured' }, { status: 503 })
    }
    try {
      const invoice = await createHeleketInvoice({
        orderNumber,
        amountUsdt: baseUsdt.toFixed(2),
        origin: req.nextUrl.origin,
      })
      walletAddress = invoice.url
      heleketUuid = invoice.uuid
    } catch (e) {
      console.error('[heleket] invoice creation failed', e)
      return NextResponse.json({ error: 'Could not create the payment invoice. Please try again.' }, { status: 502 })
    }
  }

  // ── Atlos: payments are processed via Atlos checkout widget ──
  if (data.paymentMethod === ATLOS_KEY) {
    walletAddress = 'ATLOS_CHECKOUT'
  }

  // ── Plisio: create a hosted invoice before saving the order ────────────────
  let plisioUrl: string | null = null
  let plisioTxnId: string | null = null
  if (data.paymentMethod === PLISIO_KEY) {
    if (!isPlisioConfigured()) return NextResponse.json({ error: 'Plisio payments are not configured' }, { status: 503 })
    try {
      const invoice = await createPlisioInvoice({ orderNumber, amountUsd: baseUsd.toFixed(2), callbackUrl: `${req.nextUrl.origin}/api/plisio/webhook`, email: data.email })
      plisioUrl = invoice.url
      plisioTxnId = invoice.txnId
      walletAddress = invoice.url
    } catch (e) {
      console.error('[plisio] invoice creation failed', e)
      return NextResponse.json({ error: 'Could not create the Plisio invoice. Please try again.' }, { status: 502 })
    }
  }

  // Gift diamonds start at 50 for package one and increase by 50 per package.
  const giftDiamonds = pkg.bonusDiamonds > 0 ? pkg.bonusDiamonds : pkg.sortOrder * 50

  // ── Insert order ──────────────────────────────────────────────────────────
  const inserted = (
    await db
      .insert(orders)
      .values({
        orderNumber,
        trackingToken,
        packageId:     pkg.id,
        diamonds:      pkg.diamonds + giftDiamonds,
        playerUid:     data.playerUid,
        nickname:      data.nickname || null,
        server:        data.server,
        email:         data.email || null,
        country:       data.country || null,
        phone:         data.phone || null,
        amountUsd:     baseUsd.toFixed(2),
        amountUsdt:    baseUsdt.toFixed(2),
        paymentMethod: data.paymentMethod,
        walletAddress,
        txId:          heleketUuid || plisioTxnId,
        couponCode:    appliedCoupon,
        status:        'pending_payment',
      })
      .returning()
  )[0]

  return NextResponse.json({
    order: inserted,
    trackingToken,
    paymentUrl: heleketUuid || plisioUrl ? walletAddress : null,
  })
}
