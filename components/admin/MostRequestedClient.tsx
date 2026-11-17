'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Gem, Plus, Trash2, Flame, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetch } from '@/lib/admin-fetch'
import type { PublicPackage } from '@/lib/types'

export function MostRequestedClient() {
  const [packages, setPackages] = useState<PublicPackage[] | null>(null)
  const [addingId, setAddingId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<PublicPackage | null>(null)

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

  // الباقات الظاهرة في قسم «الأكثر طلبًا» على الصفحة الرئيسية
  const featured = useMemo(
    () => (packages ?? []).filter((p) => p.popular || p.flashSale),
    [packages],
  )
  // الباقات النشطة غير المميزة والتي يمكن إضافتها إلى القسم
  const addable = useMemo(
    () => (packages ?? []).filter((p) => p.active && !p.popular && !p.flashSale),
    [packages],
  )

  async function add() {
    if (addingId === '') return
    const id = Number(addingId)
    setBusy(true)
    try {
      const res = await adminFetch(`/api/admin/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ popular: true }),
      })
      if (!res.ok) return toast.error('Add failed')
      toast.success('Added to Most Requested')
      setAddingId('')
      void load()
    } finally {
      setBusy(false)
    }
  }

  async function executeRemove(p: PublicPackage) {
    const res = await adminFetch(`/api/admin/packages/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popular: false, flashSale: false }),
    })
    if (!res.ok) return toast.error('Remove failed')
    toast.success('Removed from Most Requested')
    void load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Most Requested</h1>
        <p className="text-sm text-muted-foreground">
          Manage which packages appear in the “Most Requested” section on the store.
        </p>
      </div>

      {/* Add bar */}
      <div className="glass flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Add a package to Most Requested
          </label>
          <select
            value={addingId}
            onChange={(e) => setAddingId(e.target.value === '' ? '' : Number(e.target.value))}
            className="input-base w-full"
          >
            <option value="">Select a package…</option>
            {addable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.diamonds.toLocaleString()} 💎 — ${parseFloat(p.priceUsd).toFixed(2)}
              </option>
            ))}
          </select>
          {addable.length === 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">All active packages are already featured.</p>
          )}
        </div>
        <button
          onClick={add}
          disabled={addingId === '' || busy}
          className="btn-shimmer glow-primary flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add to Most Requested
        </button>
      </div>

      {/* Featured list */}
      {!packages ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : featured.length === 0 ? (
        <div className="glass rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Star className="mx-auto mb-3 h-8 w-8 text-gold/60" />
          <p className="font-semibold">No packages in Most Requested yet.</p>
          <p className="mt-1 text-sm">Use the bar above to add packages to the section.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <div key={p.id} className="glass rounded-2xl border border-gold/30 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2" translate="no">
                  <Gem className="h-5 w-5 text-sky-300" />
                  <span className="text-xl font-extrabold">{p.diamonds.toLocaleString()}</span>
                  {p.bonusDiamonds > 0 && <span className="text-xs font-semibold text-emerald-400">+{p.bonusDiamonds}</span>}
                </div>
                <button
                  onClick={() => setConfirmRemove(p)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  title="Remove from Most Requested"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-3 text-lg font-bold text-gold" translate="no">${parseFloat(p.priceUsd).toFixed(2)}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase">
                {p.popular && <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-primary-foreground"><Star className="h-2.5 w-2.5" /> Popular</span>}
                {p.flashSale && <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-gold"><Flame className="h-2.5 w-2.5" /> Flash</span>}
              </div>
              <button
                onClick={() => setConfirmRemove(p)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove from section
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmRemove)}
        onOpenChange={(open) => { if (!open) setConfirmRemove(null) }}
        title="Remove Package"
        description={confirmRemove ? `Remove ${confirmRemove.diamonds.toLocaleString()} 💎 from Most Requested?` : ''}
        confirmLabel="Remove"
        onConfirm={async () => {
          const target = confirmRemove
          setConfirmRemove(null)
          if (target) await executeRemove(target)
        }}
      />
    </div>
  )
}
