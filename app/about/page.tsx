import { InfoPage } from '@/components/site/InfoPage'

export default function AboutPage() {
  return <InfoPage title="About FF Diamond" intro="FF Diamond LLC is an independent digital gaming top-up service. We help customers purchase supported Free Fire diamond packages using the Player UID they provide." sections={[
    { title: 'Our service', body: <p>Customers select a package, enter a Player UID, choose an available payment method, and receive digital delivery after payment confirmation and validation. We do not require game passwords or account credentials.</p> },
    { title: 'Independent business disclosure', body: <p>FF Diamond is not affiliated with, endorsed by, or officially connected to Garena or Free Fire unless a separate, valid written authorization is explicitly published. Free Fire is referenced only to identify the product being requested.</p> },
    { title: 'Business identity', body: <p>Legal name: FF Diamond LLC. Country: United States. Address: 3215 Tenmile, Norfolk, VA 23513, United States.</p> },
  ]} />
}
