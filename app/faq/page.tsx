import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { FaqSection } from '@/components/site/FaqSection'
import { getSettings } from '@/lib/settings'

export default async function FaqPage() {
  const settings = await getSettings()
  return <><SiteNav /><main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">FF Diamond LLC</p><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Frequently Asked Questions</h1><p className="mt-4 text-sm text-muted-foreground">Clear answers about delivery, payment, account information, refunds, tracking, and support.</p><div className="mt-8"><FaqSection /></div></main><SiteFooter settings={settings} /><FloatingSupport telegram={settings.telegram} discord={settings.discord} /></>
}
