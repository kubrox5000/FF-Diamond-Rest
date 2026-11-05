import 'server-only'
import crypto from 'node:crypto'
import { getSettings } from '@/lib/settings'
import { resolveAtlosCredentials, type AtlosCredentials } from '@/lib/atlos-config'
import { db } from '@/db'
import { orders, type Order } from '@/db/schemas'
import { and, eq, notInArray } from 'drizzle-orm'
import type { PublicPaymentMethod } from '@/lib/types'

// Atlos.io crypto payment gateway (https://atlos.io).
// Uses environment configuration first, then saved admin settings.

export const ATLOS_KEY = 'ATLOS'

export async function getAtlosCredentials(): Promise<AtlosCredentials> {
  return resolveAtlosCredentials(process.env, getSettings)
}

export async function isAtlosConfigured(): Promise<boolean> {
  const { merchantId } = await getAtlosCredentials()
  return Boolean(merchantId)
}

// Verify the webhook signature using the same resolved settings as checkout.
export async function verifyAtlosWebhook(
  rawBody: string,
  signatureHeader?: string | null,
  timestampHeader?: string | null,
): Promise<boolean> {
  const { apiSecret } = await getAtlosCredentials()
  if (!apiSecret || !signatureHeader) return false

  try {
    const message = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody
    const expected = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex')

    return (
      expected.length === signatureHeader.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
    )
  } catch {
    return false
  }
}

// Synchronize and mark Atlos order as paid
export async function markAtlosOrderPaid(orderNumber: string, txId?: string): Promise<Order | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1)

  if (!order) return null

  if (order.status === 'paid' || order.status === 'completed') {
    return null
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: 'paid',
      txId: txId || order.txId,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, order.id), notInArray(orders.status, ['paid', 'completed'])))
    .returning()

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
      network: 'USDT · BTC · ETH · SOL · LTC…',
      cat: 'crypto',
      icon: 'atlos',
      walletAddress: '',
      active: true,
      sortOrder: -2,
    },
    ...methods,
  ]
}
