'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Search, Loader2, Gem, PackageSearch } from 'lucide-react'
import { STATUS_META, type OrderStatus } from '@/lib/orders'
import { formatNumber } from '@/lib/currencies'
import { useLocale } from '@/components/geo/GeoLocaleProvider'
import { cn } from '@/utils/cn'
import type { PublicOrder } from '@/lib/types'

const TIMELINE: OrderStatus[] = ['pending_payment', 'payment_review', 'paid', 'processing', 'completed']

export function TrackClient() {
  const params = useSearchParams()
  const { t } = useLocale()
  const [query, setQuery] = useState(params.get('order') ?? '')
  const [token, setToken] = useState(params.get('token') ?? '')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<PublicOrder[] | null>(null)

  const search = useCallback(async (order: string, privateToken: string) => {
    if (!order.trim() || !privateToken.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/track?order=${encodeURIComponent(order.trim())}&token=${encodeURIComponent(privateToken.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('tr_failed'))
      setOrders(data.orders)
      if (data.orders.length === 0) toast.info(t('tr_not_found'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tr_failed'))
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const order = params.get('order')
    const privateToken = params.get('token')
    if (order && privateToken) search(order, privateToken)
  }, [params, search])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          search(query, token)
        }}
        className="glass mx-auto flex max-w-xl gap-2 rounded-2xl border border-border p-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order number"
          aria-label="Order number"
          translate="no"
          className="input-base flex-1 border-0 bg-transparent focus:ring-0"
        />
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Private tracking token"
          aria-label="Private tracking token"
          translate="no"
          className="input-base flex-1 border-0 bg-transparent focus:ring-0"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-shimmer flex items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t('tr_btn')}
        </button>
      </form>

      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        {orders && orders.length === 0 && !loading && (
          <div className="glass rounded-2xl border border-border p-10 text-center">
            <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">{t('tr_none')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('tr_none_sub')}{' '}
              <Link href="/top-up" className="text-primary hover:underline">{t('tr_new')}</Link>.
            </p>
          </div>
        )}

        {orders?.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: PublicOrder }) {
  const { t, formatPrice } = useLocale()
  const status = order.status as OrderStatus
  const meta = STATUS_META[status]
  const cancelled = status === 'cancelled'
  const statusText: Record<OrderStatus, string> = {
    pending_payment: t('st_pending_payment'),
    payment_review: t('st_payment_review'),
    paid: t('st_paid'),
    processing: t('st_processing'),
    completed: t('st_completed'),
    cancelled: t('st_cancelled'),
  }

  return (
    <div className="glass rounded-2xl border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-bold" translate="no">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground" translate="no">UID {order.playerUid} · {order.server}</p>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', meta.color)}>
          {statusText[status]}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary/40 p-3" translate="no">
        <Gem className="h-5 w-5 text-sky-300" />
        <span className="font-bold">{formatNumber(order.diamonds)} 💎</span>
        <span className="ml-auto font-bold text-gold">{formatPrice(parseFloat(order.amountUsd))}</span>
      </div>

      {!cancelled ? (
        <div className="mt-6">
          <div className="relative flex justify-between">
            <div className="absolute left-0 right-0 top-3 h-0.5 bg-border" />
            <div
              className="absolute left-0 top-3 h-0.5 bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${((meta.step - 1) / (TIMELINE.length - 1)) * 100}%` }}
            />
            {TIMELINE.map((s, i) => {
              const done = i < meta.step
              return (
                <div key={s} className="relative z-10 flex flex-col items-center gap-2" style={{ width: `${100 / TIMELINE.length}%` }}>
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-full border-2 text-[10px] font-bold',
                      done ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="hidden text-center text-[10px] leading-tight text-muted-foreground sm:block">
                    {statusText[s]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {t('tr_cancelled')} {order.adminNotes ? t('tr_reason', { r: order.adminNotes }) : t('tr_cancelled_help')}
        </div>
      )}

      {status === 'pending_payment' && (
        <Link
          href={`/payment/${order.orderNumber}`}
          className="btn-shimmer mt-5 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
        >
          {t('tr_complete_payment')}
        </Link>
      )}
    </div>
  )
}
