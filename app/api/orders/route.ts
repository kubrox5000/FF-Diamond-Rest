import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { orders, coupons, paymentMethods } from '@/db/schemas'
import { eq, sql } from 'drizzle-orm'
import { generateOrderNumber } from '@/lib/orders'
import { calculateOrderPricingCents } from '@/lib/package-catalog'
import { getStorefrontPackageById } from '@/lib/packages-server'
import { getSettings } from '@/lib/settings'
import { HELEKET_KEY, isHeleketConfigured, createHeleketInvoice } from '@/lib/heleket'
import { ATLOS_KEY, isAtlosConfigured } from '@/lib/atlos'
import { PLISIO_KEY, createPlisioInvoice, isPlisioConfigured } from '@/lib/plisio'
import { STOREFRONT_CRYPTO_METHOD_KEYS } from '@/lib/payment-currencies'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { createMockOrder } from '@/lib/mock-orders'
import {
  findMockCoupon,
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

  // ── Fetch authoritative package + settings + payment method + coupon in parallel ──
  const couponCode = data.couponCode ? data.couponCode.trim().toUpperCase() : null
  const dbReady = isDatabaseConfigured()

  const [pkg, settingsData, pmRows, couponRows] = await Promise.all([
    getStorefrontPackageById(data.packageId),
    getSettings(),
    dbReady
      ? db.select().from(paymentMethods).where(eq(paymentMethods.key, data.paymentMethod)).limit(1)
      : Promise.resolve([] as typeof paymentMethods.$inferSelect[]),
    couponCode && dbReady
      ? db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1)
      : Promise.resolve([] as typeof coupons.$inferSelect[]),
  ])

  if (!pkg || !pkg.active) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  // ── Apply coupon (if valid) using authoritative integer-cent calculation ──
  let appliedCoupon: string | null = null
  let couponPct = 0

  const mockCoupon = !dbReady && couponCode ? findMockCoupon(couponCode) : undefined
  const coupon = couponRows[0] ?? mockCoupon
  if (couponCode && coupon && coupon.active && (!coupon.maxUses || coupon.usedCount < coupon.maxUses)) {
    couponPct = coupon.discountPct
    const pricingCheck = calculateOrderPricingCents(pkg, couponPct)
    if (!pricingCheck) {
      return NextResponse.json({ error: 'Invalid coupon discount' }, { status: 400 })
    }
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

  const pricing = calculateOrderPricingCents(pkg, couponPct)
  if (!pricing || !Number.isSafeInteger(pricing.finalCents) || pricing.finalCents <= 0) {
    return NextResponse.json({ error: 'Invalid order total' }, { status: 400 })
  }

  const amountUsd = pricing.finalUsd
  const amountUsdt = pricing.finalUsd
  const allowedMethods = new Set<string>(STOREFRONT_CRYPTO_METHOD_KEYS)
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

  const totalDiamonds = pkg.diamonds + pkg.bonusDiamonds

  // ── Insert order ──────────────────────────────────────────────────────────
  const orderValues = {
    orderNumber,
    trackingToken,
    packageId:     pkg.id,
    diamonds:      totalDiamonds,
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
