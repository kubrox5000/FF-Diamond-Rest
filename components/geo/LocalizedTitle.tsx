'use client'

import { useEffect } from 'react'
import { useLocale } from './GeoLocaleProvider'
import type { TKey } from '@/lib/i18n'

type TitleKey =
  | 'title_home'
  | 'title_topup'
  | 'title_track'
  | 'title_payment'
  | 'title_terms'
  | 'title_privacy'
  | 'title_refund'
  | 'title_delivery'

/**
 * Keeps the browser tab title in sync with the active language. Rendered as a
 * server-component-safe client island on each page.
 */
export function LocalizedTitle({ pageKey }: { pageKey: TitleKey }) {
  const { lang, t } = useLocale()

  useEffect(() => {
    const page = t(pageKey as TKey)
    document.title = page ? `${page} — FF Diamond` : 'FF Diamond'
  }, [lang, pageKey, t])

  return null
}
