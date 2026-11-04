import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { LocalizedTitle } from '@/components/geo/LocalizedTitle'
import { getSettings } from '@/lib/settings'

export const revalidate = 300

export default async function CookiesPage() {
  const settings = await getSettings()
  return (
    <>
      <LocalizedTitle pageKey="title_privacy" />
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Cookie Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: January 1, 2026</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section><h2 className="text-lg font-bold text-foreground">What we use</h2><p className="mt-2">FF Diamond LLC uses essential cookies for language, currency, security, and session behavior. Optional analytics or advertising pixels may be enabled only through the site configuration.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">Why we use them</h2><p className="mt-2">Cookies help remember preferences, measure site performance, prevent abuse, and understand campaign results. We do not use cookies to collect Free Fire passwords or account credentials.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">Your choices</h2><p className="mt-2">You can restrict or delete cookies through your browser settings. Disabling essential cookies may affect language, currency, tracking, or checkout functionality.</p></section>
          <section><h2 className="text-lg font-bold text-foreground">Contact</h2><p className="mt-2">For privacy or cookie questions, contact support@ff-diamond.rest.</p></section>
        </div>
      </main>
      <SiteFooter settings={settings} />
      <FloatingSupport telegram={settings.telegram} discord={settings.discord} />
    </>
  )
}
