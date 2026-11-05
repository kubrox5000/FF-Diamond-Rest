import type { ReactNode } from 'react'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import FloatingSupport from '@/components/site/LazySupport'
import { getSettings } from '@/lib/settings'

type InfoSection = { title: string; body: ReactNode }

export async function InfoPage({ title, intro, sections }: { title: string; intro: string; sections: InfoSection[] }) {
  const settings = await getSettings()
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">FF Diamond LLC</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </header>
        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter settings={settings} />
      <FloatingSupport telegram={settings.telegram} discord={settings.discord} />
    </>
  )
}
