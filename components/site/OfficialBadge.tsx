'use client'

import { ShieldCheck, CheckCircle2, Headphones, Gem, Clock } from 'lucide-react'
import { useLocale } from '@/components/geo/GeoLocaleProvider'

/* ─── Inline hero badge (small, used inside Hero section) ─── */
export function OfficialHeroBadge() {
  const { t } = useLocale()
  return (
    <div
      style={{ animationDelay: '0.08s' }}
      className="hero-fade mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 shadow-sm"
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
      {t('official_badge')}
    </div>
  )
}

/* ─── Full banner section (between Hero and packages) ─── */
export function OfficialBannerSection() {
  const { t } = useLocale()

  const items = [
    {
      icon: CheckCircle2,
      label: t('official_verified'),
      color: 'text-emerald-400',
      ring: 'ring-emerald-500/30 bg-emerald-500/10',
    },
    {
      icon: ShieldCheck,
      label: t('official_reseller'),
      color: 'text-gold',
      ring: 'ring-gold/30 bg-gold/10',
    },
    {
      icon: ShieldCheck,
      label: t('official_secure'),
      color: 'text-sky-400',
      ring: 'ring-sky-500/30 bg-sky-500/10',
    },
  ]

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Glowing card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 via-background to-background p-6 shadow-lg sm:p-8">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-6 text-center lg:flex-row lg:text-start">
          {/* Icon */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 ring-2 ring-emerald-500/30">
            <ShieldCheck className="h-9 w-9 text-emerald-400" strokeWidth={1.8} />
          </div>

          {/* Text */}
          <div className="flex-1">
            <h3 className="text-lg font-extrabold text-foreground sm:text-xl">
              {t('official_badge')}
            </h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {t('official_desc')}
            </p>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-end">
            {items.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${item.ring} ${item.color}`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom facts row */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-border/40 pt-5 sm:grid-cols-4">
          {[
            { icon: Headphones, value: 'Email & TG', label: t('stat_experience') },
            { icon: Clock, value: 'Sun–Fri', label: t('stat_customers') },
            { icon: Gem, value: 'UID', label: t('stat_original') },
            { icon: Clock, value: t('stat_delivery_time'), label: t('stat_delivery') },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 text-center" translate="no">
              <s.icon className="h-5 w-5 text-primary" />
              <span className="text-base font-extrabold text-foreground">{s.value}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Small footer badge ─── */
export function OfficialFooterBadge() {
  const { t } = useLocale()
  return (
    <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400">
      <ShieldCheck className="h-4 w-4 shrink-0" />
      {t('official_badge')}
    </div>
  )
}
