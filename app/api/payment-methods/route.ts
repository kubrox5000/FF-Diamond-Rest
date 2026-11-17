import { NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'
import { withHeleket, HELEKET_KEY } from '@/lib/heleket'
import { withAtlos, ATLOS_KEY } from '@/lib/atlos'
import { withPlisio, PLISIO_KEY } from '@/lib/plisio'
import type { PublicPaymentMethod } from '@/lib/types'
import { listMockPaymentMethods } from '@/lib/mock-admin-store'
import { isDatabaseConfigured } from '@/lib/db-ssl'

export const dynamic = 'force-dynamic'

const STOREFRONT_ALLOWED_KEYS = new Set([
  ATLOS_KEY,
  HELEKET_KEY,
  PLISIO_KEY,
  'USDT_TRC20',
  'BTC',
  'ETH',
  'SOL',
  'LTC',
  'BUSD',
  'BNB',
])

// Public: active payment methods shown on the store & payment page.
export async function GET() {
  let base: PublicPaymentMethod[] = listMockPaymentMethods().filter((m) => m.active)
  if (isDatabaseConfigured()) {
    try {
      const rows = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.active, true))
        .orderBy(asc(paymentMethods.sortOrder))
      base = rows as unknown as PublicPaymentMethod[]
    } catch {
      // fall back to mock list
    }
  }
  const combined = withPlisio(await withAtlos(withHeleket(base)))
  return NextResponse.json({
    methods: combined
      .filter((m) => STOREFRONT_ALLOWED_KEYS.has(m.key))
      .map((m) => ({
        key: m.key,
        label: m.label,
        network: m.network,
        cat: m.cat,
        icon: m.icon,
      })),
  })
}

