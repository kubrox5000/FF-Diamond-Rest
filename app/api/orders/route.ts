import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { packages, orders, coupons, paymentMethods } from '@/db/schemas'
import { eq, sql } from 'drizzle-orm'
import { discountedCents, generateOrderNumber } from '@/lib/orders'
import { getOfficialPackage } from '@/lib/package-catalog'
import { getSettings } from '@/lib/settings'
import { HELEKET_KEY, isHeleketConfigured, createHeleketInvoice } from '@/lib/heleket'
import { ATLOS_KEY, isAtlosConfigured } from '@/lib/atlos'
import { PLISIO_KEY, createPlisioInvoice, isPlisioConfigured } from '@/lib/plisio'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { createMockOrder } from '@/lib/mock-orders'
import {
  findMockCoupon,
  getMockPackage,
  incrementMockCouponUsage,
  listMockPaymentMethods,
} from '@/lib/mock-admin-store'

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
  const rateLimitResponse = await enforceRateLimit(req, 'orders:create', 10, 60)
  if (rateLimitResponse) return rateLimitResponse

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const data = parsed.data

  // ── Fetch package + settings + payment method + coupon in parallel ──────────
  const couponCode = data.couponCode ? data.couponCode.trim().toUpperCase() : null
  const dbReady = isDatabaseConfigured()

  const [pkgRows, settingsData, pmRows, couponRows] = await Promise.all([
    dbReady
      ? db.select().from(packages).where(eq(packages.id, data.packageId)).limit(1)
      : Promise.resolve([] as typeof packages.$inferSelect[]),
    getSettings(),
    dbReady
      ? db.select().from(paymentMethods).where(eq(paymentMethods.key, data.paymentMethod)).limit(1)
      : Promise.resolve([] as typeof paymentMethods.$inferSelect[]),
    couponCode && dbReady
      ? db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1)
      : Promise.resolve([] as typeof coupons.$inferSelect[]),
  ])

  const databasePackage = pkgRows[0]
  const mockPkg = !dbReady ? getMockPackage(data.packageId) : undefined
  const officialPkg = !dbReady ? getOfficialPackage(data.packageId) : undefined

  let resolvedDatabasePkg:
    | (typeof databasePackage & { priceCents: number })
    | undefined
  if (databasePackage && databasePackage.active) {
    const rawCents = Math.round(parseFloat(String(databasePackage.priceUsd)) * 100)
    const effectiveCents =
      databasePackage.discountPct > 0
        ? discountedCents(rawCents, databasePackage.discountPct)
        : rawCents
    if (effectiveCents !== null && Number.isSafeInteger(effectiveCents) && effectiveCents > 0) {
      resolvedDatabasePkg = { ...databasePackage, priceCents: effectiveCents }
    }
  }

  const resolvedMockPkg = mockPkg
    ? { ...mockPkg, priceCents: Math.round(parseFloat(mockPkg.priceUsd) * 100) }
    : undefined
  const pkg = dbReady
    ? resolvedDatabasePkg
    : (officialPkg ?? resolvedMockPkg)
  if (!pkg || !pkg.active) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // ── Apply coupon (if valid) using integer cents ───────────────────────────
  let amountCents = pkg.priceCents
  let appliedCoupon: string | null = null

  const mockCoupon = !dbReady && couponCode ? findMockCoupon(couponCode) : undefined
  const coupon = couponRows[0] ?? mockCoupon
  if (couponCode && coupon && coupon.active && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
    const discountedAmountCents = discountedCents(amountCents, coupon.discountPct)
    if (discountedAmountCents === null) {
      return NextResponse.json({ error: 'Invalid coupon discount' }, { status: 400 })
    }
    amountCents = discountedAmountCents
    appliedCoupon = couponCode
    // Fire coupon usage increment without blocking the response
    if (dbReady) {
      void db
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.id, coupon.id))
        .execute()
        .catch(() => {})
    } else {
      incrementMockCouponUsage(coupon.id)
    }
  }

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })
  }

  const amountUsd = amountCents / 100
  const amountUsdt = amountUsd
  const allowedMethods = new Set(['USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'])
  if (await isAtlosConfigured()) allowedMethods.add(ATLOS_KEY)
  if (isHeleketConfigured()) allowedMethods.add(HELEKET_KEY)
  if (isPlisioConfigured()) allowedMethods.add(PLISIO_KEY)

  const mockPm = !dbReady
    ? listMockPaymentMethods().find((m) => m.key === data.paymentMethod)
    : undefined
  const selectedPaymentMethod = pmRows[0] ?? mockPm
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

  let walletAddress = (WALLETS[data.paymentMethod]?.trim()) || selectedPaymentMethod?.walletAddress?.trim() || ''
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
        amountUsdt: amountUsdt.toFixed(2),
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
      const invoice = await createPlisioInvoice({ orderNumber, amountUsd: amountUsd.toFixed(2), callbackUrl: `${req.nextUrl.origin}/api/plisio/webhook?json=true`, email: data.email })
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
  const orderValues = {
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
    amountUsd:     amountUsd.toFixed(2),
    amountUsdt:    amountUsdt.toFixed(2),
    paymentMethod: data.paymentMethod,
    walletAddress,
    txId:          heleketUuid || plisioTxnId,
    couponCode:    appliedCoupon,
    status:        'pending_payment',
    proofUrl:      null,
    adminNotes:    null,
  }

  let inserted
  if (dbReady) {
    await ensureOrdersSchema()
    inserted = (
      await db
        .insert(orders)
        .values(orderValues)
        .returning()
    )[0]
  } else {
    inserted = createMockOrder(orderValues)
  }

  return NextResponse.json({
    order: inserted,
    trackingToken,
    paymentUrl: heleketUuid || plisioUrl ? walletAddress : null,
  })
}
