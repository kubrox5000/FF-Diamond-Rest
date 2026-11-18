import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { packages } from '@/db/schemas'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { getMockPackage, listMockPackages } from '@/lib/mock-admin-store'
import {
  getOfficialPackage,
  normalizePackage,
  type OfficialPackage,
} from '@/lib/package-catalog'
import type { PublicPackage } from '@/lib/types'

export async function listStorefrontPackages(): Promise<OfficialPackage[]> {
  if (isDatabaseConfigured()) {
    try {
      const dbRows = await db
        .select()
        .from(packages)
        .where(eq(packages.active, true))
        .orderBy(asc(packages.sortOrder), asc(packages.id))
      if (dbRows.length > 0) {
        return dbRows.map((row) => normalizePackage(row as unknown as PublicPackage))
      }
    } catch {
      // Fall back to mock/official catalog when database is unavailable
    }
  }

  return listMockPackages()
    .filter((pkg) => pkg.active)
    .map((pkg) => normalizePackage(pkg))
}

export async function getStorefrontPackageById(packageId: number): Promise<OfficialPackage | undefined> {
  if (!Number.isInteger(packageId) || packageId <= 0) return undefined

  if (isDatabaseConfigured()) {
    try {
      const rows = await db
        .select()
        .from(packages)
        .where(eq(packages.id, packageId))
        .limit(1)
      const row = rows[0]
      if (row) {
        if (!row.active) return undefined
        const normalized = normalizePackage(row as unknown as PublicPackage)
        return normalized.priceCents > 0 ? normalized : undefined
      }
      const anyRow = await db.select({ id: packages.id }).from(packages).limit(1)
      if (anyRow.length > 0) return undefined
    } catch {
      // Fall back to mock/official catalog only if DB lookup fails
    }
  }

  const fallback = getMockPackage(packageId) ?? getOfficialPackage(packageId)
  if (!fallback || !fallback.active) return undefined
  const normalized = normalizePackage(fallback)
  return normalized.priceCents > 0 ? normalized : undefined
}
