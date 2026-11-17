'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { LangSwitch } from '@/components/geo/LangSwitch'
import { CurrencySwitch } from '@/components/geo/CurrencySwitch'
import { SiteBrand } from '@/components/site/SiteBrand'

// Routes to prefetch eagerly so navigation (esp. on touch devices, where
// hover-prefetch never fires) feels instant.
const PREFETCH_ROUTES = ['/', '/track', '/delivery', '/top-up', '/privacy', '/terms', '/refund']

function DesktopLink({ href, label, icon, active }: {
  href: string
  label: string
  icon: string | null
  active: boolean
}) {
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
    active && 'text-foreground',
  )
  if (href.startsWith('/#')) {
    return <a href={href} className={classes}>{icon && <span aria-hidden translate="no">{icon}</span>}{label}</a>
  }
  return <Link href={href} className={classes}>{icon && <span aria-hidden translate="no">{icon}</span>}{label}</Link>
}

function MobileLink({ href, label, icon, onNavigate }: {
  href: string
  label: string
  icon: string | null
  onNavigate: () => void
}) {
  const classes = 'inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium hover:bg-secondary/60 active:bg-secondary/80'
  if (href.startsWith('/#')) {
    return <a href={href} onClick={onNavigate} className={classes}>{icon && <span aria-hidden translate="no">{icon}</span>}{label}</a>
  }
  return <Link href={href} onClick={onNavigate} className={classes}>{icon && <span aria-hidden translate="no">{icon}</span>}{label}</Link>
}

export function SiteNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { t } = useLocale()

  // Prefetch key routes once the nav mounts so navigation is instant on any device.
  useEffect(() => {
    for (const href of PREFETCH_ROUTES) {
      if (href !== pathname) router.prefetch(href)
    }
  }, [router, pathname])

  const links = [
    { href: '/', label: t('nav_home'), icon: null },
    { href: '/#how-it-works', label: t('nav_how'), icon: null },
    { href: '/track', label: t('nav_track'), icon: '🔍' },
    { href: '/#faq', label: t('nav_faq'), icon: '❓' },
    { href: '/#contact', label: t('nav_contact'), icon: '📇' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group" translate="no">
          <SiteBrand />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <DesktopLink key={l.href} href={l.href} label={l.label} icon={l.icon} active={pathname === l.href} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <CurrencySwitch />
          <LangSwitch />
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-lg border border-border lg:hidden touch-manipulation"
          aria-label={t('nav_menu')}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'grid transition-all duration-200 ease-out lg:hidden',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div className="min-h-0 border-t border-border/60 bg-background/95">
          <div className="flex flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <MobileLink key={l.href} href={l.href} label={l.label} icon={l.icon} onNavigate={() => setOpen(false)} />
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border/50 px-4 py-3">
            <CurrencySwitch />
            <LangSwitch />
          </div>
        </div>
      </div>
    </header>
  )
}