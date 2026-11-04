'use client'

import Link from 'next/link'
import { Zap, ShieldCheck, Headphones, CheckCircle2 } from 'lucide-react'
import { useLocale } from '@/components/geo/GeoLocaleProvider'

export function Hero() {
  const { t } = useLocale()

  const features = [
    { icon: Zap,           label: t('feat_instant'),   color: 'text-gold' },
    { icon: ShieldCheck,   label: t('feat_secure'),    color: 'text-emerald-400' },
    { icon: Headphones,    label: t('feat_support'),   color: 'text-sky-400' },
    { icon: CheckCircle2,  label: t('feat_customers'), color: 'text-emerald-400' },
  ]

  return (
    <section className="relative overflow-hidden">
      {/* static background orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-16 h-56 w-56 rounded-full bg-primary/15 blur-2xl" />
        <div className="absolute right-[6%] top-32 h-64 w-64 rounded-full bg-accent/12 blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">


        {/* Flash badge — CSS fade-in */}
        <div className="hero-fade mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
          <Zap className="h-3.5 w-3.5" /> {t('feat_instant')}
        </div>

        {/* Title */}
        <h1 className="hero-fade hero-fade-2 mx-auto max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          {t('hero_title1')} <span className="text-gradient">{t('hero_title2')}</span>
        </h1>

        {/* Tagline */}
        <p className="hero-fade hero-fade-3 mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t('hero_tagline')}
        </p>

        {/* CTA buttons */}
        <div className="hero-fade hero-fade-4 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/top-up"
            prefetch
            className="btn-shimmer glow-primary w-full rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.03] sm:w-auto"
          >
            {t('hero_topup')}
          </Link>
          <Link
            href="/track"
            className="w-full rounded-xl border border-border bg-secondary/50 px-8 py-3.5 text-base font-semibold transition-colors hover:bg-secondary sm:w-auto"
          >
            {t('hero_track')}
          </Link>
        </div>

        {/* Feature cards — simple CSS grid, no motion */}
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.label}
              className="hero-fade hero-fade-5 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/80 p-4"
            >
              <f.icon className={`h-6 w-6 ${f.color}`} />
              <span className="text-xs font-semibold sm:text-sm">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Diamond */}
        <div className="hero-fade hero-fade-6 mt-16 flex justify-center">
          <span className="text-7xl diamond-float leading-none drop-shadow-[0_10px_20px_rgba(245,166,35,0.3)] sm:text-8xl">💎</span>
        </div>
      </div>
    </section>
  )
}
