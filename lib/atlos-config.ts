export interface AtlosCredentials {
  merchantId?: string
  apiSecret?: string
}

interface AtlosSettings {
  atlosMerchantId?: string
  atlosApiSecret?: string
}

// All server entry points use this resolver, including payment-method visibility.
// Read saved settings on each resolution so admin changes follow settings invalidation.
export async function resolveAtlosCredentials(
  env: Record<string, string | undefined>,
  loadSettings: () => Promise<AtlosSettings>,
): Promise<AtlosCredentials> {
  const settings = await loadSettings()
  return {
    merchantId: env.ATLOS_MERCHANT_ID?.trim() ||
      env.NEXT_PUBLIC_ATLOS_MERCHANT_ID?.trim() ||
      settings.atlosMerchantId?.trim() || undefined,
    apiSecret: env.ATLOS_API_SECRET?.trim() ||
      settings.atlosApiSecret?.trim() || undefined,
  }
}

export function hasCompleteAtlosCredentials(credentials: AtlosCredentials): boolean {
  return Boolean(credentials.merchantId?.trim() && credentials.apiSecret?.trim())
}

