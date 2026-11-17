'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Fire the configured Facebook Pixel. Loads the ID from /api/tracking and,
// if set, injects the fbq snippet and tracks PageView on every route change.
export function FacebookPixel() {
  const pathname = usePathname()

  useEffect(() => {
    let disposed = false
    let pixelId = ''

    fetch('/api/tracking')
      .then((r) => r.json())
      .then((d) => {
        if (disposed) return
        pixelId = typeof d.facebookPixelId === 'string' ? d.facebookPixelId.trim() : ''
        if (!/^[A-Za-z0-9_-]{3,64}$/.test(pixelId)) return
        initPixel(pixelId)
        trackPage(pathname)
      })
      .catch(() => {}) // tracking must never break the page

    return () => {
      disposed = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Re-fire PageView on every client-side route change.
    if (typeof window !== 'undefined' && (window as any).fbq) {
      trackPage(pathname)
    }
  }, [pathname])

  return null
}

function initPixel(pixelId: string) {
  if (typeof window === 'undefined') return
  const w = window as any
  if (w.fbq) return // already initialised

  // Official Facebook Pixel base snippet
  const fbq: any = function(...args: any[]) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args) }
  if (!w._fbq) w._fbq = fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  w.fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript)

  w.fbq('init', pixelId)
  w.fbq('track', 'PageView')
}

function trackPage(url: string) {
  const w = window as any
  if (!w.fbq) return
  w.fbq('track', 'PageView', { page: url })
}