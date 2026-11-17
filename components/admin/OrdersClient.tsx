'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Search, Download, Eye, Loader2, X, Check, Ban, ImageOff, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { STATUS_META, ORDER_STATUSES, type OrderStatus } from '@/lib/orders'
import { adminFetch } from '@/lib/admin-fetch'
import { cn } from '@/utils/cn'
import type { PublicOrder } from '@/lib/types'

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
]

/** Normalize stored phone display without corrupting non-Morocco international numbers. */
function formatPhone(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return '—'
  if (trimmed.startsWith('+')) {
    return trimmed.replace(/\s+/g, ' ')
  }
  const v = trimmed.replace(/\D/g, '')
  if (!v) return '—'
  if (v.startsWith('212')) {
    const normalized = v.replace(/^2120/, '212')
    const national = normalized.slice(3)
    const grouped = national.replace(/(\d{1,3})(?=(\d{2})+$)/g, '$1 ')
    return `+212 ${grouped}`.trim()
  }
  return `+${v}`
}

export function OrdersClient() {
  const [orders, setOrders] = useState<PublicOrder[] | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<PublicOrder | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [confirmState, setConfirmState] = useState<
    | { type: 'single'; order: PublicOrder }
    | { type: 'all' }
    | null
  >(null)

  const load = useCallback(async () => {
    setOrders(null)
    try {
      const p = new URLSearchParams()
      if (status !== 'all') p.set('status', status)
      if (q.trim()) p.set('q', q.trim())
      const res = await adminFetch(`/api/admin/orders?${p.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to load orders')
        setOrders([])
        return
      }
      setOrders(data.orders ?? [])
    } catch {
      toast.error('Failed to load orders')
      setOrders([])
    }
  }, [q, status])

  useEffect(() => {
    void load()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function update(order: PublicOrder, patch: { status?: string; adminNotes?: string }) {
    const res = await adminFetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Update failed')
      return
    }
    toast.success('Order updated')
    setOrders((prev) => prev?.map((o) => (o.id === order.id ? data.order : o)) ?? null)
    if (selected?.id === order.id) setSelected(data.order)
  }

  async function executeRemove(order: PublicOrder) {
    const res = await adminFetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Order deleted')
    setOrders((prev) => prev?.filter((o) => o.id !== order.id) ?? null)
    if (selected?.id === order.id) setSelected(null)
  }

  async function executeDeleteAll() {
    const p = new URLSearchParams()
    if (status !== 'all') p.set('status', status)
    if (q.trim()) p.set('q', q.trim())
    const res = await adminFetch(`/api/admin/orders?${p.toString()}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || 'Delete all failed')
      return
    }
    toast.success(`${data.count} order${data.count === 1 ? '' : 's'} deleted`)
    setOrders([])
    setSelected(null)
  }

  async function exportCsv() {
    try {
      const res = await adminFetch('/api/admin/orders/export')
      if (!res.ok) {
        toast.error('Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    }
  }

  function remove(order: PublicOrder) {
    setConfirmState({ type: 'single', order })
  }

  function deleteAll() {
    setConfirmState({ type: 'all' })
  }

  const scope = status !== 'all' ? ` ${STATUS_META[status as OrderStatus].label.toLowerCase()}` : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage and process customer orders</p>
        </div>
        <button
          type="button"
          onClick={() => void exportCsv()}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button
          type="button"
          onClick={deleteAll}
          className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
        >
          <Trash2 className="h-4 w-4" /> Delete All
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
          className="flex flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order #, UID or TX ID"
              translate="no"
              className="input-base pl-9"
            />
          </div>
          <button className="btn-shimmer rounded-lg px-4 text-sm font-semibold text-white">Search</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              status === f.value ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden rounded-2xl border border-border">
        {!orders ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">No orders match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium">Player</th>
                  <th className="p-3 font-medium">Phone</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Country</th>
                  <th className="p-3 font-medium">Payment</th>
                  <th className="p-3 text-right font-medium">Diamonds</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                  <th className="p-3 text-center font-medium">Proof</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const meta = STATUS_META[o.status as OrderStatus]
                  return (
                    <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="p-3 font-mono text-xs" translate="no">{o.orderNumber}</td>
                      <td className="p-3" translate="no"><span className="font-medium">{o.playerUid}</span><br /><span className="text-xs text-muted-foreground">{o.server}</span></td>
                      <td className="p-3 text-xs whitespace-nowrap" translate="no">{formatPhone(o.phone)}</td>
                      <td className="p-3 text-xs" translate="no"><span className="block max-w-[14rem] truncate">{o.email ?? '—'}</span></td>
                      <td className="p-3 text-xs" translate="no">{o.country ?? '—'}</td>
                      <td className="p-3 text-xs whitespace-nowrap" translate="no">{o.paymentMethod}</td>
                      <td className="p-3 text-right font-medium tabular-nums" translate="no">{o.diamonds.toLocaleString()}</td>
                      <td className="p-3 text-right font-semibold text-gold tabular-nums" translate="no">${parseFloat(o.amountUsd).toFixed(2)}</td>
                      <td className="p-3">
                        {o.proofUrl ? (
                          <button
                            onClick={() => setPreview(o.proofUrl!)}
                            className="group relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border transition-transform hover:scale-105"
                            title="View payment proof"
                          >
                            <img src={o.proofUrl} alt="payment proof" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                              <Eye className="h-4 w-4" />
                            </span>
                          </button>
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground/50">
                            <ImageOff className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                      <td className="p-3"><span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', meta.color)}>{meta.label}</span></td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => update(o, { status: 'completed' })} title="Approve payment" className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => update(o, { status: 'cancelled' })} title="Reject payment" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10">
                            <Ban className="h-4 w-4" />
                          </button>
                          <button onClick={() => setSelected(o)} title="View" className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-secondary">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(o)} title="Delete order" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdate={update} onDelete={remove} />}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative max-h-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card p-2 shadow-2xl">
            <button onClick={() => setPreview(null)} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-black/70 text-white hover:bg-black">
              <X className="h-4 w-4" />
            </button>
            <img src={preview} alt="Payment proof preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => { if (!open) setConfirmState(null) }}
        title={confirmState?.type === 'all' ? 'Delete Orders' : 'Delete Order'}
        description={
          confirmState?.type === 'all'
            ? `Delete ALL${scope} orders? This cannot be undone.`
            : confirmState
              ? `Delete order ${confirmState.order.orderNumber}? This cannot be undone.`
              : ''
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          const target = confirmState
          setConfirmState(null)
          if (!target) return
          if (target.type === 'all') await executeDeleteAll()
          else await executeRemove(target.order)
        }}
      />
    </div>
  )
}

function OrderDrawer({
  order,
  onClose,
  onUpdate,
  onDelete,
}: {
  order: PublicOrder
  onClose: () => void
  onUpdate: (o: PublicOrder, patch: { status?: string; adminNotes?: string }) => Promise<void>
  onDelete: (o: PublicOrder) => void
}) {
  const [notes, setNotes] = useState(order.adminNotes ?? '')
  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(order, { status, adminNotes: notes })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold" translate="no">{order.orderNumber}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <dl className="mt-4 space-y-2 text-sm" translate="no">
          <Detail label="Player UID" value={order.playerUid} />
          <Detail label="Nickname" value={order.nickname ?? '—'} />
          <Detail label="Server" value={order.server} />
          <Detail label="Email" value={order.email ?? '—'} />
          <Detail label="Country" value={order.country ?? '—'} />
          <Detail label="Phone" value={formatPhone(order.phone)} />
          <Detail label="Diamonds" value={order.diamonds.toLocaleString()} />
          <Detail label="Amount" value={`$${parseFloat(order.amountUsd).toFixed(2)} / ${parseFloat(order.amountUsdt).toFixed(2)} USDT`} />
          <Detail label="Payment" value={order.paymentMethod} />
          <Detail label="Coupon" value={order.couponCode ?? '—'} />
          <Detail label="TX ID" value={order.txId ?? '—'} />
        </dl>

        {order.proofUrl && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Payment Proof</p>
            { }
            <img src={order.proofUrl} alt="proof" className="w-full rounded-xl border border-border" />
          </div>
        )}

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Change Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-base">
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-card">{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Admin Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-base resize-none" placeholder="Internal notes / rejection reason" />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="btn-shimmer glow-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
        </button>

        <button
          onClick={() => onDelete(order)}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 px-4 py-3 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" /> Delete Order
        </button>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all text-right font-medium">{value}</dd>
    </div>
  )
}
