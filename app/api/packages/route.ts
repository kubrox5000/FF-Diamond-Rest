import { NextResponse } from 'next/server'
import { OFFICIAL_PACKAGE_CATALOG } from '@/lib/package-catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ packages: OFFICIAL_PACKAGE_CATALOG })
}

