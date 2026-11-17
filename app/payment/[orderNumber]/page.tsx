import { notFound } from 'next/navigation'
import { db } from '@/db'
import { orders } from '@/db/schemas'
import { eq } from 'drizzle-orm'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { PaymentClient } from '@/components/site/PaymentClient'
import { PageHeader } from '@/components/geo/PageHeader'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'
import type { PublicOrder } from '@/lib/types'
import { localizedPageMetadata } from '@/lib/seo'
import { syncHeleketOrder } from '@/lib/heleket'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { getMockOrder } from '@/lib/mock-orders'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return localizedPageMetadata('title_payment')
}

export default async function PaymentPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const settings = await getSettings()
  let row = isDatabaseConfigured()
    ? (await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1))[0]
    : getMockOrder(orderNumber) ?? undefined
  if (!row) notFound()
  // Heleket orders: refresh the status from the gateway in case the webhook is late.
  if (isDatabaseConfigured()) {
    row = await syncHeleketOrder(row).catch(() => row)
  }

  const order = JSON.parse(JSON.stringify(row)) as PublicOrder

  return (
    <>
      <LocalizedTitle pageKey="title_payment" />
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PageHeader kicker="pay_kicker" title="pay_title" />
        <PaymentClient order={order} />
      </main>
      <SiteFooter settings={settings} />
      <FloatingSupport telegram={settings.telegram} discord={settings.discord} />
    </>
  )
}
