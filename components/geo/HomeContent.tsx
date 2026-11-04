'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { memo, useMemo } from 'react'
import { ShieldCheck, Rocket, HeartHandshake, BadgePercent } from 'lucide-react'
import { Hero } from '@/components/site/Hero'
import { PackageCard } from '@/components/site/PackageCard'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import type { PublicPackage } from '@/lib/types'

// Below-fold sections are code-split (separate chunks) but still server-rendered
// so their content appears immediately in the first HTML — no blank wait.
const HowItWorks        = dynamic(() => import('@/components/site/HowItWorks').then(m => ({ default: m.HowItWorks })))
const FaqSection        = dynamic(() => import('@/components/site/FaqSection').then(m => ({ default: m.FaqSection })))

interface Props {
  pkgs: PublicPackage[]
  freeGift?: string
}

// Memoised package link so locale re-renders don't cascade to every card
const PkgLink = memo(function PkgLink({ p, freeGift }: { p: PublicPackage; freeGift?: string }) {
  return (
    <Link href={`/top-up?package=${p.id}`} className="block" prefetch>
      <PackageCard pkg={p} freeGift={freeGift} />
    </Link>
  )
})
PkgLink.displayName = 'PkgLink'

export function HomeContent({ pkgs, freeGift }: Props) {
  const { t } = useLocale()
  const popular = useMemo(() => pkgs.filter((p) => p.popular || p.flashSale), [pkgs])

  const whyUs = useMemo(() => [
    { icon: Rocket,        iconClass: 'text-rose-400',   num: '01', title: t('why1_t'), desc: t('why1_d') },
    { icon: ShieldCheck,   iconClass: 'text-violet-400', num: '02', title: t('why2_t'), desc: t('why2_d') },
    { icon: BadgePercent,  iconClass: 'text-sky-400',    num: '03', title: t('why3_t'), desc: t('why3_d') },
    { icon: HeartHandshake,iconClass: 'text-sky-300',    num: '04', title: t('why4_t'), desc: t('why4_d') },
  ], [t])

  return (
    <main>
      <Hero />

      {/* Packages */}
      <section id="packages" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-extrabold text-gradient sm:text-5xl">{t('home_packages_title')}</h2>
          <p className="mt-1 text-lg font-extrabold uppercase tracking-widest text-primary sm:text-xl">{t('home_packages_kicker')}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{t('home_packages_sub')}</p>
        </div>

        {pkgs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            {t('no_pkgs') || 'لا توجد باقات متوفرة حالياً'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {pkgs.map((p) => (
              <PkgLink key={p.id} p={p} freeGift={freeGift} />
            ))}
          </div>
        )}
      </section>

      {/* Popular / Best sellers */}
      {popular.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/10 via-primary/5 to-transparent p-6 text-center sm:p-8 glow-gold">
            <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
            <p className="text-xs font-bold uppercase tracking-widest text-gold">🔥 {t('home_popular_kicker')}</p>
            <h2 className="mt-2 text-3xl font-extrabold text-gradient sm:text-4xl">{t('home_popular_title')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {popular.map((p) => (
              <PkgLink key={p.id} p={p} freeGift={freeGift} />
            ))}
          </div>
        </section>
      )}

      {/* How does it work — lazy */}
      <HowItWorks />

      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('why_kicker')}</h2>
        </div>
        <div className="relative grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40 lg:block" />
          {whyUs.map((w) => (
            <div key={w.num} className="relative flex flex-col items-center px-2 text-center">
              <span className="relative z-10 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card">
                <w.icon className={`h-7 w-7 ${w.iconClass}`} />
              </span>
              <span className="mt-4 text-sm font-bold text-primary" translate="no">{w.num}</span>
              <h3 className="mt-1 text-base font-bold sm:text-lg">{w.title}</h3>
              <p className="mt-1.5 max-w-[16rem] text-sm text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — lazy */}
      <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{t('home_faq_kicker')}</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('home_faq_title')}</h2>
        </div>
        <FaqSection />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="glow-primary relative overflow-hidden rounded-3xl border border-primary/40 bg-card/80 p-10 text-center">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
          <h2 className="text-2xl font-extrabold sm:text-4xl">{t('home_cta_title')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{t('home_cta_sub')}</p>
          <Link
            href="/top-up"
            prefetch
            className="btn-shimmer glow-primary mt-6 inline-block rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            {t('home_cta_btn')}
          </Link>
        </div>
      </section>
    </main>
  )
}
