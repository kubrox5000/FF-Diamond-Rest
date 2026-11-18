'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isSafeAnalyticsId, setClientTrackingConfig } from '@/lib/analytics'

// Injects official tracking snippets for GA4, Google Ads, TikTok Ads, and
// Snapchat Ads pixels from Admin Settings or environment variables.
// Tracking must never break the page, so everything is wrapped safely.
export function AdPixels() {
  const pathname = usePathname()

  useEffect(() => {
    let disposed = false

    fetch('/api/tracking')
      .then((r) => r.json())
      .then((d) => {
        if (disposed) return
        const gaId = typeof d.gaMeasurementId === 'string' ? d.gaMeasurementId.trim() : ''
        const googleAdsId = typeof d.googleAdsPixelId === 'string' ? d.googleAdsPixelId.trim() : ''
        const googleAdsLabel = typeof d.googleAdsConversionLabel === 'string' ? d.googleAdsConversionLabel.trim() : ''
        const tiktok = typeof d.tiktokPixelId === 'string' ? d.tiktokPixelId.trim() : ''
        const snap = typeof d.snapchatPixelId === 'string' ? d.snapchatPixelId.trim() : ''

        setClientTrackingConfig({
          gaMeasurementId: gaId,
          googleAdsPixelId: googleAdsId,
          googleAdsConversionLabel: googleAdsLabel,
        })

        if (gaId || googleAdsId) initGoogleTags(gaId, googleAdsId)
        if (tiktok) initTikTok(tiktok)
        if (snap) initSnapchat(snap)
        trackPage(pathname)
      })
      .catch(() => {})

    return () => {
      disposed = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Re-fire page views on every client-side route change.
    trackPage(pathname)
  }, [pathname])

  return null
}

interface AnalyticsWindow {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  ttq?: { page?: () => void }
  snaptr?: (...args: unknown[]) => void
}

function trackPage(url: string) {
  const w = typeof window !== 'undefined' ? (window as unknown as AnalyticsWindow) : null
  if (!w) return
  if (typeof w.gtag === 'function' && w.dataLayer) {
    try {
      w.gtag('event', 'page_view', { page_path: url })
    } catch {}
  }
  if (w.ttq && typeof w.ttq.page === 'function') {
    try {
      w.ttq.page()
    } catch {}
  }
  if (typeof w.snaptr === 'function') {
    try {
      w.snaptr('track', 'PAGE_VIEW')
    } catch {}
  }
}

/** Insert an external script tag once. */
function loadScript(src: string) {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${src}"]`)) return
  const script = document.createElement('script')
  script.async = true
  script.src = src
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript)
}

/** Insert an inline <script> block once. */
function injectCode(key: string, code: string) {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[data-pixel="${key}"]`)) return
  const script = document.createElement('script')
  script.setAttribute('data-pixel', key)
  script.type = 'text/javascript'
  script.text = code
  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript?.parentNode) firstScript.parentNode.insertBefore(script, firstScript)
}

// ── Google Analytics 4 + Google Ads (global site tag) ───────────────────────
function initGoogleTags(rawGaId: string, rawAdsId: string) {
  const validIds = [rawGaId, rawAdsId].filter((id, idx, arr) => isSafeAnalyticsId(id) && arr.indexOf(id) === idx)
  if (validIds.length === 0) return

  const primaryId = validIds[0]
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`)
  const configLines = validIds.map((id) => `gtag('config', '${id}', { send_page_view: false });`).join('\n')
  injectCode(
    'google-tags',
    `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
${configLines}
`,
  )
}

// ── TikTok Ads pixel — official base snippet ────────────────────────────────
function initTikTok(rawPixelId: string) {
  const pixelId = rawPixelId.trim()
  if (!isSafeAnalyticsId(pixelId)) return
  injectCode('tiktok', `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var s=document.createElement("script");s.type="text/javascript";s.async=!0;s.src=i+"&lib="+t;var f=document.getElementsByTagName("script")[0];f.parentNode.insertBefore(s,f)};
  var s=d.getElementsByTagName("script")[0];var n=d.createElement("script");n.async=true;n.src="https://analytics.tiktok.com/i18n/pixel/init.js";s.parentNode.insertBefore(n,s)
}(window, document, 'ttq');

ttq.load('${pixelId}');
ttq.page();
`)
}

// ── Snapchat Ads pixel — official base snippet ──────────────────────────────
function initSnapchat(rawPixelId: string) {
  const pixelId = rawPixelId.trim()
  if (!isSafeAnalyticsId(pixelId)) return
  injectCode('snapchat', `
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');

snaptr('init', '${pixelId}', {});
snaptr('track', 'PAGE_VIEW');
`)
}
