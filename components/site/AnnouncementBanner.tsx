'use client'

import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useLocale } from '@/components/geo/GeoLocaleProvider'

export function AnnouncementBanner({ announcements }: { announcements: Record<string, string> }) {
  const { t, lang } = useLocale()
  const [show, setShow] = useState(true)
  const text = announcements[lang]?.trim() || announcements.en?.trim() || ''
  if (!text || !show) return null
  return (
    <div className="relative overflow-hidden border-b border-gold/20 bg-gradient-to-r from-primary/20 via-accent/20 to-gold/10">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2 text-center text-xs font-medium sm:text-sm">
        <Megaphone className="h-4 w-4 shrink-0 text-gold" />
        <span>{text}</span>
      </div>
      <button
        onClick={() => setShow(false)}
        className="absolute end-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={t('announcement_dismiss')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
