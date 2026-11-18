'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, Copy, Check,
  ShieldCheck, Clock, Gem, ArrowRight, HeadphonesIcon,
} from 'lucide-react'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { fireVerifiedPurchase, isPaidConversionOrderStatus } from '@/lib/analytics'

const COPY = {
  ar: {
    heading: 'تم استلام طلبك! 🎉',
    sub1: 'شكراً لك على إتمام الدفع. سيقوم فريقنا بمراجعة العملية',
    sub2: 'وإضافة الماسات إلى حسابك في أقرب وقت.',
    orderNo: 'رقم الطلب',
    tokenLabel: 'رمز التتبع الخاص',
    statusLabel: 'الحالة',
    inReview: 'قيد المراجعة',
    whatNow: 'ماذا يحدث الآن؟',
    step1: 'فريقنا يراجع إثبات الدفع ويتحقق منه يدوياً',
    step2: 'عادةً ما تتم المراجعة خلال دقائق من استلامك للدفع',
    step3: 'بعد التأكيد يتم إضافة الماسات لحسابك خلال وقت قصير',
    supportPre: 'إذا لم تستلم الماسات خلال',
    supportHours: '24 ساعة',
    supportPost: 'تواصل مع الدعم وأرسل رقم طلبك',
    trackBtn: 'تتبع حالة طلبك',
    homeBtn: 'العودة للرئيسية',
  },
  en: {
    heading: 'Order Received! 🎉',
    sub1: 'Thank you for completing your payment. Our team is reviewing your transaction',
    sub2: 'and will credit your diamonds shortly.',
    orderNo: 'Order Number',
    tokenLabel: 'Private Tracking Token',
    statusLabel: 'Status',
    inReview: 'In Review',
    whatNow: 'What happens next?',
    step1: 'Our team manually verifies your payment proof and transaction ID',
    step2: 'Reviews usually complete within minutes of receiving payment',
    step3: 'Once confirmed, diamonds are credited to your player ID promptly',
    supportPre: 'If you do not receive your diamonds within',
    supportHours: '24 hours',
    supportPost: 'contact support with your order number',
    trackBtn: 'Track Your Order',
    homeBtn: 'Back to Home',
  },
  fr: {
    heading: 'Commande reçue ! 🎉',
    sub1: 'Merci pour votre paiement. Notre équipe vérifie la transaction',
    sub2: 'et ajoutera vos diamants très prochainement.',
    orderNo: 'Numéro de commande',
    tokenLabel: 'Jeton de suivi privé',
    statusLabel: 'Statut',
    inReview: 'En cours de vérification',
    whatNow: 'Que se passe-t-il ensuite ?',
    step1: 'Notre équipe vérifie manuellement votre preuve de paiement',
    step2: 'La vérification prend généralement quelques minutes',
    step3: 'Une fois confirmée, les diamants sont crédités rapidement',
    supportPre: 'Si vous ne recevez pas vos diamants sous',
    supportHours: '24 heures',
    supportPost: 'contactez le support avec votre numéro de commande',
    trackBtn: 'Suivre ma commande',
    homeBtn: "Retour à l'accueil",
  },
  es: {
    heading: '¡Pedido recibido! 🎉',
    sub1: 'Gracias por completar tu pago. Nuestro equipo está revisando la operación',
    sub2: 'y acreditará tus diamantes en breve.',
    orderNo: 'Número de pedido',
    tokenLabel: 'Token de seguimiento privado',
    statusLabel: 'Estado',
    inReview: 'En revisión',
    whatNow: '¿Qué sucede ahora?',
    step1: 'Nuestro equipo verifica manualmente tu comprobante de pago',
    step2: 'La revisión suele completarse en pocos minutos',
    step3: 'Tras confirmar, los diamantes se acreditan rápidamente',
    supportPre: 'Si no recibes tus diamantes en',
    supportHours: '24 horas',
    supportPost: 'contacta con soporte indicando tu número de pedido',
    trackBtn: 'Rastrear tu pedido',
    homeBtn: 'Volver al inicio',
  },
} as const

