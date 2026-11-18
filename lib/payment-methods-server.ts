import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schemas'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { listMockPaymentMethods } from '@/lib/mock-admin-store'
import { withAtlos } from '@/lib/atlos'
import { withHeleket } from '@/lib/heleket'
import { withPlisio } from '@/lib/plisio'
import { STOREFRONT_ALLOWED_PAYMENT_KEYS } from '@/lib/payment-currencies'
import type { PublicPaymentMethod } from '@/lib/types'

export async function listStorefrontPaymentMethods(): Promise<PublicPaymentMethod[]> {
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
      // Fall back to mock list
    }
  }

  const combined = withPlisio(await withAtlos(withHeleket(base)))
  return combined.filter((method) => STOREFRONT_ALLOWED_PAYMENT_KEYS.has(method.key))
}
