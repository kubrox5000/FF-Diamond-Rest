import crypto from 'node:crypto'
import type { Order } from '@/db/schemas'

export function hasValidTrackingToken(expected: string | null | undefined, supplied: string | null): boolean {
  if (!expected || !supplied || !/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expectedBytes = Buffer.from(expected, 'hex')
  const suppliedBytes = Buffer.from(supplied, 'hex')
  return expectedBytes.length === suppliedBytes.length && crypto.timingSafeEqual(expectedBytes, suppliedBytes)
}

export function publicOrderDetails(order: Order) {
  return {
    orderNumber: order.orderNumber,
    packageId: order.packageId,
    diamonds: order.diamonds,
    server: order.server,
    amountUsd: order.amountUsd,
    amountUsdt: order.amountUsdt,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }
}

export function authorizeMarkReviewed(
  order: Pick<Order, 'trackingToken' | 'status'> | null | undefined,
  suppliedToken: string | null,
): { ok: true; shouldTransition: boolean } | { ok: false; statusCode: 401 | 404; error: string } {
  if (!suppliedToken) {
    return { ok: false, statusCode: 401, error: 'Missing tracking token' }
  }
  if (!order || !hasValidTrackingToken(order.trackingToken, suppliedToken)) {
    return { ok: false, statusCode: 404, error: 'Order not found' }
  }
  return { ok: true, shouldTransition: order.status === 'pending_payment' }
}

