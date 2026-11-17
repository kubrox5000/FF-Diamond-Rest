'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Wallet, Gem, Power, PowerOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { CryptoIcon } from '@/components/site/CryptoIcon'
import { adminFetch } from '@/lib/admin-fetch'
import { cn } from '@/utils/cn'
import type { PublicPaymentMethod } from '@/lib/types'

type Draft = {
  key: string
  label: string
  network: string
  cat: 'crypto' | 'wallet'
  icon: string
  walletAddress: string
  active: boolean
  sortOrder: number
}

const EMPTY: Draft = {
  key: '',
  label: '',
  network: '',
  cat: 'wallet',
  icon: 'usdt',
  walletAddress: '',
  active: true,
  sortOrder: 0,
}

export function PaymentMethodsClient() {
  const [methods, setMethods] = useState<PublicPaymentMethod[] | null>(null)
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    try {
      const res = await adminFetch('/api/admin/payment-methods')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to load payment methods')
        setMethods([])
        return
      }
      setMethods(data.methods ?? [])
    } catch {
      toast.error('Failed to load payment methods')
      setMethods([])
    }
  }

  useEffect(() => { void load() }, [])

  async function executeRemove(id: number) {
    const res = await adminFetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Delete failed')
    toast.success('Payment method deleted')
    setMethods((p) => p?.filter((x) => x.id !== id) ?? null)
  }

  async function save() {
    if (!editing) return
    const { id, draft } = editing
    if (!draft.key.trim() || !draft.label.trim()) return toast.error('Key and label are required')
    const res = await adminFetch(id ? `/api/admin/payment-methods/${id}` : '/api/admin/payment-methods', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data.error || 'Save failed')
    toast.success(id ? 'Payment method updated' : 'Payment method created')
    setEditing(null)
    void load()
  }

  async function toggleActive(m: PublicPaymentMethod) {
    const res = await adminFetch(`/api/admin/payment-methods/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !m.active }),
    })
    if (!res.ok) return toast.error('Update failed')
    toast.success(m.active ? 'Payment method disabled' : 'Payment method enabled')
    void load()
  }

  const crypto = methods?.filter((m) => m.cat === 'crypto') ?? []
  const wallet = methods?.filter((m) => m.cat === 'wallet') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Add and edit the payment methods shown at checkout</p>
        </div>
        <button
          onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}
          className="btn-shimmer glow-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> New Method
        </button>
      </div>

      {!methods ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <MethodGroup icon={<Gem className="h-4 w-4 text-sky-300" />} title="Crypto" methods={crypto} onEdit={(m) => setEditing({ id: m.id, draft: toDraft(m) })} onDelete={(id) => setDeleteId(id)} onToggle={toggleActive} />
          <MethodGroup icon={<Wallet className="h-4 w-4 text-primary" />} title="Wallets" methods={wallet} onEdit={(m) => setEditing({ id: m.id, draft: toDraft(m) })} onDelete={(id) => setDeleteId(id)} onToggle={toggleActive} />
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
          <div className="glass relative w-full max-w-md rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit Payment Method' : 'New Payment Method'}</h3>
              <button onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Key (unique code, e.g. USDT_TRC20)</label>
                <input value={editing.draft.key} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, key: e.target.value.toUpperCase() } })} className="input-base" translate="no" disabled={editing.id !== null} />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Label (shown to customers)</label>
                <input value={editing.draft.label} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, label: e.target.value } })} className="input-base" />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Network / account note</label>
                <input value={editing.draft.network} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, network: e.target.value } })} className="input-base" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={editing.draft.cat}
                  onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, cat: e.target.value as 'crypto' | 'wallet' } })}
                  className="input-base"
                >
                  <option value="crypto" className="bg-card">Crypto</option>
                  <option value="wallet" className="bg-card">Wallet</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sort Order</label>
                <input type="number" value={editing.draft.sortOrder} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, sortOrder: parseInt(e.target.value) || 0 } })} className="input-base" translate="no" />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Wallet Address (shown on the payment page)</label>
                <input value={editing.draft.walletAddress} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, walletAddress: e.target.value } })} className="input-base" translate="no" />
              </div>
              <Toggle label="Active" checked={editing.draft.active} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, active: v } })} />
            </div>

            <button onClick={save} className="btn-shimmer glow-primary mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white">
              {editing.id ? 'Save Changes' : 'Create Method'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Payment Method"
        description="Are you sure you want to delete this payment method?"
        confirmLabel="Delete"
        onConfirm={async () => {
          const target = deleteId
          setDeleteId(null)
          if (target !== null) await executeRemove(target)
        }}
      />
    </div>
  )
}

function MethodGroup({
  icon,
  title,
  methods,
  onEdit,
  onDelete,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  methods: PublicPaymentMethod[]
  onEdit: (m: PublicPaymentMethod) => void
  onDelete: (id: number) => void
  onToggle: (m: PublicPaymentMethod) => void
}) {
  if (methods.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary">{icon}</span>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => (
          <div key={m.id} className={cn('glass rounded-2xl border p-4', m.active ? 'border-border' : 'border-border/40 opacity-60')}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                <CryptoIcon id={m.key} className="h-8 w-8" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.label}</p>
                <p className="truncate text-xs text-muted-foreground" translate="no">{m.network}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onToggle(m)} title={m.active ? 'Disable (hide from customers)' : 'Enable (show to customers)'} className={cn('grid h-8 w-8 place-items-center rounded-lg border', m.active ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-border text-muted-foreground hover:bg-secondary')}>{m.active ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}</button>
                <button onClick={() => onEdit(m)} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => onDelete(m.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase">
              {!m.active && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">Hidden</span>}
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary" translate="no">{m.key}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function toDraft(m: PublicPaymentMethod): Draft {
  return {
    key: m.key,
    label: m.label,
    network: m.network,
    cat: m.cat === 'crypto' ? 'crypto' : 'wallet',
    icon: m.icon,
    walletAddress: m.walletAddress,
    active: m.active,
    sortOrder: m.sortOrder,
  }
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={cn('flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-medium', checked ? 'border-primary bg-primary/10' : 'border-border')}>
      {label}
      <span className={cn('h-4 w-8 rounded-full p-0.5 transition-colors', checked ? 'bg-primary' : 'bg-secondary')}>
        <span className={cn('block h-3 w-3 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
      </span>
    </button>
  )
}
