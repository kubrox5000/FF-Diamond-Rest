import type { Metadata } from 'next'
import { resolveServerLocale } from './locale-server'
import { t, type TKey } from './i18n'
import type { Lang } from './currencies'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ff-diamond.rest'

/**
 * Page title keys used to localize the browser tab / metadata <title>.
 */
export type PageTitleKey =
  | 'title_home'
  | 'title_topup'
  | 'title_track'
  | 'title_payment'
  | 'title_terms'
  | 'title_privacy'
  | 'title_refund'
  | 'title_delivery'

/** Canonical path per page. Dynamic routes carry no canonical (undefined). */
const pagePath: Record<PageTitleKey, string | undefined> = {
  title_home: '/',
  title_topup: '/top-up',
  title_track: '/track',
  title_payment: undefined,
  title_terms: '/terms',
  title_privacy: '/privacy',
  title_refund: '/refund',
  title_delivery: '/delivery',
}

const ogLocale: Partial<Record<Lang, string>> = {
  en: 'en_US',
  ar: 'ar_SA',
  fr: 'fr_FR',
  es: 'es_ES',
  pt: 'pt_PT',
  'pt-BR': 'pt_BR',
}

/**
 * Builds server-rendered, localized SEO metadata for a page: <title>,
 * meta description, canonical URL and Open Graph / Twitter tags — all in the
 * visitor's current language so the site reads correctly to search engines
 * in every market. The localized title is kept in sync client-side by the
 * <LocalizedTitle> island when the visitor switches language.
 */
export async function localizedPageMetadata(pageKey: PageTitleKey): Promise<Metadata> {
  const locale = await resolveServerLocale()
  const fullTitle = t(locale.lang, pageKey as TKey)
  const title = fullTitle ? `${fullTitle} — FF Diamond` : 'FF Diamond'
  const description = t(locale.lang, (pageKey.replace('title_', 'desc_')) as TKey)
  const path = pagePath[pageKey]
  const url = path ? new URL(path, siteUrl).toString() : undefined

  const isPrivate = pageKey === 'title_payment'
  const meta: Metadata = {
    title,
    description,
    robots: isPrivate ? { index: false, follow: false, googleBot: { index: false, follow: false } } : undefined,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      title,
      description,
      siteName: 'FF Diamond',
      type: 'website',
      locale: ogLocale[locale.lang] ?? 'en_US',
      ...(url ? { url } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
  return meta
}
