import { InfoPage } from '@/components/site/InfoPage'

export default function ContactPage() {
  return <InfoPage title="Contact Us" intro="Contact FF Diamond LLC about an existing order, payment status, delivery delay, or refund request." sections={[
    { title: 'Support channels', body: <p>Email: <a className="text-primary underline" href="mailto:support@ff-diamond.rest">support@ff-diamond.rest</a><br />Phone: <a className="text-primary underline" href="tel:+13397463729">+1 339 746 3729</a></p> },
    { title: 'Support hours', body: <p>Sun–Fri, 9:00 AM–10:00 PM. Messages received outside these hours are handled during the next support period.</p> },
    { title: 'What to include', body: <p>For order help, include your order number. Do not send your Free Fire password, recovery codes, or private account credentials.</p> },
  ]} />
}
