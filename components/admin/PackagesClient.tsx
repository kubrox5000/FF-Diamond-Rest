'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, X, Gem } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetch } from '@/lib/admin-fetch'
import { cn } from '@/utils/cn'
import type { PublicPackage } from '@/lib/types'

type Draft = {
  diamonds: number; bonusDiamonds: number; priceUsd: number; priceUsdt: number
  discountPct: number; popular: boolean; flashSale: boolean; deliveryEta: string
  active: boolean; sortOrder: number
}

const EMPTY: Draft = {
  diamonds: 100, bonusDiamonds: 0, priceUsd: 0.99, priceUsdt: 0.99, discountPct: 0,
  popular: false, flashSale: false, deliveryEta: '1-5 minutes', active: true, sortOrder: 0,
}

export function PackagesClient() {
  const [packages, setPackages] = useState<PublicPackage[] | null>(null)
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  async function load() {
    try {
      const res = await adminFetch('/api/admin/packages')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to load packages')
        setPackages([])
        return
      }
      setPackages(data.packages ?? [])
    } catch {
      toast.error('Failed to load packages')
      setPackages([])
    }
  }
  useEffect(() => { void load() }, [])

  async function executeRemove(id: number) {
    const res = await adminFetch(`/api/admin/packages/${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Delete failed')
    toast.success('Package deleted')
    setPackages((p) => p?.filter((x) => x.id !== id) ?? null)
  }

  async function toggleActive(p: PublicPackage) {
    const next = !p.active
    setPackages((list) => list?.map((x) => (x.id === p.id ? { ...x, active: next } : x)) ?? null)
    const res = await adminFetch(`/api/admin/packages/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next }),
    })
    if (!res.ok) {
      toast.error('Update failed')
      void load()
      return
    }
    toast.success(next ? 'Package enabled' : 'Package disabled')
  }

  async function save() {
    if (!editing) return
    const { id, draft } = editing
    const res = await adminFetch(id ? `/api/admin/packages/${id}` : '/api/admin/packages', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return toast.error(data.error || 'Save failed')
    toast.success(id ? 'Package updated' : 'Package created')
    setEditing(null)
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Packages</h1>
          <p className="text-sm text-muted-foreground">Create, edit and manage diamond packages</p>
        </div>
        <button
          onClick={() => setEditing({ id: null, draft: { ...EMPTY } })}
          className="btn-shimmer glow-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> New Package
        </button>
      </div>

      {!packages ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className={cn('glass rounded-2xl border p-5', p.active ? 'border-border' : 'border-border/40 opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2" translate="no">
                  <Gem className="h-5 w-5 text-sky-300" />
                  <span className="text-xl font-extrabold">{p.diamonds.toLocaleString()}</span>
                  {p.bonusDiamonds > 0 && <span className="text-xs font-semibold text-emerald-400">+{p.bonusDiamonds}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ id: p.id, draft: {
                    diamonds: p.diamonds, bonusDiamonds: p.bonusDiamonds, priceUsd: parseFloat(p.priceUsd),
                    priceUsdt: parseFloat(p.priceUsdt), discountPct: p.discountPct, popular: p.popular,
                    flashSale: p.flashSale, deliveryEta: p.deliveryEta, active: p.active, sortOrder: p.sortOrder,
                  } })} className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(p.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-3 text-lg font-bold text-gold" translate="no">${parseFloat(p.priceUsd).toFixed(2)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase">
                {p.popular && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-primary-foreground">Popular</span>}
                {p.flashSale && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold">Flash</span>}
                {p.discountPct > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">-{p.discountPct}%</span>}
                {!p.active && <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">Hidden</span>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className={cn('text-xs font-semibold', p.active ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {p.active ? 'Active' : 'Disabled'}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  aria-pressed={p.active}
                  aria-label={p.active ? 'Disable package' : 'Enable package'}
                  className={cn('relative h-5 w-9 rounded-full transition-colors', p.active ? 'bg-emerald-500' : 'bg-secondary/70')}
                >
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', p.active ? 'left-[18px]' : 'left-0.5')} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
          <div className="glass relative w-full max-w-md rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit Package' : 'New Package'}</h3>
              <button onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <NumField label="Diamonds" value={editing.draft.diamonds} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, diamonds: v } })} />
              <NumField label="Bonus" value={editing.draft.bonusDiamonds} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, bonusDiamonds: v } })} />
              <NumField label="Price USD" step="0.01" value={editing.draft.priceUsd} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, priceUsd: v } })} />
              <NumField label="Price USDT" step="0.01" value={editing.draft.priceUsdt} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, priceUsdt: v } })} />
              <NumField label="Discount %" value={editing.draft.discountPct} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, discountPct: v } })} />
              <NumField label="Sort Order" value={editing.draft.sortOrder} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, sortOrder: v } })} />
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Delivery ETA</label>
                <input value={editing.draft.deliveryEta} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, deliveryEta: e.target.value } })} className="input-base" />
              </div>
              <Toggle label="Popular" checked={editing.draft.popular} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, popular: v } })} />
              <Toggle label="Flash Sale" checked={editing.draft.flashSale} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, flashSale: v } })} />
              <Toggle label="Active" checked={editing.draft.active} onChange={(v) => setEditing({ ...editing, draft: { ...editing.draft, active: v } })} />
            </div>

            <button onClick={save} className="btn-shimmer glow-primary mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white">
              {editing.id ? 'Save Changes' : 'Create Package'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Package"
        description="Are you sure you want to delete this diamond package?"
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

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="input-base" translate="no" />
    </div>
  )
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