export function PaymentConfirmedClient() {
  const params = useSearchParams()
  const orderNumber = params.get('order') ?? ''
  const urlToken = params.get('token') ?? ''
  const { lang } = useLocale()
  const copy = COPY[lang as keyof typeof COPY] ?? COPY.en

  const [copied, setCopied] = useState<'order' | 'token' | null>(null)
  const [show, setShow] = useState(false)
  const [trackingToken, setTrackingToken] = useState(urlToken)
  const [verifiedStatus, setVerifiedStatus] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (urlToken) {
      setTrackingToken(urlToken)
      return
    }
    if (!orderNumber) return
    try {
      const saved = sessionStorage.getItem(`ff_track_${orderNumber}`)
      if (saved) setTrackingToken(saved)
    } catch {}
  }, [orderNumber, urlToken])

  useEffect(() => {
    if (!orderNumber || !trackingToken) return
    let cancelled = false
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
      headers: { 'x-order-tracking-token': trackingToken },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.order) return
        setVerifiedStatus(String(d.order.status ?? ''))
        if (isPaidConversionOrderStatus(d.order.status)) {
          void fireVerifiedPurchase(d.order)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [orderNumber, trackingToken])

  function copyValue(text: string, which: 'order' | 'token') {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  const trackHref = `/track?order=${encodeURIComponent(orderNumber)}${trackingToken ? `&token=${encodeURIComponent(trackingToken)}` : ''}`

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div
        className={`mb-8 flex flex-col items-center text-center transition-all duration-700 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="relative mb-6">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
          <span className="absolute inset-3 animate-ping rounded-full bg-emerald-500/15 [animation-delay:0.25s]" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/30">
            <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold">{copy.heading}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {copy.sub1}
          <br />
          {copy.sub2}
        </p>
      </div>

      <div
        className={`mb-5 transition-all duration-700 delay-100 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3 border-b border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Gem className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-emerald-300" translate="no">FF Diamond 💎</p>
              <p className="text-xs text-muted-foreground">Free Fire Top-Up</p>
            </div>
          </div>

          <div className="divide-y divide-border/50 px-5">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{copy.orderNo}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold" translate="no">{orderNumber || '—'}</span>
                {orderNumber && (
                  <button
                    type="button"
                    onClick={() => copyValue(orderNumber, 'order')}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Copy order number"
                  >
                    {copied === 'order' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {trackingToken && (
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="shrink-0 text-sm text-muted-foreground">{copy.tokenLabel}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-xs font-semibold" translate="no">{trackingToken}</span>
                  <button
                    type="button"
                    onClick={() => copyValue(trackingToken, 'token')}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Copy tracking token"
                  >
                    {copied === 'token' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{copy.statusLabel}</span>
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isPaidConversionOrderStatus(verifiedStatus)
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}>
                {isPaidConversionOrderStatus(verifiedStatus) ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {isPaidConversionOrderStatus(verifiedStatus) ? (verifiedStatus === 'completed' ? 'Completed' : 'Paid') : copy.inReview}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mb-5 transition-all duration-700 delay-200 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
          <p className="text-sm font-semibold text-muted-foreground">{copy.whatNow}</p>
          {[
            { icon: ShieldCheck, color: 'text-violet-400 bg-violet-500/10', text: copy.step1 },
            { icon: Clock, color: 'text-sky-400 bg-sky-500/10', text: copy.step2 },
            { icon: Gem, color: 'text-emerald-400 bg-emerald-500/10', text: copy.step3 },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mb-8 transition-all duration-700 delay-300 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <HeadphonesIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>
            {copy.supportPre} <span className="font-bold">{copy.supportHours}</span>, {copy.supportPost}{' '}
            <span className="font-mono font-bold" translate="no">{orderNumber}</span>.
          </p>
        </div>
      </div>

      <div
        className={`flex flex-col gap-3 transition-all duration-700 delay-[400ms] ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <Link
          href={trackHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02]"
        >
          <ArrowRight className="h-4 w-4" />
          {copy.trackBtn}
        </Link>
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          {copy.homeBtn}
        </Link>
      </div>
    </div>
  )
}
