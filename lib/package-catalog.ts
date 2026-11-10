import type { PublicPackage } from '@/lib/types'

export type OfficialPackage = PublicPackage & { priceCents: number }

const CATALOG: Array<[number, number, number]> = [
  [310, 50, 100],
  [520, 100, 200],
  [1060, 150, 300],
  [2180, 200, 500],
  [5600, 250, 700],
  [6600, 300, 800],
  [7700, 350, 900],
  [8800, 400, 1000],
  [9900, 450, 1100],
  [10500, 500, 1200],
  [11500, 550, 1300],
]

export const OFFICIAL_PACKAGE_CATALOG: OfficialPackage[] = CATALOG.map(([diamonds, bonusDiamonds, priceCents], index) => ({
  id: index + 1,
  diamonds,
  bonusDiamonds,
  priceCents,
  priceUsd: (priceCents / 100).toFixed(2),
  priceUsdt: (priceCents / 100).toFixed(2),
  discountPct: 0,
  popular: [3, 4, 5, 10].includes(index + 1),
  flashSale: false,
  deliveryEta: '1-5 minutes',
  active: true,
  sortOrder: index + 1,
}))

export function getOfficialPackage(packageId: number): OfficialPackage | undefined {
  return OFFICIAL_PACKAGE_CATALOG.find((pkg) => pkg.id === packageId)
}
