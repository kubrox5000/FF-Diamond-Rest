import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner'
import { HomeContent } from '@/components/geo/HomeContent'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import { OFFICIAL_PACKAGE_CATALOG } from '@/lib/package-catalog'
import type { PublicPackage } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_home')
}

export default async function HomePage() {
  const settings = await getSettings()

  const pkgRows: PublicPackage[] = OFFICIAL_PACKAGE_CATALOG

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://ff-diamond.rest'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'FF Diamond',
        url: base,
        logo: { '@type': 'ImageObject', '@id': `${base}/#logo`, url: `${base}/icon.png` },
        image: `${base}/icon.png`,
        description: 'Instant Free Fire Diamonds top-up with secure payments.',
        offers: pkgRows.slice(0, 6).map((p) => ({
          '@type': 'Offer',
          name: `${p.diamonds} Free Fire Diamonds`,
          price: p.priceUsd,
          priceCurrency: 'USD',
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${base}/#breadcrumb`,
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: base }],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'FF Diamond',
        publisher: { '@id': `${base}/#organization` },
      },
    ],
  }

  return (
    <>
      <LocalizedTitle pageKey="title_home" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AnnouncementBanner announcements={{
        ar: settings.announcementAr || '',
        en: settings.announcementEn || '',
        fr: settings.announcementFr || '',
        es: settings.announcementEs || '',
      }} />
      <SiteNav />

      <HomeContent
        pkgs={pkgRows}
        freeGift={settings.freeGift}
      />

      <SiteFooter settings={settings} />
      <FloatingSupport
        telegram={settings.telegram}
        discord={settings.discord}
      />
    </>
  )
}
