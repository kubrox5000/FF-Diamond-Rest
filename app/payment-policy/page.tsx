import { InfoPage } from '@/components/site/InfoPage'

export default function PaymentPolicyPage() {
  return <InfoPage title="Payment Policy" intro="Payment options are shown only when they are enabled for the checkout configuration. The final payable amount and network are shown before you submit an order." sections={[
    { title: 'Supported methods', body: <p>Current supported cryptocurrency methods are USDT, BTC, ETH, SOL, LTC, BUSD, and BNB. Availability and network instructions can vary by configuration and are displayed at checkout.</p> },
    { title: 'Payment instructions', body: <p>Use only the address and network shown for your selected method. Send the exact amount and retain your transaction reference. We verify payment server-side before an order is marked paid or delivered.</p> },
    { title: 'Cards', body: <p>Visa and Mastercard checkout is not currently represented as an active payment method. No card payment is considered available unless a compliant payment processor is configured and approved for this business.</p> },
    { title: 'Security', body: <p>FF Diamond does not collect full card numbers, CVV codes, game passwords, or account credentials. Blockchain transfers may be irreversible once confirmed by the network.</p> },
  ]} />
}
