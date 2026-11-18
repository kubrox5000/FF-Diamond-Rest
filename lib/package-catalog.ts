import type { PublicPackage } from '@/lib/types'
import { discountedCents } from '@/lib/orders'

export type OfficialPackage = PublicPackage & {
  basePriceCents: number
  priceCents: number
}

// Authoritative fallback catalog matching production pricing:
// [diamonds, bonusDiamonds, basePriceCents]
const CATALOG: Array<[number, number, number]> = [
  [310, 50, 149],
  [520, 100, 249],
  [1060, 150, 349],
  [2180, 200, 549],
  [5600, 250, 749],
  [6600, 300, 849],
  [7700, 350, 949],
  [8800, 400, 1049],
  [9900, 450, 1149],
  [10500, 500, 1249],
  [11500, 550, 1349],
]

export function parseUsdToCents(price: string | number): number {
  const num = typeof price === 'string' ? Number.parseFloat(price) : price
  if (!Number.isFinite(num) || num <= 0) return 0
  return Math.round(num * 100)
}

export function normalizeBonusDiamonds(bonusDiamonds: number, sortOrder: number): number {
  return bonusDiamonds > 0 ? bonusDiamonds : Math.max(50, Number(sortOrder || 1) * 50)
}

export function normalizePackage(raw: PublicPackage): OfficialPackage {
  const basePriceCents = parseUsdToCents(raw.priceUsd)
  const discountPct = Number.isInteger(raw.discountPct) && raw.discountPct >= 0 && raw.discountPct < 100
    ? raw.discountPct
    : 0
  const effectiveCents =
    basePriceCents > 0
      ? (discountPct > 0 ? discountedCents(basePriceCents, discountPct) : basePriceCents) ?? basePriceCents
      : 0

  return {
    id: raw.id,
    diamonds: Number(raw.diamonds),
    bonusDiamonds: normalizeBonusDiamonds(Number(raw.bonusDiamonds || 0), Number(raw.sortOrder || 1)),
    basePriceCents,
    priceCents: effectiveCents,
    priceUsd: (basePriceCents / 100).toFixed(2),
    priceUsdt: (basePriceCents / 100).toFixed(2),
    discountPct,
    popular: Boolean(raw.popular),
    flashSale: Boolean(raw.flashSale),
    deliveryEta: raw.deliveryEta || '1-5 minutes',
    active: Boolean(raw.active),
    sortOrder: Number(raw.sortOrder || 0),
  }
}

export function calculateOrderPricingCents(
  pkg: Pick<PublicPackage, 'priceUsd' | 'discountPct'>,
  couponDiscountPct = 0,
): {
  baseCents: number
  packageCents: number
  finalCents: number
  finalUsd: number
} | null {
  const baseCents = parseUsdToCents(pkg.priceUsd)
  if (!Number.isSafeInteger(baseCents) || baseCents <= 0) return null

  const packageCents =
    pkg.discountPct > 0 ? discountedCents(baseCents, pkg.discountPct) : baseCents
  if (packageCents === null) return null

  const finalCents =
    couponDiscountPct > 0 ? discountedCents(packageCents, couponDiscountPct) : packageCents
  if (finalCents === null) return null

  return {
    baseCents,
    packageCents,
    finalCents,
    finalUsd: finalCents / 100,
  }
}

export const OFFICIAL_PACKAGE_CATALOG: OfficialPackage[] = CATALOG.map(
  ([diamonds, bonusDiamonds, basePriceCents], index) =>
    normalizePackage({
      id: index + 1,
      diamonds,
      bonusDiamonds,
      priceUsd: (basePriceCents / 100).toFixed(2),
      priceUsdt: (basePriceCents / 100).toFixed(2),
      discountPct: 0,
      popular: [3, 4, 5, 10].includes(index + 1),
      flashSale: false,
      deliveryEta: '1-5 minutes',
      active: true,
      sortOrder: index + 1,
    }),
)

export function getOfficialPackage(packageId: number): OfficialPackage | undefined {
  return OFFICIAL_PACKAGE_CATALOG.find((pkg) => pkg.id === packageId)
}
