import { InfoPage } from '@/components/site/InfoPage'

export default function DisclaimerPage() {
  return <InfoPage title="Disclaimer" intro="Please read this disclosure before purchasing a digital top-up." sections={[
    { title: 'Independent service', body: <p>FF Diamond is an independent digital gaming top-up service. It is not affiliated with, endorsed by, or officially connected to Garena or Free Fire unless explicitly stated and documented.</p> },
    { title: 'Product references', body: <p>Free Fire and related names are referenced to identify the requested game product. Customers should review the game publisher’s terms and use top-up services only where permitted.</p> },
    { title: 'No absolute guarantees', body: <p>Delivery estimates, payment availability, and account outcomes can be affected by providers, networks, validation, or incorrect information. We do not promise instant delivery, uninterrupted service, or account outcomes.</p> },
  ]} />
}
