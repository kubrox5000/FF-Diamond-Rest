import { NextRequest, NextResponse } from 'next/server'
import { getAtlosCredentials } from '@/lib/atlos'
import { enforceRateLimit } from '@/lib/distributed-rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(req, 'payments:atlos-config', 30, 60)
  if (rateLimitResponse) return rateLimitResponse

  const { merchantId } = await getAtlosCredentials()
  const activeMerchantId = merchantId || null
  return NextResponse.json({
    configured: Boolean(activeMerchantId),
    merchantId: activeMerchantId,
  })
}
