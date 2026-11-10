import { Suspense } from 'react'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { TopUpForm } from '@/components/site/TopUpForm'
import { PageHeader } from '@/components/geo/PageHeader'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import { SEED_PAYMENT_METHODS } from '@/lib/seed-data'
import { OFFICIAL_PACKAGE_CATALOG } from '@/lib/package-catalog'
import type { PublicPackage, PublicPaymentMethod } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'
import { withHeleket } from '@/lib/heleket'
import { withAtlos } from '@/lib/atlos'
import { withPlisio } from '@/lib/plisio'
import { isDatabaseConfigured } from '@/lib/db-ssl'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_topup')
}

export default async function TopUpPage() {
  const pkgRows: PublicPackage[] = OFFICIAL_PACKAGE_CATALOG
  let methods: PublicPaymentMethod[] = SEED_PAYMENT_METHODS
  const settings = await getSettings()

  if (isDatabaseConfigured()) {
    try {
      const dbMethods = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.active, true))
        .orderBy(asc(paymentMethods.sortOrder))
      methods = dbMethods as unknown as PublicPaymentMethod[]
    } catch {
      // fallback to seed payment methods
    }
  }

  const allowedMethods = new Set(['ATLOS', 'USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'])
  methods = methods.filter((method) => allowedMethods.has(method.key))

  return (
    <>
      <LocalizedTitle pageKey="title_topup" />
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PageHeader kicker="top_kicker" title="top_title" sub="top_sub" />

          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-secondary/40" />}>
          <TopUpForm packages={pkgRows} paymentMethods={withPlisio(await withAtlos(withHeleket(methods)))} freeGift={settings.freeGift} />
        </Suspense>
      </main>
      <SiteFooter settings={settings} />
      <FloatingSupport telegram={settings.telegram} discord={settings.discord} />
    </>
  )
}
