import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Public: advertising pixel / GA4 tracking IDs used by the client-side trackers.
export async function GET() {
  const s = await getSettings()
  return NextResponse.json({
    facebookPixelId: s.facebookPixelId || '',
    gaMeasurementId:
      s.gaMeasurementId ||
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.GA_MEASUREMENT_ID ||
      '',
    googleAdsPixelId:
      s.googleAdsPixelId ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ||
      process.env.GOOGLE_ADS_ID ||
      '',
    googleAdsConversionLabel:
      s.googleAdsConversionLabel ||
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL ||
      process.env.GOOGLE_ADS_CONVERSION_LABEL ||
      '',
    tiktokPixelId: s.tiktokPixelId || '',
    snapchatPixelId: s.snapchatPixelId || '',
  })
}
