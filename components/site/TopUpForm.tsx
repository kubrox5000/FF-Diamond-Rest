'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, Gem, Hash, MapPin, Phone, Ticket, CheckCircle2,
  Copy, ArrowRight, ChevronDown, CreditCard,
} from 'lucide-react'
import { PackageCard } from '@/components/site/PackageCard'
import { SERVERS, discountedPrice } from '@/lib/orders'
import { orderedCountries, DIAL_CODES, DIAL_OPTIONS, countryByCode } from '@/lib/countries'
import { formatNumber } from '@/lib/currencies'
import { formatUsd } from '@/lib/orders'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { CryptoIcon } from '@/components/site/CryptoIcon'
import { cn } from '@/utils/cn'
import type { PublicPackage, PublicPaymentMethod } from '@/lib/types'

export function TopUpForm({ packages, paymentMethods, freeGift }: {
  packages: PublicPackage[]
  paymentMethods: PublicPaymentMethod[]
  freeGift?: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const { t, countryCode, lang } = useLocale()
  const preselect = params.get('package')

  const [selected, setSelected] = useState<PublicPackage | null>(
    preselect ? packages.find((p) => p.id === Number(preselect)) ?? null : null,
  )
  const [uid, setUid] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [dial, setDial] = useState('+966')
  const [phone, setPhone] = useState('')
  const countryTouched = useRef(false)
  const [method, setMethod] = useState<string>('')

  // ── Card fields ────────────────────────────────────────────────────────────
  const [coupon, setCoupon] = useState('')
  const [couponPct, setCouponPct] = useState(0)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const cryptoMethods = useMemo(() => paymentMethods.filter((m) => m.cat === 'crypto'), [paymentMethods])
  const plisioMethods = useMemo(() => cryptoMethods.filter((m) => m.key === 'PLISIO'), [cryptoMethods])
  const atlosMethods = useMemo(() => cryptoMethods.filter((m) => m.key === 'ATLOS'), [cryptoMethods])
  const otherCryptoMethods = useMemo(() => cryptoMethods.filter((m) => m.key !== 'PLISIO' && m.key !== 'ATLOS'), [cryptoMethods])
  const walletMethods = useMemo(() => paymentMethods.filter((m) => m.cat !== 'crypto'), [paymentMethods])

  // ── Payment-method accordion state ─────────────────────────────────────────
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (!method) return { crypto: false, plisio: false, atlos: false, wallet: false }
    const key = paymentMethods.find((m) => m.key === method)?.key
    const cat = paymentMethods.find((m) => m.key === method)?.cat === 'crypto' ? 'crypto' : 'wallet'
    return { crypto: cat === 'crypto' && key !== 'PLISIO' && key !== 'ATLOS', plisio: key === 'PLISIO', atlos: key === 'ATLOS', wallet: cat === 'wallet' }
  })
  const toggleGroup = (g: 'crypto' | 'plisio' | 'atlos' | 'wallet') =>
    setOpenGroups((p) => ({ ...p, [g]: !p[g] }))

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ uid?: string; email?: string; phone?: string }>({})

  const clearError = (key: 'uid' | 'email' | 'phone') => setErrors((p) => ({ ...p, [key]: undefined }))

  useEffect(() => { router.prefetch('/payment/[orderNumber]') }, [router])

  useEffect(() => {
    if (selected) {
      const el = document.getElementById('order-details')
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
    }
  }, [selected])

  // عند اختيار طريقة الدفع، الانتقال تلقائياً إلى ملخص الطلب
  useEffect(() => {
    if (!method) return
    const el = document.getElementById('order-summary')
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: y, behavior: 'smooth' as ScrollBehavior })
  }, [method])

  useEffect(() => {
    if (countryTouched.current || !countryCode) return
    const match = countryByCode(countryCode)
    if (match) {
      setCountry(lang === 'ar' ? match.ar : match.en)
      setDial(DIAL_CODES[countryCode] ?? '')
    }
  }, [countryCode, lang])

  const price = useMemo(() => {
    if (!selected) return { usd: 0, usdt: 0 }
    let usd = discountedPrice(selected.priceUsd, selected.discountPct)
    let usdt = discountedPrice(selected.priceUsdt, selected.discountPct)
    if (couponPct > 0) {
      usd = +(usd * (1 - couponPct / 100)).toFixed(2)
      usdt = +(usdt * (1 - couponPct / 100)).toFixed(2)
    }
    return { usd, usdt }
  }, [selected, couponPct])

  async function applyCoupon() {
    if (!coupon.trim()) return
    setCheckingCoupon(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon }),
      })
      const data = await res.json()
      if (data.valid) {
        setCouponPct(data.discountPct)
        toast.success(t('coupon_applied', { p: data.discountPct }))
      } else {
        setCouponPct(0)
        toast.error(data.error || t('coupon_invalid'))
      }
    } catch {
      toast.error(t('coupon_error'))
    } finally {
      setCheckingCoupon(false)
    }
  }

  function validateForm() {
    const next: { uid?: string; email?: string; phone?: string } = {}
    const uidV = uid.trim()
    if (!uidV) next.uid = t('req_uid')
    else if (!/^[0-9]{4,}$/.test(uidV)) next.uid = t('err_uid_short')
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('err_email')
    if (phone.trim() && !/^[0-9]{6,15}$/.test(phone.replace(/\D/g, ''))) next.phone = t('err_phone')
    setErrors(next)
    return !next.uid && !next.email && !next.phone
  }

  function scrollToDetails() {
    const el = document.getElementById('order-details')
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: y, behavior: 'smooth' as ScrollBehavior })
  }

  async function submit() {
    if (!selected) return toast.error(t('req_pkg'))
    if (!method) {
      toast.error(t('req_pay'))
      setOpenGroups((p) => ({ ...p, crypto: true }))
      return
    }
    if (!validateForm()) {
      scrollToDetails()
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selected.id,
          playerUid: uid,
          nickname: null,
          server: SERVERS[0],
          email: email || null,
          country: country || null,
          phone: phone ? `${dial} ${phone}`.trim() : null,
          paymentMethod: method,
          couponCode: couponPct > 0 ? coupon : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')
      toast.success(t('order_created'))
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }
      router.push(`/payment/${data.order.orderNumber}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('err_generic'))
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
      <div>
        {/* Package selection */}
        <SectionHeading>{t('top_step1')}</SectionHeading>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {packages.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد باقات متوفرة حالياً' : 'No packages available at the moment'}
            </div>
          ) : (
              packages.map((p) => {
                const giftDiamonds = p.bonusDiamonds > 0 ? p.bonusDiamonds : p.sortOrder * 50
                return (
                  <PackageCard key={p.id} pkg={{ ...p, bonusDiamonds: giftDiamonds }} selected={selected?.id === p.id} onSelect={setSelected} ctaLabel={t('pkg_select')} freeGift={freeGift} />
                )
              })
          )}
        </div>

        {/* Details */}
        <div id="order-details" className="mt-8 scroll-mt-24 lg:mt-10">
          <SectionHeading>{t('top_step2')}</SectionHeading>
          <div className="glass grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2 sm:p-6">
            <Field label={t('f_uid')} icon={<Hash className="h-4 w-4" />} required>
              <input
                value={uid}
                onChange={(e) => { setUid(e.target.value.replace(/[^0-9]/g, '')); clearError('uid') }}
                placeholder={t('f_uid_ph')}
                inputMode="numeric"
                translate="no"
                className={cn('input-base', errors.uid && 'input-error')}
              />
              {errors.uid && <p className="mt-1.5 text-xs font-medium text-rose-400" role="alert">{errors.uid}</p>}
            </Field>
            <Field label={t('f_email')}>
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                placeholder={t('f_email_ph')}
                type="email"
                className={cn('input-base', errors.email && 'input-error')}
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-400" role="alert">{errors.email}</p>}
            </Field>
            <Field label={t('f_country')} icon={<MapPin className="h-4 w-4" />}>
              <select
                value={country}
                onChange={(e) => {
                  countryTouched.current = true
                  const c = orderedCountries().find((x) => x.en === e.target.value)
                  setCountry(e.target.value)
                  setDial(c ? DIAL_CODES[c.code] ?? '' : '')
                }}
                className="input-base"
              >
                <option value="" disabled className="bg-card text-foreground">{t('f_country_ph')}</option>
                {orderedCountries().map((c) => (
                  <option key={c.code} value={c.en} className="bg-card text-foreground">
                    {lang === 'ar' ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('f_phone')} icon={<Phone className="h-4 w-4" />}>
              <div className="flex gap-2">
                <select value={dial} onChange={(e) => setDial(e.target.value)} className="input-base w-[7.5rem] shrink-0">
                  {DIAL_OPTIONS.map((d) => (
                    <option key={d} value={d} className="bg-card text-foreground">{d}</option>
                  ))}
                </select>
                <input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearError('phone') }}
                  placeholder={t('f_phone_ph')}
                  type="tel"
                  translate="no"
                  className={cn('input-base flex-1', errors.phone && 'input-error')}
                />
              </div>
              {errors.phone && <p className="mt-1.5 text-xs font-medium text-rose-400" role="alert">{errors.phone}</p>}
            </Field>
          </div>
        </div>

        {/* Payment method */}
        <div id="payment-methods" className="mt-8 scroll-mt-24 lg:mt-10">
          <SectionHeading>{t('top_step3')}</SectionHeading>
          <p className="-mt-1 mb-4 text-sm text-muted-foreground lg:mb-5">{t('pay_group_hint')}</p>

          <div className="space-y-4">
            {/* Plisio and Atlos remain separate gateways for clearer checkout choices. */}
            {plisioMethods.length > 0 && (
              <PayGroup
                open={openGroups.plisio}
                onToggle={() => toggleGroup('plisio')}
                icon={<StablecoinIconCluster />}
                iconClass="bg-transparent"
                title="Stablecoin"
                sub="BTC, ETH and stablecoin payments"
                radio={plisioMethods.some((m) => m.key === method)}
              >
                <div className="grid grid-cols-1 gap-3 sm:max-w-sm">
                  {plisioMethods.map((m) => (
                    <MethodTile key={m.key} m={m} selected={method === m.key} onClick={() => setMethod(m.key)} />
                  ))}
                </div>
              </PayGroup>
            )}

            {atlosMethods.length > 0 && (
              <PayGroup
                open={openGroups.atlos}
                onToggle={() => toggleGroup('atlos')}
                icon={<AtlosCurrencyCluster />}
                iconClass="bg-transparent"
                title="Atlos"
                sub="USDT, BTC, ETH, SOL, LTC, BUSD, BNB"
                radio={atlosMethods.some((m) => m.key === method)}
              >
                <div className="grid grid-cols-1 gap-3 sm:max-w-sm">
                  {atlosMethods.map((m) => (
                    <MethodTile key={m.key} m={m} selected={method === m.key} onClick={() => setMethod(m.key)} />
                  ))}
                </div>
              </PayGroup>
            )}

            {otherCryptoMethods.length > 0 && (
              <PayGroup
                open={openGroups.crypto}
                onToggle={() => toggleGroup('crypto')}
                icon={<MethodIconCluster methods={otherCryptoMethods} />}
                iconClass="bg-transparent"
                title={t('pay_group_crypto')}
                sub={t('pay_group_crypto_sub')}
                radio={otherCryptoMethods.some((m) => m.key === method)}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {otherCryptoMethods.map((m) => (
                    <MethodTile key={m.key} m={m} selected={method === m.key} onClick={() => setMethod(m.key)} />
                  ))}
                </div>
              </PayGroup>
            )}

            {/* المحافظ */}
            {walletMethods.length > 0 && (
              <PayGroup
                open={openGroups.wallet}
                onToggle={() => toggleGroup('wallet')}
                icon={<MethodIconCluster methods={walletMethods} />}
                iconClass="bg-transparent"
                title={t('pay_group_wallet')}
                sub={t('pay_group_wallet_sub')}
                radio={walletMethods.some((m) => m.key === method)}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {walletMethods.map((m) => (
                    <MethodTile key={m.key} m={m} selected={method === m.key} onClick={() => setMethod(m.key)} />
                  ))}
                </div>
              </PayGroup>
            )}
          </div>

          {/* Live payment info for the selected crypto/wallet method */}
          {( () => {
            const pm = paymentMethods.find((m) => m.key === method)
            const dest = pm?.walletAddress?.trim()
            if (!pm || !dest) return null
            const isBinance = pm.key === 'BINANCE_PAY'
            return (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                  <CryptoIcon id={pm.key} className="h-8 w-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-300">
                    {isBinance ? t('pay_binance_title') : t('pay_dest', { method: pm.label })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {isBinance ? t('pay_binance_hint') : pm.network}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-semibold" translate="no">
                      {dest}
                    </code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(dest); toast.success(t('pay_copied')) }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-secondary"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Sidebar summary ──────────────────────────────────────────────────── */}
      <aside id="order-summary" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
        <div className="glass rounded-2xl border border-border p-4 sm:p-6">
          <h3 className="text-lg font-bold">{t('summary')}</h3>

          {selected ? (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary/50 p-3" translate="no">
                <Gem className="h-6 w-6 text-sky-300" />
                <div>
                  <p className="font-bold">{formatNumber(selected.diamonds + selected.bonusDiamonds)} 💎</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(selected.diamonds)}
                    {selected.bonusDiamonds > 0 && ` + ${selected.bonusDiamonds}`}
                  </p>
                </div>
              </div>

              {(() => {
                const pm = paymentMethods.find((m) => m.key === method)
                return (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
                    <span className="shrink-0">
                      {method ? (
                        <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-white">
                          <CryptoIcon id={method} className="h-7 w-7" />
                        </span>
                      ) : (
                        <span className="grid h-9 w-9 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">{t('payment_method')}</p>
                      {method ? (
                        <p className="truncate font-semibold">
                          {pm?.label ?? method}
                        </p>
                      ) : (
                        <p className="truncate text-xs font-semibold text-muted-foreground">{t('choose_pay')}</p>
                      )}
                      {method && pm?.network && (
                        <p className="truncate text-xs text-muted-foreground" translate="no">{pm.network}</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="mt-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Ticket className="h-3.5 w-3.5" /> {t('promo')}
                </label>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder={t('coupon_ph')}
                    translate="no"
                    className="input-base flex-1"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={checkingCoupon}
                    className="rounded-lg border border-border bg-secondary px-4 text-sm font-semibold hover:bg-secondary/70 disabled:opacity-50"
                  >
                    {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : t('coupon_apply')}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <Row label={t('estimated')} value={selected.deliveryEta} />
                {couponPct > 0 && <Row label={t('coupon_discount')} value={`-${couponPct}%`} accent="text-emerald-400" />}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold">{t('total')}</span>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-gold" translate="no">{formatUsd(price.usd)}</p>
                    <p className="text-xs text-muted-foreground" translate="no">{price.usdt.toFixed(2)} USDT</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMethod('')
                  setOpenGroups({ crypto: false, wallet: false })
                  const el = document.getElementById('payment-methods')
                  if (!el) return
                  const y = el.getBoundingClientRect().top + window.scrollY - 96
                  window.scrollTo({ top: y, behavior: 'smooth' as ScrollBehavior })
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <ArrowRight className="h-4 w-4" />
                {t('change_payment')}
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-shimmer glow-primary mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? t('creating') : t('proceed')}
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('sum_sub')}</p>
          )}
        </div>
      </aside>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 lg:mb-4">
      <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-gold to-orange-500" />
      <h2 className="text-lg font-extrabold tracking-tight">{children}</h2>
    </div>
  )
}

function Field({
  label, icon, required, children,
}: {
  label: string
  icon?: React.ReactNode
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon} {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className={cn('font-medium text-foreground', accent)}>{value}</span>
    </div>
  )
}

// ── Collapsible payment-method group ──────────────────────────────────────────
function MethodTile({ m, selected, onClick }: { m: PublicPaymentMethod; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card/60 hover:border-primary/50 hover:bg-card',
      )}
    >
      <span className="w-full truncate text-xs font-semibold">{m.label}</span>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border/70 bg-background/50">
        <CryptoIcon id={m.key} className="h-8 w-8" />
      </span>
      {m.network ? (
        <span className="w-full truncate text-[11px] leading-tight text-muted-foreground">{m.network}</span>
      ) : (
        <span className="h-[13px] w-full" />
      )}
      <span className="grid h-4 w-4 place-items-center" aria-hidden="true">
        {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />}
      </span>
    </button>
  )
}

function PayGroup({
  open, onToggle, icon, iconClass, title, sub, radio, children,
}: {
  open: boolean
  onToggle: () => void
  icon: React.ReactNode
  iconClass: string
  title: React.ReactNode
  sub: React.ReactNode
  radio: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card/60 transition-colors',
        open ? 'border-primary/60 shadow-[0_0_0_1px_rgba(245,166,35,0.18)]' : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-col gap-3 p-4 text-start transition-colors hover:bg-card sm:p-5"
      >
        <span className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">{title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
          </span>
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all',
              radio ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground opacity-40',
            )}
          >
            {radio && <CheckCircle2 className="h-4 w-4" />}
          </span>
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
        <span className={cn('flex flex-wrap items-center gap-1.5', iconClass)}>{icon}</span>
      </button>
      {open && <div className="px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>}
    </div>
  )
}

function AtlosCurrencyCluster() {
  return (
    <span className="flex items-center gap-1" aria-label="USDT, BTC, ETH, SOL, LTC, BUSD and BNB">
      {(['USDT_TRC20', 'BTC', 'ETH', 'SOL', 'LTC', 'BUSD', 'BNB'] as const).map((id) => (
        <span key={id} title={id.replace('_TRC20', '')} className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <CryptoIcon id={id} className="h-5 w-5" />
        </span>
      ))}
    </span>
  )
}

function StablecoinIconCluster() {
  return (
    <span className="flex items-center gap-1.5" aria-label="BTC and ETH">
      {(['BTC', 'ETH'] as const).map((id) => (
        <span key={id} title={id} className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
          <CryptoIcon id={id} className="h-5 w-5" />
        </span>
      ))}
    </span>
  )
}

// ── Cluster of real icons for every method in a category ─────────────────────
function MethodIconCluster({ methods }: { methods: PublicPaymentMethod[] }) {
  return (
    <span className="flex max-w-full flex-wrap items-center gap-2">
      {methods.map((m) => (
        <span
          key={m.key}
          title={m.label}
          className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5"
        >
          <CryptoIcon id={m.key} className="h-5 w-5" />
        </span>
      ))}
    </span>
  )
}
