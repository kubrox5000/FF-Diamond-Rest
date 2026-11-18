import { Suspense } from 'react'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { TopUpForm } from '@/components/site/TopUpForm'
import { PageHeader } from '@/components/geo/PageHeader'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import { listStorefrontPackages } from '@/lib/packages-server'
import { listStorefrontPaymentMethods } from '@/lib/payment-methods-server'
import { localizedPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_topup')
}

export default async function TopUpPage() {
  const [pkgRows, methods, settings] = await Promise.all([
    listStorefrontPackages(),
    listStorefrontPaymentMethods(),
    getSettings(),
  ])

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
