import { Suspense } from 'react'
import { db } from '@/db'
import { packages, paymentMethods } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { TopUpForm } from '@/components/site/TopUpForm'
import { PageHeader } from '@/components/geo/PageHeader'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import { listMockPackages, listMockPaymentMethods } from '@/lib/mock-admin-store'
import type { PublicPackage, PublicPaymentMethod } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'
import { withHeleket, HELEKET_KEY } from '@/lib/heleket'
import { withAtlos, ATLOS_KEY } from '@/lib/atlos'
import { withPlisio, PLISIO_KEY } from '@/lib/plisio'
import { isDatabaseConfigured } from '@/lib/db-ssl'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_topup')
}

export default async function TopUpPage() {
  let pkgRows: PublicPackage[] = listMockPackages().filter((p) => p.active)
  let methods: PublicPaymentMethod[] = listMockPaymentMethods().filter((m) => m.active)
  const settings = await getSettings()

  if (isDatabaseConfigured()) {
    try {
      const [dbPackages, dbMethods] = await Promise.all([
        db
          .select()
          .from(packages)
          .where(eq(packages.active, true))
          .orderBy(asc(packages.sortOrder)),
        db
          .select()
          .from(paymentMethods)
          .where(eq(paymentMethods.active, true))
          .orderBy(asc(paymentMethods.sortOrder)),
      ])
      if (dbPackages.length > 0) pkgRows = dbPackages as unknown as PublicPackage[]
      methods = dbMethods as unknown as PublicPaymentMethod[]
    } catch {
      // fallback to seed packages / payment methods
    }
  }

  const allowedMethods = new Set([ATLOS_KEY, HELEKET_KEY, PLISIO_KEY, 'USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'])
  methods = withPlisio(await withAtlos(withHeleket(methods))).filter((method) => allowedMethods.has(method.key))

  return (
    <>
      <LocalizedTitle pageKey="title_topup" />
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PageHeader kicker="top_kicker" title="top_title" sub="top_sub" />

          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-secondary/40" />}>
          <TopUpForm packages={pkgRows} paymentMethods={methods} freeGift={settings.freeGift} />
        </Suspense>
      </main>
      <SiteFooter settings={settings} />
      <FloatingSupport telegram={settings.telegram} discord={settings.discord} />
    </>
  )
}
