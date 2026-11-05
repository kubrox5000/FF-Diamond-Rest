import { NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'
import { withHeleket } from '@/lib/heleket'
import { withAtlos } from '@/lib/atlos'
import { withPlisio } from '@/lib/plisio'
import type { PublicPaymentMethod } from '@/lib/types'
import { SEED_PAYMENT_METHODS } from '@/lib/seed-data'

import { isDatabaseConfigured } from '@/lib/db-ssl'

export const dynamic = 'force-dynamic'

// Public: active payment methods shown on the store & payment page.
export async function GET() {
  try {
    if (!isDatabaseConfigured()) throw new Error('No DB')
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(asc(paymentMethods.sortOrder))
    return NextResponse.json({
      methods: withPlisio(await withAtlos(withHeleket(rows as unknown as PublicPaymentMethod[]))).filter((m) => ['ATLOS', 'USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'].includes(m.key)).map((m) => ({
        key: m.key,
        label: m.label,
        network: m.network,
        cat: m.cat,
        icon: m.icon,
      })),
    })
  } catch {
    return NextResponse.json({
      methods: withPlisio(await withAtlos(withHeleket(SEED_PAYMENT_METHODS))).filter((m) => ['ATLOS', 'USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'].includes(m.key)).map((m) => ({
        key: m.key,
        label: m.label,
        network: m.network,
        cat: m.cat,
        icon: m.icon,
      })),
    })
  }
}

