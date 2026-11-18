import 'server-only'
import { unstable_cache, revalidateTag as _revalidateTag } from 'next/cache'
const revalidateTag = (tag: string) => (_revalidateTag as (tag: string, ...args: unknown[]) => undefined)(tag)
import postgres from 'postgres'
import { detectSsl, isDatabaseConfigured, getActiveDatabaseUrl } from '@/lib/db-ssl'

export interface SiteSettings {
  siteName: string
  logo: string
  freeGift: string
  walletTrc20: string
  walletBep20: string
  binancePayId: string
  walletBtc: string
  walletEth: string
  walletBnb: string
  walletUsdc: string
  walletSol: string
  paymentWise: string
  paymentPayoneer: string
  paymentSkrill: string
  paymentNeteller: string
  paymentRedotpay: string
  paymentBybit: string
  paymentRevolut: string
  whatsapp: string
  telegram: string
  discord: string
  maintenance: boolean
  announcementAr: string
  announcementEn: string
  announcementFr: string
  announcementEs: string
  supportEmail: string
  phone: string
  address: string
  hours: string
  instagram: string
  facebook: string
  twitter: string
  youtube: string
  tiktok: string
  facebookPixelId: string
  gaMeasurementId: string
  googleAdsPixelId: string
  googleAdsConversionLabel: string
  tiktokPixelId: string
  snapchatPixelId: string
  telegramBotToken: string
  telegramChatId: string
  atlosMerchantId: string
  atlosApiSecret: string
  plisioApiKey: string
}

const DEFAULTS: SiteSettings = {
  siteName: 'FF Diamond',
  logo: '',
  freeGift: '',
  walletTrc20: '',
  walletBep20: '',
  binancePayId: '',
  walletBtc: '',
  walletEth: '',
  walletBnb: '',
  walletUsdc: '',
  walletSol: '',
  paymentWise: '',
  paymentPayoneer: '',
  paymentSkrill: '',
  paymentNeteller: '',
  paymentRedotpay: '',
  paymentBybit: '',
  paymentRevolut: '',
  whatsapp: '',
  telegram: '',
  discord: '',
  maintenance: false,
  announcementAr: 'خدمة مستقلة لشحن ماس فري فاير عبر معرّف اللاعب (UID) فقط',
  announcementEn: 'Independent Free Fire diamond top-up via Player UID only',
  announcementFr: 'Service indépendant de recharge Free Fire par ID joueur (UID) uniquement',
  announcementEs: 'Servicio independiente de recarga Free Fire solo con ID de jugador (UID)',
  supportEmail: 'support@ff-diamond.rest',
  phone: '+1 339 746 3729',
  address: '3215 Tenmile, Norfolk, VA 23513, United States',
  hours: 'Sun – Fri: 9:00 AM – 10:00 PM',
  instagram: '',
  facebook: '',
  twitter: '',
  youtube: '',
  tiktok: '',
  facebookPixelId: '',
  gaMeasurementId: '',
  googleAdsPixelId: '',
  googleAdsConversionLabel: '',
  tiktokPixelId: '',
  snapchatPixelId: '',
  telegramBotToken: '',
  telegramChatId: '',
  atlosMerchantId: '',
  atlosApiSecret: '',
  plisioApiKey: '',
}

function getRawSql() {
  const url = getActiveDatabaseUrl()
  if (!url) throw new Error('DATABASE_URL is not configured')
  return postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 20,
    ssl: detectSsl(url),
  })
}

function parseSettingsRaw(raw: string): Partial<SiteSettings> {
  try {
    const once = JSON.parse(raw)
    // Handle double-encoded: jsonb stores string value as "\"{ ... }\""
    const obj = typeof once === 'string' ? JSON.parse(once) : once
    return typeof obj === 'object' && obj !== null ? obj : {}
  } catch {
    return {}
  }
}

const globalForMockSettings = globalThis as unknown as {
  __ffMockSettings?: Partial<SiteSettings>
}

