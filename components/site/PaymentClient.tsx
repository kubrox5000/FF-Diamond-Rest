'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Check, Clock, Upload, Loader2, ShieldCheck, ArrowRight, AlertTriangle, Wifi, Banknote, Send, ExternalLink, CheckCircle2 } from 'lucide-react'
import { PAYMENT_METHODS } from '@/lib/orders'
import { CryptoIcon } from '@/components/site/CryptoIcon'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { SUPPORTED_CRYPTO_CURRENCIES } from '@/lib/payment-currencies'
import { fireVerifiedPurchase, isPaidConversionOrderStatus } from '@/lib/analytics'
import type { PublicOrder } from '@/lib/types'

export function PaymentClient({ order }: { order: PublicOrder }) {
  const router = useRouter()
  const { t } = useLocale()
  const [methods, setMethods] = useState<{ id: string; label: string; network: string; cat: string }[]>(
    PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label, network: m.network, cat: m.cat })),
  )
  const [copied, setCopied] = useState<'addr' | 'amt' | 'tok' | null>(null)
  const [txId, setTxId] = useState(order.txId ?? '')
  const [proof, setProof] = useState<string | null>(order.proofUrl ?? null)
  const [proofName, setProofName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trackingToken, setTrackingToken] = useState('')

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`ff_track_${order.orderNumber}`)
      if (saved) setTrackingToken(saved)
    } catch {}
  }, [order.orderNumber])

  useEffect(() => {
    if (isPaidConversionOrderStatus(order.status)) {
      void fireVerifiedPurchase(order)
    }
  }, [order])

  // Load live payment methods from the DB (falls back to static defaults).
  useEffect(() => {
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((data: { methods?: { key: string; label: string; network: string; cat: string }[] }) => {
        if (data.methods?.length) {
          setMethods(data.methods.map((m) => ({ id: m.key, label: m.label, network: m.network, cat: m.cat })))
        }
      })
      .catch(() => {})
  }, [])

  const method = methods.find((m) => m.id === order.paymentMethod)
  const isWallet = method?.cat === 'wallet'
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    const deadline = new Date(order.createdAt).getTime() + 30 * 60 * 1000
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [order.createdAt])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const expired = remaining <= 0

  const alreadySubmitted = order.status === 'payment_review' || order.status === 'paid'

  async function copy(text: string, which: 'addr' | 'amt' | 'tok') {
    await navigator.clipboard.writeText(text)
    setCopied(which)
    toast.success(t('pay_copied'))
    setTimeout(() => setCopied(null), 1500)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) return toast.error(t('pay_under3'))
    if (!file.type.startsWith('image/')) return toast.error(t('err_failed'))

    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result as string
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let { width, height } = img
        if (width > MAX || height > MAX) {
          const scale = MAX / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return setProof(raw)
        ctx.drawImage(img, 0, 0, width, height)
        setProof(canvas.toDataURL('image/jpeg', 0.72))
        setProofName(file.name)
      }
      img.onerror = () => {
        setProof(raw)
        setProofName(file.name)
      }
      img.src = raw
    }
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (txId.trim().length < 4) return toast.error(t('err_tx'))
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, proofUrl: proof }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('err_failed'))
      toast.success(t('pay_submitted_toast'))
      router.push(`/payment/confirmed?order=${order.orderNumber}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('err_generic'))
      setSubmitting(false)
    }
  }

  const trackUrl = `/track?order=${encodeURIComponent(order.orderNumber)}${trackingToken ? `&token=${encodeURIComponent(trackingToken)}` : ''}`

  if (order.paymentMethod === 'HELEKET') {
    return <HeleketPanel order={order} expired={expired} mins={mins} secs={secs} trackUrl={trackUrl} />
  }

  if (order.paymentMethod === 'PLISIO') {
    return <PlisioPanel order={order} expired={expired} mins={mins} secs={secs} trackUrl={trackUrl} />
  }
  if (order.paymentMethod === 'ATLOS') {
    return <HostedPaymentPanel order={order} expired={expired} mins={mins} secs={secs} trackUrl={trackUrl} trackingToken={trackingToken} />
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      {/* Left: payment instructions */}
      <div>
        <div className="glass rounded-2xl border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('pay_order')}</p>
              <p className="font-mono text-lg font-bold" translate="no">{order.orderNumber}</p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                expired && !alreadySubmitted
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-gold/30 bg-gold/10 text-gold'
              }`}
              translate="no"
            >
              <Clock className="h-4 w-4" />
              {alreadySubmitted ? t('pay_submitted') : expired ? t('pay_expired') : `${mins}:${String(secs).padStart(2, '0')}`}
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
            {/* Payment instructions card — replaces QR code */}
            <div className="mx-auto w-[168px] shrink-0 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CryptoIcon id={order.paymentMethod} className="h-8 w-8" />
                <div>
                  <p className="text-xs font-bold text-foreground" translate="no">{method?.label ?? 'USDT'}</p>
                  <p className="text-[10px] text-muted-foreground" translate="no">{method?.network ?? ''}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <Step icon={<Send className="h-3 w-3" />} num="1" text={t('pay_step1')} />
                <Step icon={<Wifi className="h-3 w-3" />} num="2" text={t('pay_step2')} />
                <Step icon={<Banknote className="h-3 w-3" />} num="3" text={t('pay_step3')} />
                <Step icon={<ShieldCheck className="h-3 w-3" />} num="4" text={t('pay_step4')} />
              </div>
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                <p className="text-[10px] font-medium leading-tight text-amber-300">{t('pay_step_warn')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Info label={t('pay_send', { method: method?.label ?? 'USDT' })}>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border px-3 py-2 text-xs" translate="no">
                    {order.walletAddress || t('pay_notconfig')}
                  </code>
                  <button
                    onClick={() => copy(order.walletAddress ?? '', 'addr')}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border hover:bg-secondary"
                    aria-label="Copy wallet address"
                  >
                    {copied === 'addr' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t('pay_network', { net: method?.network ?? '' })}</p>
              </Info>

              <Info label={t('pay_exact')}>
                <div className="flex items-center gap-2">
                  <CryptoIcon id={order.paymentMethod} className="h-8 w-8" />
                  <code className="flex-1 text-base font-bold text-gold" translate="no">
                    {order.paymentMethod.startsWith('USDT')
                      ? `${parseFloat(order.amountUsdt).toFixed(2)} USDT`
                      : `$${parseFloat(order.amountUsd).toFixed(2)} USD (≈ ${parseFloat(order.amountUsdt).toFixed(2)} USDT)`}
                  </code>
                  <button
                    onClick={() => copy(parseFloat(order.amountUsdt).toFixed(2), 'amt')}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border hover:bg-secondary"
                    aria-label="Copy amount"
                  >
                    {copied === 'amt' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </Info>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-lg p-3 text-xs text-amber-200/90">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('pay_warning')}</p>
          </div>
        </div>
      </div>

      {/* Right: confirm payment */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-card/90 p-6">
          <h3 className="text-lg font-bold">{t('pay_confirm')}</h3>

          {alreadySubmitted ? (
            <div className="mt-4 rounded-lg p-4 text-sm text-emerald-200">{t('pay_already')}</div>
          ) : (
            <>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {isWallet ? t('pay_tx_wallet') : t('pay_tx')}
                </label>
                <input
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder={isWallet ? t('pay_tx_wallet_ph') : t('pay_tx_ph')}
                  translate="no"
                  className="input-base"
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t('pay_proof')}</label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:border-primary/50">
                  <Upload className="h-4 w-4" />
                  <span className="truncate">{proofName || t('pay_upload')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                {proof && (
                  <img src={proof} alt={t('pay_alt')} className="mt-2 max-h-32 rounded-md border border-border object-contain" />
                )}
              </div>

              <button
                onClick={submit}
                disabled={submitting}
                className="btn-shimmer glow-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? t('pay_submitting') : t('pay_verify')}
              </button>
            </>
          )}

          {trackingToken && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Private Tracking Token</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate font-mono text-xs text-foreground" translate="no">{trackingToken}</code>
                <button
                  type="button"
                  onClick={() => copy(trackingToken, 'tok')}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border hover:bg-secondary"
                  aria-label="Copy tracking token"
                >
                  {copied === 'tok' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => router.push(trackUrl)}
            className="mt-3 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            {t('pay_track')}
          </button>
        </div>
      </aside>
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Step({ icon, num, text }: { icon: React.ReactNode; num: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
        {num}
      </span>
      <p className="text-[10px] leading-snug text-muted-foreground">{text}</p>
    </div>
  )
}
function HeleketPanel({ order, expired, mins, secs, trackUrl }: { order: PublicOrder; expired: boolean; mins: number; secs: number; trackUrl: string }) {
  const router = useRouter()
  const { t } = useLocale()
  const paid = ['paid', 'processing', 'completed'].includes(order.status)
  const review = order.status === 'payment_review'
  const cancelled = order.status === 'cancelled'

  return (
    <div className="mx-auto max-w-xl">
      <div className="glass rounded-2xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('pay_order')}</p>
            <p className="font-mono text-lg font-bold" translate="no">{order.orderNumber}</p>
          </div>
          {order.status === 'pending_payment' && (
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                expired ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-gold/30 bg-gold/10 text-gold'
              }`}
              translate="no"
            >
              <Clock className="h-4 w-4" />
              {expired ? t('pay_expired') : `${mins}:${String(secs).padStart(2, '0')}`}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <CryptoIcon id="HELEKET" className="h-10 w-10" />
          <div className="flex-1">
            <p className="text-sm font-bold">{t('pay_heleket_title')}</p>
            <p className="text-xs text-muted-foreground">{t('pay_heleket_sub')}</p>
          </div>
          <code className="text-base font-bold text-gold" translate="no">
            {parseFloat(order.amountUsdt).toFixed(2)} USDT
          </code>
        </div>

        {paid ? (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('pay_heleket_paid')}</p>
          </div>
        ) : review ? (
          <div className="mt-5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">{t('pay_already')}</div>
        ) : cancelled || expired || !order.walletAddress ? (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('pay_heleket_expired')}</p>
          </div>
        ) : (
          <>
            <a
              href={order.walletAddress}
              className="btn-shimmer glow-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              <ExternalLink className="h-4 w-4" />
              {t('pay_heleket_btn')}
            </a>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {t('pay_heleket_note')}
            </p>
            <button
              onClick={() => router.refresh()}
              className="mt-3 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
            >
              {t('pay_heleket_check')}
            </button>
          </>
        )}

        <button
          onClick={() => router.push(trackUrl)}
          className="mt-3 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          {t('pay_track')}
        </button>
      </div>
    </div>
  )
}

function PlisioPanel({ order, expired, mins, secs, trackUrl }: { order: PublicOrder; expired: boolean; mins: number; secs: number; trackUrl: string }) {
  const router = useRouter()
  const { t } = useLocale()
  const paid = ['paid', 'processing', 'completed'].includes(order.status)
  const disabled = expired || order.status === 'cancelled' || !order.walletAddress
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">{t('pay_order')}</p><p className="font-mono font-bold" translate="no">{order.orderNumber}</p></div>
        {order.status === 'pending_payment' && <span className="text-sm font-semibold">{expired ? t('pay_expired') : `${mins}:${String(secs).padStart(2, '0')}`}</span>}
      </div>
      <div className="mt-6 rounded-2xl bg-primary/5 p-5 text-center"><p className="text-sm text-muted-foreground">{t('pay_exact')}</p><p className="mt-2 text-4xl font-semibold" dir="ltr" translate="no">${Number(order.amountUsd).toFixed(2)} USD</p></div>
      {paid ? <p className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-center">{t('pay_heleket_paid')}</p> : <a href={disabled ? undefined : order.walletAddress ?? undefined} target="_blank" rel="noopener noreferrer" aria-disabled={disabled} className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-50">{t('pay_atlos_btn')}</a>}
      <button
        onClick={() => router.push(trackUrl)}
        className="mt-3 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
      >
        {t('pay_track')}
      </button>
    </div>
  )
}

function HostedPaymentPanel({ order, expired, mins, secs, trackUrl, trackingToken }: { order: PublicOrder; expired: boolean; mins: number; secs: number; trackUrl: string; trackingToken: string }) {
  const router = useRouter()
  const { t, lang } = useLocale()
  const paid = ['paid', 'processing', 'completed'].includes(order.status)
  const review = order.status === 'payment_review'
  const cancelled = order.status === 'cancelled'
  const [atlosMerchantId, setAtlosMerchantId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    fetch('/api/atlos/config')
      .then((r) => r.json())
      .then((d: { merchantId: string | null }) => {
        if (d.merchantId) setAtlosMerchantId(d.merchantId)
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as unknown as { atlos?: unknown }).atlos) return
    const script = document.createElement('script')
    script.src = 'https://atlos.io/packages/app/atlos.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  async function verifyServerPaidAndTrack() {
    if (trackingToken) {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}`, {
          headers: { 'x-order-tracking-token': trackingToken },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.order && isPaidConversionOrderStatus(data.order.status)) {
            await fireVerifiedPurchase(data.order)
          }
        }
      } catch {}
    }
    router.refresh()
  }

  function launchPayment() {
    if (!atlosMerchantId) {
      toast.error(t('pay_atlos_unavailable'))
      return
    }
    const atlos = (window as unknown as { atlos?: { Pay: (opts: Record<string, unknown>) => void } }).atlos
    if (!atlos) {
      toast.error(t('pay_atlos_loading'))
      return
    }
    const selectedLanguage = document.documentElement.lang || lang
    atlos.Pay({
      merchantId: atlosMerchantId,
      orderId: order.orderNumber,
      orderAmount: Number(order.amountUsd),
      orderCurrency: 'USD',
      lang: selectedLanguage,
      language: selectedLanguage,
      locale: selectedLanguage,
      userEmail: order.email || undefined,
      onSuccess: () => {
        toast.success(t('pay_heleket_paid'))
        void verifyServerPaidAndTrack()
      },
      onCompleted: () => {
        toast.success(t('pay_heleket_paid'))
        void verifyServerPaidAndTrack()
      },
      onCanceled: () => {
        toast.info(t('pay_atlos_closed'))
      },
    })
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-background/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('pay_order')}</p>
            <p className="font-mono text-lg font-bold" translate="no">{order.orderNumber}</p>
          </div>
          {order.status === 'pending_payment' && (
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                expired ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-gold/30 bg-gold/10 text-gold'
              }`}
              translate="no"
            >
              <Clock className="h-4 w-4" />
              {expired ? t('pay_expired') : `${mins}:${String(secs).padStart(2, '0')}`}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/5">
              <CryptoIcon id="ATLOS" className="h-10 w-10" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">Atlos</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{t('pay_atlos_sub')}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <p className="text-xs font-medium text-muted-foreground">{t('pay_exact')}</p>
            <p className="mt-2 flex flex-wrap items-baseline gap-2" dir="ltr" translate="no">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">${Number(order.amountUsd).toFixed(2)}</span>
              <span className="text-sm font-medium text-muted-foreground">USD</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-primary/15 pt-4" aria-label={t('pay_atlos_currencies')}>
              {SUPPORTED_CRYPTO_CURRENCIES.map((coin) => (
                <span key={coin} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium" dir="ltr" translate="no">
                  <CryptoIcon id={coin} className="h-4 w-4" />{coin}
                </span>
              ))}
            </div>
          </div>

          {paid ? (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('pay_heleket_paid')}</p>
            </div>
          ) : review ? (
            <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">{t('pay_already')}</div>
          ) : cancelled || expired ? (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('pay_heleket_expired')}</p>
            </div>
          ) : (
            <>
              <button
                onClick={launchPayment}
                disabled={loadingConfig || !atlosMerchantId}
                aria-busy={loadingConfig}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingConfig ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
                {loadingConfig ? t('pay_atlos_loading') : t('pay_atlos_btn')}
              </button>
              {!loadingConfig && !atlosMerchantId && (
                <p role="alert" className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{t('pay_atlos_unavailable')}</p>
              )}
              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                {t('pay_atlos_note')}
              </p>
            </>
          )}

          <button
            onClick={() => router.push(trackUrl)}
            className="mt-4 w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            {t('pay_track')}
          </button>
        </div>
      </div>
    </div>
  )
}
