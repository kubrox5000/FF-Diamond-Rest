import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { AgentationGuard } from '@/components/AgentationGuard';
import { HappySeedsWatermark } from '@/components/HappySeedsWatermark';
import { FacebookPixel } from '@/components/site/FacebookPixel';
import { AdPixels } from '@/components/site/AdPixels';
import { GeoLocaleProvider } from '@/components/geo/GeoLocaleProvider';
import { PageProgress } from '@/components/site/PageProgress';
import { resolveServerLocale } from '@/lib/locale-server';
import { dirOf } from '@/lib/currencies';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';
import jsonMetadata from '../metadata.json';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',    // يعرض النص فوراً بخط النظام ثم يبدّل — يمنع FOIT
  preload: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,     // Mono غير ضروري في اللود الأول
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050507',
}

export const metadata: Metadata = {
  ...jsonMetadata,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ff-diamond.rest'),
  applicationName: 'FF Diamond',
  openGraph: {
    title: jsonMetadata.title,
    description: jsonMetadata.description,
    type: 'website',
    siteName: 'FF Diamond',
    images: ['/icon.png'],
  },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  twitter: {
    card: 'summary_large_image',
    title: jsonMetadata.title,
    description: jsonMetadata.description,
    images: ['/icon.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await resolveServerLocale();
  return (
    <html lang={initialLocale.lang} dir={dirOf(initialLocale.lang)} className="dark" suppressHydrationWarning>
      <head>
        {/* ── Performance hints ────────────────────────────────────────────── */}
        {/* DNS prefetch + preconnect للخطوط وأي CDN خارجي */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* اتصال مسبق لشبكات التتبع — يُحمِّل سكربتاتها أسرع دون إبطاء الصفحة */}
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://googletagmanager.com" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        <link rel="dns-prefetch" href="https://sc-static.net" />
        {/* Inject brand data before any JS runs — eliminates the /api/site-brand fetch */}
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        <Script
          src="https://shown.io/metrics/Aq8dlRyN8K"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* شريط التقدم عند الانتقال بين الصفحات */}
        <PageProgress />
        <GeoLocaleProvider initialLocale={initialLocale}>{children}</GeoLocaleProvider>
        <Toaster position="top-center" richColors closeButton />
        <FacebookPixel />
        <AdPixels />
        <HappySeedsWatermark />
        <AgentationGuard />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
