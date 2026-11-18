// Client-safe GA4 & Google Ads conversion tracking helpers (zero PII).

export const PAID_CONVERSION_STATUSES = new Set(['paid', 'processing', 'completed'])

const PURCHASE_STORAGE_PREFIX = 'ff_ga_purchase_'
const firedPurchaseIds = new Set<string>()

export interface TrackingConfig {
  gaMeasurementId?: string
  googleAdsPixelId?: string
  googleAdsConversionLabel?: string
}

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface BeginCheckoutInput {
  packageId: number
  diamonds: number
  amountUsd: number | string
}

export interface PurchaseOrderInput {
  orderNumber: string
  amountUsd: number | string
  status: string
  packageId?: number
  diamonds?: number
}

export type GtagFn = (...args: unknown[]) => void

export function isSafeAnalyticsId(id?: string | null): id is string {
  if (typeof id !== 'string') return false
  return /^[A-Za-z0-9_-]{3,64}$/.test(id.trim())
}

export function isPaidConversionOrderStatus(status: unknown): boolean {
  return typeof status === 'string' && PAID_CONVERSION_STATUSES.has(status.trim())
}

function roundUsd2(value: number | string): number | null {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return Math.round((numeric + Number.EPSILON) * 100) / 100
}

export function buildBeginCheckoutPayload(input: BeginCheckoutInput): Record<string, unknown> | null {
  const value = roundUsd2(input.amountUsd)
  if (value === null || !Number.isInteger(input.packageId) || input.packageId <= 0) return null
  return {
    currency: 'USD',
    value,
    items: [
      {
        item_id: String(input.packageId),
        item_name: `${Math.max(0, Math.round(input.diamonds))} Free Fire Diamonds`,
        price: value,
        quantity: 1,
      },
    ],
  }
}

export function buildPurchasePayload(order: PurchaseOrderInput): {
  transaction_id: string
  value: number
  currency: 'USD'
  items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>
} | null {
  if (!isPaidConversionOrderStatus(order.status)) return null
  const transactionId = typeof order.orderNumber === 'string' ? order.orderNumber.trim() : ''
  const value = roundUsd2(order.amountUsd)
  if (!transactionId || value === null) return null

  const payload: {
    transaction_id: string
    value: number
    currency: 'USD'
    items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>
  } = {
    transaction_id: transactionId,
    value,
    currency: 'USD',
  }

  if (
    typeof order.packageId === 'number' &&
    Number.isInteger(order.packageId) &&
    order.packageId > 0 &&
    typeof order.diamonds === 'number' &&
    order.diamonds > 0
  ) {
    payload.items = [
      {
        item_id: String(order.packageId),
        item_name: `${Math.round(order.diamonds)} Free Fire Diamonds`,
        price: value,
        quantity: 1,
      },
    ]
  }

  return payload
}

export function buildGoogleAdsConversionPayload(
  order: PurchaseOrderInput,
  config: TrackingConfig,
): { send_to: string; value: number; currency: 'USD'; transaction_id: string } | null {
  const purchase = buildPurchasePayload(order)
  if (!purchase) return null
  const adsId = config.googleAdsPixelId?.trim()
  const label = config.googleAdsConversionLabel?.trim()
  if (!isSafeAnalyticsId(adsId) || !isSafeAnalyticsId(label)) return null
  return {
    send_to: `${adsId}/${label}`,
    value: purchase.value,
    currency: 'USD',
    transaction_id: purchase.transaction_id,
  }
}

export function hasFiredPurchase(transactionId: string, storage?: StorageLike | null): boolean {
  const id = transactionId.trim()
  if (!id) return true
  if (firedPurchaseIds.has(id)) return true
  try {
    return storage?.getItem(`${PURCHASE_STORAGE_PREFIX}${id}`) === '1'
  } catch {
    return false
  }
}

export function markPurchaseFired(transactionId: string, storage?: StorageLike | null): void {
  const id = transactionId.trim()
  if (!id) return
  firedPurchaseIds.add(id)
  try {
    storage?.setItem(`${PURCHASE_STORAGE_PREFIX}${id}`, '1')
  } catch {
    // Ignore storage quota/private-mode errors; memory set still prevents duplicate events in session.
  }
}

export function trackVerifiedPurchaseOnce(
  order: PurchaseOrderInput,
  gtagFn: GtagFn | null | undefined,
  config: TrackingConfig = {},
  storage?: StorageLike | null,
): boolean {
  if (typeof gtagFn !== 'function') return false
  const payload = buildPurchasePayload(order)
  if (!payload) return false
  if (hasFiredPurchase(payload.transaction_id, storage)) return false

  markPurchaseFired(payload.transaction_id, storage)
  try {
    gtagFn('event', 'purchase', payload)
    const adsConversion = buildGoogleAdsConversionPayload(order, config)
    if (adsConversion) {
      gtagFn('event', 'conversion', adsConversion)
    }
  } catch {
    // Tracking must never break checkout or confirmation pages.
  }
  return true
}

export function resetPurchaseTrackingCacheForTests(): void {
  firedPurchaseIds.clear()
}

let cachedTrackingConfig: TrackingConfig | null = null
let pendingTrackingConfigPromise: Promise<TrackingConfig> | null = null

export function setClientTrackingConfig(config: TrackingConfig): void {
  cachedTrackingConfig = {
    gaMeasurementId: config.gaMeasurementId?.trim() || '',
    googleAdsPixelId: config.googleAdsPixelId?.trim() || '',
    googleAdsConversionLabel: config.googleAdsConversionLabel?.trim() || '',
  }
}

export async function getClientTrackingConfig(): Promise<TrackingConfig> {
  if (cachedTrackingConfig) return cachedTrackingConfig
  if (typeof window === 'undefined') return {}
  if (!pendingTrackingConfigPromise) {
    pendingTrackingConfigPromise = fetch('/api/tracking')
      .then((r) => r.json())
      .then((d: TrackingConfig) => {
        const cfg: TrackingConfig = {
          gaMeasurementId: d.gaMeasurementId?.trim() || '',
          googleAdsPixelId: d.googleAdsPixelId?.trim() || '',
          googleAdsConversionLabel: d.googleAdsConversionLabel?.trim() || '',
        }
        cachedTrackingConfig = cfg
        return cfg
      })
      .catch(() => ({}))
  }
  return pendingTrackingConfigPromise
}

function getBrowserGtag(): GtagFn | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { gtag?: GtagFn; dataLayer?: unknown[] }
  if (typeof w.gtag === 'function' && w.dataLayer) return w.gtag
  return null
}

export function fireBeginCheckout(input: BeginCheckoutInput): void {
  const gtag = getBrowserGtag()
  if (!gtag) return
  const payload = buildBeginCheckoutPayload(input)
  if (!payload) return
  try {
    gtag('event', 'begin_checkout', payload)
  } catch {
    // Ignore tracking failures.
  }
}

export async function fireVerifiedPurchase(order: PurchaseOrderInput): Promise<boolean> {
  if (!isPaidConversionOrderStatus(order.status)) return false
  const config = await getClientTrackingConfig()
  const gtag = getBrowserGtag()
  if (!gtag) return false
  const storage = typeof window !== 'undefined' ? window.localStorage : null
  return trackVerifiedPurchaseOnce(order, gtag, config, storage)
}
