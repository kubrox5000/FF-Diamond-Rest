import 'server-only'
import type { Order } from '@/db/schemas'
import { getOfficialPackage } from '@/lib/package-catalog'

const globalForMockOrders = globalThis as unknown as {
  __ffMockOrders?: Map<string, Order>
  __ffMockOrderSeq?: number
}

function getStore(): Map<string, Order> {
  if (!globalForMockOrders.__ffMockOrders) {
    globalForMockOrders.__ffMockOrders = new Map<string, Order>()
  }
  return globalForMockOrders.__ffMockOrders
}

export function createMockOrder(input: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
  const store = getStore()
  globalForMockOrders.__ffMockOrderSeq = (globalForMockOrders.__ffMockOrderSeq ?? 0) + 1
  const now = new Date()
  const order: Order = {
    ...input,
    id: globalForMockOrders.__ffMockOrderSeq,
    createdAt: now,
    updatedAt: now,
  }
  store.set(order.orderNumber, order)
  return order
}

export function getMockOrder(orderNumber: string): Order | null {
  return getStore().get(orderNumber.trim()) ?? null
}

export function getMockOrderById(id: number): Order | null {
  for (const o of getStore().values()) {
    if (o.id === id) return o
  }
  return null
}

export function updateMockOrder(
  orderNumber: string,
  patch: Partial<Order>,
): Order | null {
  const store = getStore()
  const existing = store.get(orderNumber.trim())
  if (!existing) return null
  const updated: Order = {
    ...existing,
    ...patch,
    updatedAt: new Date(),
  }
  store.set(existing.orderNumber, updated)
  return updated
}

export function transitionMockOrderStatus(
  orderNumber: string,
  allowedFrom: readonly string[],
  patch: Partial<Order> & { status: string },
): Order | null {
  const store = getStore()
  const existing = store.get(orderNumber.trim())
  if (!existing || !allowedFrom.includes(existing.status)) return null
  const updated: Order = {
    ...existing,
    ...patch,
    updatedAt: new Date(),
  }
  store.set(existing.orderNumber, updated)
  return updated
}

export function updateMockOrderById(id: number, patch: Partial<Order>): Order | null {
  const existing = getMockOrderById(id)
  if (!existing) return null
  return updateMockOrder(existing.orderNumber, patch)
}

export function deleteMockOrderById(id: number): Order | null {
  const store = getStore()
  const existing = getMockOrderById(id)
  if (!existing) return null
  store.delete(existing.orderNumber)
  return existing
}

export function listMockOrders(filter?: { status?: string; q?: string; limit?: number }): Order[] {
  const status = filter?.status?.trim()
  const q = filter?.q?.trim().toLowerCase()
  const limit = filter?.limit ?? 200

  let rows = Array.from(getStore().values())
  if (status && status !== 'all') {
    rows = rows.filter((o) => o.status === status)
  }
  if (q) {
    rows = rows.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.playerUid.toLowerCase().includes(q) ||
        (o.txId ?? '').toLowerCase().includes(q),
    )
  }
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return rows.slice(0, limit)
}

export function deleteMockOrders(filter?: { status?: string; q?: string }): number {
  const matches = listMockOrders({ status: filter?.status, q: filter?.q, limit: Number.MAX_SAFE_INTEGER })
  const store = getStore()
  for (const o of matches) {
    store.delete(o.orderNumber)
  }
  return matches.length
}

export function getMockOrderStats() {
  const all = Array.from(getStore().values())
  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfMonth = new Date(now)
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

  const paidStatuses = new Set(['paid', 'processing', 'completed'])
  const amt = (o: Order) => Number.parseFloat(o.amountUsd) || 0
  const ts = (o: Order) => new Date(o.createdAt).getTime()

  const todayOrders = all.filter((o) => ts(o) >= startOfDay.getTime()).length
  const paidOrders = all.filter((o) => paidStatuses.has(o.status))
  const revenue = paidOrders.reduce((s, o) => s + amt(o), 0)
  const revenueToday = paidOrders.filter((o) => ts(o) >= startOfDay.getTime()).reduce((s, o) => s + amt(o), 0)
  const revenueWeek = paidOrders.filter((o) => ts(o) >= startOfWeek.getTime()).reduce((s, o) => s + amt(o), 0)
  const revenueMonth = paidOrders.filter((o) => ts(o) >= startOfMonth.getTime()).reduce((s, o) => s + amt(o), 0)
  const pending = all.filter((o) => o.status === 'pending_payment' || o.status === 'payment_review').length
  const completed = all.filter((o) => o.status === 'completed').length
  const cancelled = all.filter((o) => o.status === 'cancelled').length
  const total = all.length

  const dailyMap = new Map<string, { day: string; revenue: number; orders: number }>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dailyMap.set(key, { day: key, revenue: 0, orders: 0 })
  }
  for (const o of all) {
    const d = new Date(o.createdAt)
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const bucket = dailyMap.get(key)
    if (bucket) {
      bucket.orders += 1
      if (paidStatuses.has(o.status)) bucket.revenue += amt(o)
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyMap = new Map<string, { month: string; revenue: number }>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = monthNames[d.getMonth()]
    monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, { month: label, revenue: 0 })
  }
  for (const o of paidOrders) {
    const d = new Date(o.createdAt)
    const bucket = monthlyMap.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.revenue += amt(o)
  }

  const topMap = new Map<number, { diamonds: number; sold: number }>()
  for (const o of paidOrders) {
    const pkg = getOfficialPackage(o.packageId)
    const diamonds = pkg?.diamonds ?? o.diamonds
    const prev = topMap.get(o.packageId) ?? { diamonds, sold: 0 }
    prev.sold += 1
    topMap.set(o.packageId, prev)
  }
  const top = Array.from(topMap.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6)
    .map((r) => ({ name: `${r.diamonds} 💎`, sold: r.sold }))

  const recent = [...all]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return {
    stats: {
      todayOrders,
      revenue,
      revenueToday,
      revenueWeek,
      revenueMonth,
      pending,
      completed,
      cancelled,
      total,
    },
    daily: Array.from(dailyMap.values()),
    monthly: Array.from(monthlyMap.values()),
    top,
    recent,
  }
}
