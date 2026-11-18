import { NextResponse } from 'next/server'
import { listStorefrontPackages } from '@/lib/packages-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pkgRows = await listStorefrontPackages()
  return NextResponse.json({ packages: pkgRows })
}
