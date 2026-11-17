import { NextResponse } from 'next/server'
import { db } from '@/db'
import { packages } from '@/db/schemas'
import { eq, asc } from 'drizzle-orm'
import { isDatabaseConfigured } from '@/lib/db-ssl'
import { listMockPackages } from '@/lib/mock-admin-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (isDatabaseConfigured()) {
    try {
      const rows = await db.select().from(packages).where(eq(packages.active, true)).orderBy(asc(packages.sortOrder))
      if (rows.length > 0) return NextResponse.json({ packages: rows })
    } catch {
      // fallback
    }
  }
  return NextResponse.json({ packages: listMockPackages().filter((p) => p.active) })
}