const LEGACY_MISLEADING_ANNOUNCEMENTS = new Set([
  'خصم يصل إلى 30% على باقات الماس المميزة',
  'Up to 30% OFF on premium diamond packages',
  "Jusqu'à 30% de réduction sur les packs de diamants premium",
  'Hasta 30% de descuento en paquetes de diamantes premium',
  'Flash Sale is LIVE! Up to 15% OFF on premium diamond packages.',
])

function sanitizeAnnouncements(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    announcementAr: LEGACY_MISLEADING_ANNOUNCEMENTS.has(settings.announcementAr.trim()) ? DEFAULTS.announcementAr : settings.announcementAr,
    announcementEn: LEGACY_MISLEADING_ANNOUNCEMENTS.has(settings.announcementEn.trim()) ? DEFAULTS.announcementEn : settings.announcementEn,
    announcementFr: LEGACY_MISLEADING_ANNOUNCEMENTS.has(settings.announcementFr.trim()) ? DEFAULTS.announcementFr : settings.announcementFr,
    announcementEs: LEGACY_MISLEADING_ANNOUNCEMENTS.has(settings.announcementEs.trim()) ? DEFAULTS.announcementEs : settings.announcementEs,
  }
}

async function readSettingsRaw(): Promise<SiteSettings> {
  if (!isDatabaseConfigured()) {
    return sanitizeAnnouncements({ ...DEFAULTS, ...(globalForMockSettings.__ffMockSettings ?? {}) })
  }
  let rawSql: ReturnType<typeof postgres> | null = null
  try {
    rawSql = getRawSql()
    const rows = await rawSql`SELECT data::text as raw FROM settings WHERE id = 1`
    await rawSql.end()
    if (rows.length === 0) return DEFAULTS
    return sanitizeAnnouncements({ ...DEFAULTS, ...parseSettingsRaw(rows[0].raw) })
  } catch (err) {
    console.warn('[settings] readSettingsRaw error:', err)
    if (rawSql) {
      try { await rawSql.end() } catch { /* ignore */ }
    }
    return DEFAULTS
  }
}

// Cached 60s so the root layout doesn't hit the DB on every page load.
// Admin saves invalidate the 'settings' tag.
const getSettingsCached = unstable_cache(readSettingsRaw, ['site-settings-v2'], {
  revalidate: 60,
  tags: ['settings'],
})

export async function getSettings(): Promise<SiteSettings> {
  if (!isDatabaseConfigured()) return readSettingsRaw()
  return getSettingsCached()
}

export async function saveSettings(data: Partial<SiteSettings>): Promise<SiteSettings> {
  if (!isDatabaseConfigured()) {
    const merged = { ...DEFAULTS, ...(globalForMockSettings.__ffMockSettings ?? {}), ...data }
    globalForMockSettings.__ffMockSettings = merged
    return merged
  }

  const rawSql = getRawSql()
  try {
    // Read current values directly from DB (bypasses all caching)
    const rows = await rawSql`SELECT data::text as raw FROM settings WHERE id = 1`
    const storedData = rows.length > 0 ? parseSettingsRaw(rows[0].raw) : {}
    const merged = { ...DEFAULTS, ...storedData, ...data }

    if (rows.length === 0) {
      await rawSql`INSERT INTO settings (id, data) VALUES (1, ${rawSql.json(merged)})`
    } else {
      await rawSql`UPDATE settings SET data = ${rawSql.json(merged)}, updated_at = NOW() WHERE id = 1`
    }

    revalidateTag('settings')
    return merged
  } catch (err) {
    console.error('[settings] saveSettings error:', err)
    // رفع الخطأ للـ route كي يُعيد 500 للواجهة بدلاً من إيهام المستخدم بنجاح الحفظ
    throw err
  } finally {
    try { await rawSql.end() } catch { /* ignore */ }
  }
}
