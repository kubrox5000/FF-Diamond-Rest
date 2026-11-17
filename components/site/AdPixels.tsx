'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Injects the official, full tracking snippets for Google Ads, TikTok Ads and
// Snapchat Ads pixels from the IDs stored in admin Settings. Loads the IDs from
// /api/tracking and fires page views on every client-side route change.
// Tracking must never break the page, so everything is wrapped safely.
export function AdPixels() {
  const pathname = usePathname()

  useEffect(() => {
    let disposed = false

    fetch('/api/tracking')
      .then((r) => r.json())
      .then((d) => {
        if (disposed) return
        const google = d.googleAdsPixelId || ''
        const tiktok = d.tiktokPixelId || ''
        const snap = d.snapchatPixelId || ''
        if (google) initGoogleAds(google)
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
    const w = typeof window !== 'undefined' ? (window as any) : null
    if (!w) return
    if (typeof w.gtag === 'function' && w.dataLayer) { try { w.gtag('event', 'page_view') } catch {} }
    if (w.ttq && typeof w.ttq.page === 'function') { try { w.ttq.page() } catch {} }
    if (typeof w.snaptr === 'function') { try { w.snaptr('track', 'PAGE_VIEW') } catch {} }
  }, [pathname])

  return null
}

function trackPage(_url: string) {
  const w = typeof window !== 'undefined' ? (window as any) : null
  if (!w) return
  if (typeof w.gtag === 'function' && w.dataLayer) { try { w.gtag('event', 'page_view') } catch {} }
  if (w.ttq && typeof w.ttq.page === 'function') { try { w.ttq.page() } catch {} }
  if (typeof w.snaptr === 'function') { try { w.snaptr('track', 'PAGE_VIEW') } catch {} }
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

/** Insert an inline <script> block once (exact official snippet). */
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

function isSafePixelId(id: string): boolean {
  return /^[A-Za-z0-9_-]{3,64}$/.test(id.trim())
}

// ── Google Ads (global site tag) ────────────────────────────────────────────
// Official snippet: loads gtag.js and configures the measurement/conversion ID.
function initGoogleAds(rawId: string) {
  const id = rawId.trim()
  if (!isSafePixelId(id)) return
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`)
  injectCode('google-ads', `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');
`)
}

// ── TikTok Ads pixel — official base snippet ────────────────────────────────
function initTikTok(rawPixelId: string) {
  const pixelId = rawPixelId.trim()
  if (!isSafePixelId(pixelId)) return
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
  if (!isSafePixelId(pixelId)) return
  injectCode('snapchat', `
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');

snaptr('init', '${pixelId}', {});
snaptr('track', 'PAGE_VIEW');
`)
}
