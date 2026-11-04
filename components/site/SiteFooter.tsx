'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Twitter, Youtube, Music2, Send, Lock, ChevronRight } from 'lucide-react'
import type { SiteSettings } from '@/lib/settings'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { SiteBrand } from '@/components/site/SiteBrand'

const payments = [
  { label: 'USDT', className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30' },
  { label: 'BTC', className: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30' },
  { label: 'ETH', className: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30' },
  { label: 'SOL', className: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30' },
  { label: 'LTC', className: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30' },
  { label: 'BNB', className: 'bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-400/30' },
]

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { t } = useLocale()
  const tg = settings.telegram ? `https://t.me/${settings.telegram}` : undefined

  const quickLinks = [
    { href: '/', label: t('foot_home') },
    { href: '/#how-it-works', label: t('foot_how') },
    { href: '/track', label: t('foot_track') },
    { href: '/#faq', label: t('foot_faq') },
    { href: '/#contact', label: t('foot_contactlink') },
    { href: '/privacy', label: t('foot_privacy') },
    { href: '/terms', label: t('foot_terms') },
    { href: '/refund', label: t('foot_refund') },
    { href: '/delivery', label: t('foot_delivery') },
  ]

  return (
    <footer id="contact" className="relative mt-24 border-t border-border/60 bg-background/70">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2" translate="no">
              <SiteBrand nameClass="text-xl font-extrabold text-gradient" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              {t('foot_tagline')}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t('foot_desc')}
            </p>

            {tg && (
              <a
                href={tg}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-sky-400"
              >
                <Send className="h-4 w-4" /> {t('foot_wa')}
              </a>
            )}

            <div className="mt-5 flex items-center gap-3">
              {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/50 transition-colors hover:bg-secondary hover:text-pink-400">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/50 transition-colors hover:bg-secondary hover:text-sky-400">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings.twitter && (
                <a href={settings.twitter} target="_blank" rel="noreferrer" aria-label="Twitter / X" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/50 transition-colors hover:bg-secondary hover:text-neutral-300">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {settings.youtube && (
                <a href={settings.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/50 transition-colors hover:bg-secondary hover:text-red-400">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
              {settings.tiktok && (
                <a href={settings.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary/50 transition-colors hover:bg-secondary hover:text-neutral-200">
                  <Music2 className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Contact us */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('foot_contact')}</h4>
            <div className="mt-4 flex items-center gap-2" translate="no">
              <SiteBrand nameClass="text-xl font-extrabold text-gradient" />
            </div>

            <ul className="mt-5 space-y-4 text-sm">
              <ContactRow icon={<Phone className="h-4 w-4" />} label={t('foot_phone')} value={settings.phone} href={settings.phone ? `tel:${settings.phone.replace(/\s/g, '')}` : undefined} />
              <ContactRow icon={<Mail className="h-4 w-4" />} label={t('foot_email')} value={settings.supportEmail} href={settings.supportEmail ? `mailto:${settings.supportEmail}` : undefined} />
              <ContactRow icon={<MapPin className="h-4 w-4" />} label={t('foot_address')} value={settings.address} />
              <ContactRow icon={<Clock className="h-4 w-4" />} label={t('foot_hours')} value={settings.hours} />
            </ul>
          </div>

          {/* Important links */}
          <div className="md:justify-self-end">
            <h4 className="text-sm font-semibold text-foreground">{t('foot_links')}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="group inline-flex items-center gap-1.5 hover:text-foreground">
                    <ChevronRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-border/60 pt-6 sm:flex-row">
          <p className="order-3 flex items-center gap-1.5 text-xs text-muted-foreground sm:order-1">
            <Lock className="h-3.5 w-3.5" /> {t('foot_safe')}
          </p>

          <div className="order-1 flex flex-wrap items-center justify-center gap-2 sm:order-2">
            {payments.map((p) => (
              <span key={p.label} className={`grid h-7 min-w-11 place-items-center rounded-md px-2 text-[11px] font-bold ${p.className}`} translate="no">
                {p.label}
              </span>
            ))}
          </div>

          <p className="order-2 text-xs text-muted-foreground sm:order-3">
            {t('foot_rights', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  if (!value) return null
  const content = (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-secondary/50 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground" translate="no">{value}</p>
      </div>
    </div>
  )
  return <li>{href ? <a href={href} className="block transition-opacity hover:opacity-80">{content}</a> : content}</li>
}
