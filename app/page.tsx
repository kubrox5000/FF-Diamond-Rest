import { db } from '@/db'
import { packages, reviews } from '@/db/schemas'
import { eq, asc, desc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { AnnouncementBanner } from '@/components/site/AnnouncementBanner'
import { HomeContent } from '@/components/geo/HomeContent'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { SEED_PACKAGES, SEED_REVIEWS } from '@/lib/seed-data'
import type { PublicPackage, PublicReview } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_home')
}

export default async function HomePage() {
  const settings = await getSettings()

  let pkgRows: PublicPackage[] = SEED_PACKAGES
  let reviewRows: PublicReview[] = SEED_REVIEWS

  if (isDatabaseConfigured()) {
    try {
      const getCachedPackages = unstable_cache(
        async () =>
          db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sortOrder)),
        ['home-packages'],
        { revalidate: 300, tags: ['home'] },
      )
      const getCachedReviews = unstable_cache(
        async () => db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(60),
        ['home-reviews'],
        { revalidate: 300, tags: ['home'] },
      )
      pkgRows = ((await getCachedPackages()) as unknown) as PublicPackage[]
      reviewRows = ((await getCachedReviews()) as unknown) as PublicReview[]
    } catch {
      // fallback to seed data if DB is unreachable
    }
  }

  const totalReviews = 2400 + reviewRows.length
  const averageRating = reviewRows.length > 0 ? reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length : 4.9

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
        reviews={reviewRows}
        totalReviews={totalReviews}
        averageRating={averageRating}
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
