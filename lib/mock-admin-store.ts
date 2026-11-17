import 'server-only'
import type { PublicPackage, PublicPaymentMethod } from '@/lib/types'
import { OFFICIAL_PACKAGE_CATALOG } from '@/lib/package-catalog'
import { SEED_PAYMENT_METHODS } from '@/lib/seed-data'
import { hashPassword, verifyPassword } from '@/lib/auth'

export interface MockCoupon {
  id: number
  code: string
  discountPct: number
  active: boolean
  maxUses: number | null
  usedCount: number
}

interface MockAdminAccount {
  id: number
  username: string
  passwordHash: string
}

const globalForAdminStore = globalThis as unknown as {
  __ffMockPackages?: PublicPackage[]
  __ffMockPackageSeq?: number
  __ffMockPaymentMethods?: PublicPaymentMethod[]
  __ffMockPaymentMethodSeq?: number
  __ffMockCoupons?: MockCoupon[]
  __ffMockAdmin?: MockAdminAccount
}

function getPackagesStore(): PublicPackage[] {
  if (!globalForAdminStore.__ffMockPackages) {
    globalForAdminStore.__ffMockPackages = OFFICIAL_PACKAGE_CATALOG.map((p) => ({
      id: p.id,
      diamonds: p.diamonds,
      bonusDiamonds: p.bonusDiamonds,
      priceUsd: p.priceUsd,
      priceUsdt: p.priceUsdt,
      discountPct: p.discountPct,
      popular: p.popular,
      flashSale: p.flashSale,
      deliveryEta: p.deliveryEta,
      active: p.active,
      sortOrder: p.sortOrder,
    }))
    globalForAdminStore.__ffMockPackageSeq = globalForAdminStore.__ffMockPackages.length
  }
  return globalForAdminStore.__ffMockPackages
}

export function listMockPackages(): PublicPackage[] {
  return [...getPackagesStore()].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

export function getMockPackage(id: number): PublicPackage | undefined {
  return getPackagesStore().find((p) => p.id === id)
}

export function createMockPackage(input: Omit<PublicPackage, 'id'>): PublicPackage {
  const store = getPackagesStore()
  globalForAdminStore.__ffMockPackageSeq = (globalForAdminStore.__ffMockPackageSeq ?? store.length) + 1
  const created: PublicPackage = { ...input, id: globalForAdminStore.__ffMockPackageSeq }
  store.push(created)
  return created
}

export function updateMockPackage(id: number, patch: Partial<Omit<PublicPackage, 'id'>>): PublicPackage | null {
  const store = getPackagesStore()
  const idx = store.findIndex((p) => p.id === id)
  if (idx === -1) return null
  store[idx] = { ...store[idx], ...patch }
  return store[idx]
}

export function deleteMockPackage(id: number): boolean {
  const store = getPackagesStore()
  const idx = store.findIndex((p) => p.id === id)
  if (idx === -1) return false
  store.splice(idx, 1)
  return true
}

function getPaymentMethodsStore(): PublicPaymentMethod[] {
  if (!globalForAdminStore.__ffMockPaymentMethods) {
    globalForAdminStore.__ffMockPaymentMethods = SEED_PAYMENT_METHODS.map((m) => ({ ...m }))
    globalForAdminStore.__ffMockPaymentMethodSeq = globalForAdminStore.__ffMockPaymentMethods.length
  }
  return globalForAdminStore.__ffMockPaymentMethods
}

export function listMockPaymentMethods(): PublicPaymentMethod[] {
  return [...getPaymentMethodsStore()].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

export function createMockPaymentMethod(input: Omit<PublicPaymentMethod, 'id'>): PublicPaymentMethod {
  const store = getPaymentMethodsStore()
  if (store.some((m) => m.key === input.key)) {
    throw new Error('duplicate key')
  }
  globalForAdminStore.__ffMockPaymentMethodSeq = (globalForAdminStore.__ffMockPaymentMethodSeq ?? store.length) + 1
  const created: PublicPaymentMethod = { ...input, id: globalForAdminStore.__ffMockPaymentMethodSeq }
  store.push(created)
  return created
}

export function updateMockPaymentMethod(id: number, patch: Partial<Omit<PublicPaymentMethod, 'id'>>): PublicPaymentMethod | null {
  const store = getPaymentMethodsStore()
  const idx = store.findIndex((m) => m.id === id)
  if (idx === -1) return null
  if (patch.key && store.some((m) => m.id !== id && m.key === patch.key)) {
    throw new Error('duplicate key')
  }
  store[idx] = { ...store[idx], ...patch }
  return store[idx]
}

export function deleteMockPaymentMethod(id: number): boolean {
  const store = getPaymentMethodsStore()
  const idx = store.findIndex((m) => m.id === id)
  if (idx === -1) return false
  store.splice(idx, 1)
  return true
}

function getCouponsStore(): MockCoupon[] {
  if (!globalForAdminStore.__ffMockCoupons) {
    globalForAdminStore.__ffMockCoupons = [
      { id: 1, code: 'WELCOME10', discountPct: 10, active: true, maxUses: 1000, usedCount: 0 },
      { id: 2, code: 'FLASH15', discountPct: 15, active: true, maxUses: 500, usedCount: 0 },
    ]
  }
  return globalForAdminStore.__ffMockCoupons
}

export function findMockCoupon(code: string): MockCoupon | undefined {
  const normalized = code.trim().toUpperCase()
  return getCouponsStore().find((c) => c.code === normalized)
}

export function incrementMockCouponUsage(id: number): void {
  const coupon = getCouponsStore().find((c) => c.id === id)
  if (coupon) coupon.usedCount += 1
}

export async function getMockAdmin(): Promise<MockAdminAccount> {
  if (!globalForAdminStore.__ffMockAdmin) {
    globalForAdminStore.__ffMockAdmin = {
      id: 1,
      username: 'admin',
      passwordHash: await hashPassword('admin123'),
    }
  }
  return globalForAdminStore.__ffMockAdmin
}

export async function verifyMockAdmin(username: string, password: string): Promise<MockAdminAccount | null> {
  const admin = await getMockAdmin()
  if (username !== admin.username) return null
  const valid = await verifyPassword(password, admin.passwordHash)
  return valid ? admin : null
}

export async function updateMockAdmin(patch: { username?: string; newPassword?: string }): Promise<MockAdminAccount> {
  const admin = await getMockAdmin()
  if (patch.username) admin.username = patch.username
  if (patch.newPassword) admin.passwordHash = await hashPassword(patch.newPassword)
  return admin
}
