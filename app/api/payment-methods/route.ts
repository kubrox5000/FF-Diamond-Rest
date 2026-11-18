import { NextResponse } from 'next/server'
import { listStorefrontPaymentMethods } from '@/lib/payment-methods-server'

export const dynamic = 'force-dynamic'

// Public: active payment methods shown on the store & payment page.
export async function GET() {
  const methods = await listStorefrontPaymentMethods()
  return NextResponse.json({
    methods: methods.map((m) => ({
      key: m.key,
      label: m.label,
      network: m.network,
      cat: m.cat,
      icon: m.icon,
    })),
  })
}
