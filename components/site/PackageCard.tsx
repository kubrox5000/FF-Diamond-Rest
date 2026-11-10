'use client'

import { memo } from 'react'
import { Gem, Flame, Check, Trophy, Gift } from 'lucide-react'
import { cn } from '@/utils/cn'
import { discountedPrice } from '@/lib/orders'
import { formatNumber } from '@/lib/currencies'
import { formatUsd } from '@/lib/orders'
import type { PublicPackage } from '@/lib/types'
import { useLocale } from '@/components/geo/GeoLocaleProvider'

// Premium packages that give DOUBLE the ordered diamonds (X2 promotion).
const X2_DIAMONDS = [21000, 24500, 28000, 32000, 36000, 40000]

// Premium packages that give TRIPLE the ordered diamonds (X3 promotion).
const X3_DIAMONDS = [45000, 50000, 60000, 70000, 80000, 90000]

// Premium packages that give QUADRUPLE the ordered diamonds (X4 promotion).
const X4_DIAMONDS = [100000, 120000, 150000, 180000, 210000, 240000]

interface Props {
  pkg: PublicPackage
  selected?: boolean
  onSelect?: (pkg: PublicPackage) => void
  ctaLabel?: string
  freeGift?: string
}

function PackageCardBase({ pkg, selected, onSelect, ctaLabel }: Props) {
  const { t } = useLocale()
  const finalUsd = discountedPrice(pkg.priceUsd, pkg.discountPct)
  const hasDiscount = pkg.discountPct > 0
  const xMultiplier = X4_DIAMONDS.includes(pkg.diamonds) ? 4 : X3_DIAMONDS.includes(pkg.diamonds) ? 3 : X2_DIAMONDS.includes(pkg.diamonds) ? 2 : 0
  const giftDiamonds = pkg.bonusDiamonds > 0 ? pkg.bonusDiamonds : Math.max(50, Number(pkg.sortOrder || 1) * 50)
  const baseTotal = pkg.diamonds + giftDiamonds
  const total = xMultiplier > 0 ? baseTotal * xMultiplier : baseTotal

  return (
    <button
      type="button"
      onClick={() => onSelect?.(pkg)}
      suppressHydrationWarning
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border p-4 sm:p-5 text-left transition-all duration-150',
        'hover:-translate-y-1 active:scale-[0.98]',
        'bg-card/90',
        selected
          ? 'border-primary glow-primary'
          : 'border-border hover:border-primary/60',
      )}
    >
      {(pkg.popular || pkg.flashSale) && (
        <span
          className={cn(
            'absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
            pkg.flashSale
              ? 'bg-gold text-gold-foreground'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-orange-500/30',
          )}
        >
          {pkg.flashSale ? <Flame className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
          {pkg.flashSale ? t('pkg_flash') : t('pkg_popular')}
        </span>
      )}

      <div className="mb-4 flex items-center gap-3 pt-7">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-sky-500/30 to-violet-500/30 ring-1 ring-inset ring-white/10">
          <Gem className="h-6 w-6 text-sky-300" />
        </span>
        <div>
          <div className="flex items-baseline gap-1.5" translate="no">
            <span className="text-2xl font-extrabold">{formatNumber(pkg.diamonds)}</span>
            <span className="text-sm font-medium text-muted-foreground">💎</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1" translate="no">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              <Gift className="h-2.5 w-2.5 shrink-0" />
              +{formatNumber(giftDiamonds)} {t('pkg_free')}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-1 flex items-baseline gap-2" translate="no">
        <span className="text-2xl font-extrabold text-gold">
          {formatUsd(finalUsd)}
        </span>
        {hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            {formatUsd(Number(pkg.priceUsd))}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span translate="no">{t('pkg_total', { n: formatNumber(total) })}</span>
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span translate="no">{t('pkg_delivery', { eta: pkg.deliveryEta })}</span>
        </li>
      </ul>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">
        <Gift className="h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-2" translate="no">
          {t('pkg_gift_free', { n: formatNumber(giftDiamonds) })}
        </span>
      </div>

      {xMultiplier > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-gold/50 bg-gradient-to-r from-gold/25 via-gold/10 to-emerald-500/25 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-black text-black shadow-md shadow-orange-500/40">
              ×{xMultiplier}
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-gold">
                {xMultiplier === 4 ? t('pkg_x4_title') : xMultiplier === 3 ? t('pkg_x3_title') : t('pkg_x2_title')}
              </span>
              <span className="block text-xs text-muted-foreground" translate="no">
                {t('pkg_x2_desc', { n: formatNumber(pkg.diamonds), x: formatNumber(pkg.diamonds * xMultiplier) })}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <span
        className={cn(
          'btn-shimmer mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity',
          selected ? 'opacity-100' : 'opacity-90 group-hover:opacity-100',
        )}
      >
        {selected ? t('pkg_selected') : (ctaLabel ?? t('pkg_topup'))}
      </span>
    </button>
  )
}

export const PackageCard = memo(PackageCardBase)
