import 'server-only'
import { getSettings } from '@/lib/settings'
import { hasCompleteAtlosCredentials, resolveAtlosCredentials, type AtlosCredentials } from '@/lib/atlos-config'
import { db } from '@/db'
import { orders, type Order } from '@/db/schemas'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { ensureOrdersSchema } from '@/lib/ensure-orders-schema'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { getMockOrder, transitionMockOrderStatus } from '@/lib/mock-orders'
import type { PublicPaymentMethod } from '@/lib/types'
import { SUPPORTED_CRYPTO_DOT_LIST } from '@/lib/payment-currencies'
import {
  ATLOS_ALLOWED_SOURCE_STATUSES,
  verifyAtlosWebhookSignature,
} from '@/lib/atlos-callback'

// Atlos.io crypto payment gateway (https://atlos.io).
// Uses environment configuration first, then saved admin settings.

export const ATLOS_KEY = 'ATLOS'

export async function getAtlosCredentials(): Promise<AtlosCredentials> {
  return resolveAtlosCredentials(process.env, getSettings)
}

export async function isAtlosConfigured(): Promise<boolean> {
  const credentials = await getAtlosCredentials()
  return hasCompleteAtlosCredentials(credentials)
}

// Verify the webhook signature using the same resolved settings as checkout.
export async function verifyAtlosWebhook(
  rawBody: string,
  signatureHeader?: string | null,
  timestampHeader?: string | null,
): Promise<boolean> {
  const { apiSecret } = await getAtlosCredentials()
  return verifyAtlosWebhookSignature(rawBody, signatureHeader, timestampHeader, apiSecret)
}

export async function findAtlosOrder(orderNumber: string): Promise<Order | null> {
  if (!isDatabaseConfigured()) {
    return getMockOrder(orderNumber)
  }
  await ensureOrdersSchema()
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1)
  return order ?? null
}

// Atomically transition an Atlos order to 'paid' ONLY from 'pending_payment' or 'payment_review'.
// Duplicate, concurrent, late (processing/completed), or cancelled orders return null without side effects.
export async function markAtlosOrderPaid(orderNumber: string, txId?: string): Promise<Order | null> {
  if (!isDatabaseConfigured()) {
    return transitionMockOrderStatus(
      orderNumber,
      ATLOS_ALLOWED_SOURCE_STATUSES,
      { status: 'paid', ...(txId ? { txId } : {}) },
    )
  }

  await ensureOrdersSchema()
  const [updated] = await db.transaction(async (tx) => {
    return tx
      .update(orders)
      .set({
        status: 'paid',
        txId: txId ? txId : sql`${orders.txId}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.orderNumber, orderNumber),
          eq(orders.paymentMethod, ATLOS_KEY),
          inArray(orders.status, [...ATLOS_ALLOWED_SOURCE_STATUSES]),
        ),
      )
      .returning()
  })

  return updated ?? null
}

// Add Atlos to the store's payment methods when configured
export async function withAtlos(methods: PublicPaymentMethod[]): Promise<PublicPaymentMethod[]> {
  if (!(await isAtlosConfigured()) || methods.some((m) => m.key === ATLOS_KEY)) return methods
  return [
    {
      id: 0,
      key: ATLOS_KEY,
      label: 'Atlos (Crypto)',
      network: SUPPORTED_CRYPTO_DOT_LIST,
      cat: 'crypto',
      icon: 'atlos',
      walletAddress: '',
      active: true,
      sortOrder: -2,
    },
    ...methods,
  ]
}
