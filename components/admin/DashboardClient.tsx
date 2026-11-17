'use client'

import { useEffect, useState } from 'react'
import {
  ShoppingCart, DollarSign, Clock, CheckCircle2, TrendingUp,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_META, type OrderStatus } from '@/lib/orders'
import { adminFetch } from '@/lib/admin-fetch'
import { cn } from '@/utils/cn'

interface Stats {
  todayOrders: number; revenue: number; revenueToday: number; revenueWeek: number; revenueMonth: number; pending: number; completed: number; cancelled: number; total: number
}
interface Recent {
  id: number; orderNumber: string; playerUid: string; diamonds: number; amountUsd: string; status: string
}
interface Data {
  stats: Stats
  daily: { day: string; revenue: number; orders: number }[]
  monthly: { month: string; revenue: number }[]
  top: { name: string; sold: number }[]
  recent: Recent[]
}

export function DashboardClient() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadStats() {
    setError(null)
    try {
      const r = await adminFetch('/api/admin/stats')
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.stats) {
        throw new Error(d?.error || 'Failed to load dashboard stats')
      }
      setData(d as Data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard stats')
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  if (error) {
    return (
      <div className="glass rounded-2xl border border-rose-500/30 p-6 text-center">
        <p className="text-sm font-medium text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="mt-3 rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-semibold hover:bg-secondary/80"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: "Today's Orders", value: data.stats.todayOrders, icon: ShoppingCart, color: 'text-sky-300 bg-sky-500/15' },
    { label: 'Total Revenue', value: `$${data.stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'text-gold bg-gold/15' },
    { label: 'Pending', value: data.stats.pending, icon: Clock, color: 'text-amber-300 bg-amber-500/15' },
    { label: 'Completed', value: data.stats.completed, icon: CheckCircle2, color: 'text-emerald-300 bg-emerald-500/15' },
  ]

  const profitCards = [
    { label: 'Profit Today', value: data.stats.revenueToday, color: 'text-sky-300' },
    { label: 'Profit This Week', value: data.stats.revenueWeek, color: 'text-violet-300' },
    { label: 'Profit This Month', value: data.stats.revenueMonth, color: 'text-gold' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store performance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <span className={cn('grid h-9 w-9 place-items-center rounded-lg', c.color)}>
                <c.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold" translate="no">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {profitCards.map((p) => (
          <div key={p.label} className="glass rounded-2xl border border-border p-5">
            <span className="text-xs font-medium text-muted-foreground">{p.label}</span>
            <p className={cn('mt-2 text-2xl font-extrabold', p.color)} translate="no">${p.value.toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl border border-border p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp className="h-4 w-4 text-primary" /> Daily Revenue (14d)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5a623" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f244d" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#a8a298' }} />
              <YAxis tick={{ fontSize: 11, fill: '#a8a298' }} />
              <Tooltip contentStyle={{ background: '#111114', border: '1px solid #1f1f2480', borderRadius: 12, color: '#fff' }} />
              <Area type="monotone" dataKey="revenue" stroke="#f5a623" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl border border-border p-5">
          <h3 className="mb-4 font-bold">Top Selling Packages</h3>
          {data.top.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sales yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f244d" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a8a298' }} />
                <YAxis tick={{ fontSize: 11, fill: '#a8a298' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#111114', border: '1px solid #1f1f2480', borderRadius: 12, color: '#fff' }} cursor={{ fill: '#f5a6231a' }} />
                <Bar dataKey="sold" fill="#ff6b2b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl border border-border p-5">
        <h3 className="mb-4 font-bold">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">UID</th>
                <th className="pb-2 font-medium">Diamonds</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((o) => {
                const meta = STATUS_META[o.status as OrderStatus]
                return (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-mono text-xs" translate="no">{o.orderNumber}</td>
                    <td className="py-3" translate="no">{o.playerUid}</td>
                    <td className="py-3" translate="no">{o.diamonds.toLocaleString()}</td>
                    <td className="py-3 font-semibold text-gold" translate="no">${parseFloat(o.amountUsd).toFixed(2)}</td>
                    <td className="py-3">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', meta.color)}>{meta.label}</span>
                    </td>
                  </tr>
                )
              })}
              {data.recent.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
