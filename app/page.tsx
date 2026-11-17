import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner'
import { HomeContent } from '@/components/geo/HomeContent'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import type { PublicPackage } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'
import { listMockPackages } from '@/lib/mock-admin-store'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { db } from '@/db'
import { packages } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_home')
}

export default async function HomePage() {
  const settings = await getSettings()

  let pkgRows: PublicPackage[] = listMockPackages().filter((p) => p.active)
  if (isDatabaseConfigured()) {
    try {
      const dbRows = await db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sortOrder))
      if (dbRows.length > 0) pkgRows = dbRows as unknown as PublicPackage[]
    } catch {
      // fall back to mock/official catalog
    }
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://ff-diamond.rest'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'FF Diamond',
        legalName: 'FF Diamond LLC',
        url: base,
        logo: { '@type': 'ImageObject', '@id': `${base}/#logo`, url: `${base}/icon.png` },
        image: `${base}/icon.png`,
        description: 'Independent digital Free Fire diamond top-up service via Player UID.',
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
