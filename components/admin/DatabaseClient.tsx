'use client'

import { useState, useEffect } from 'react'
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle, Eye, EyeOff, RefreshCw, Zap, TableProperties } from 'lucide-react'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { adminFetch } from '@/lib/admin-fetch'

type Status = 'idle' | 'testing' | 'connecting' | 'migrating' | 'seeding' | 'success' | 'error'

export function DatabaseClient() {
  const [url, setUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [tables, setTables] = useState<string[]>([])
  const [testResult, setTestResult] = useState<null | { ok: boolean; tables?: string[] }>(null)
  const [configured, setConfigured] = useState(false)
  const [currentDbMasked, setCurrentDbMasked] = useState('')
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false)

  useEffect(() => {
    adminFetch('/api/admin/database-setup')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { configured?: boolean; masked?: string } | null) => {
        if (!d) return
        setConfigured(Boolean(d.configured))
        if (d.masked) setCurrentDbMasked(d.masked)
      })
      .catch(() => {})
  }, [])

  async function handleTest() {
    if (!url.trim()) return
    setStatus('testing')
    setMessage('')
    setTestResult(null)
    try {
      const res = await adminFetch('/api/admin/database-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), action: 'test' }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; tables?: string[]; error?: string }
      if (res.ok && data.ok) {
        setTestResult({ ok: true, tables: data.tables })
        setTables(data.tables ?? [])
        setStatus('idle')
        setMessage('Connection successful!')
      } else {
        setTestResult({ ok: false })
        setStatus('error')
        setMessage(data.error ?? 'Connection failed')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  async function handleConnect() {
    if (!url.trim()) return
    setStatus('connecting')
    setMessage('')
    try {
      const res = await adminFetch('/api/admin/database-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), action: 'connect' }),
      })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string; tables?: string[] }
      if (res.ok && data.ok) {
        setStatus('success')
        setMessage(data.message ?? 'Connected successfully!')
        setTables(data.tables ?? [])
        setConfigured(true)
        setCurrentDbMasked(url.trim().replace(/:\/\/[^@]+@/, '://****:****@'))
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Connection failed')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  // تهيئة الجداول على قاعدة البيانات الحالية بدون تغيير URL
  async function handleMigrateCurrent() {
    if (!configured && !url.trim()) {
      setStatus('error')
      setMessage('لم يتم ربط قاعدة بيانات بعد. يرجى إدخال رابط اتصال PostgreSQL في قسم Connect New Database بالأسفل أولاً.')
      return
    }
    setStatus('migrating')
    setMessage('')
    try {
      // إذا أدخل المستخدم URL نستخدمه، وإلا نطلب من الـ API أن يستخدم DATABASE_URL المحفوظ
      const body = url.trim()
        ? JSON.stringify({ url: url.trim(), action: 'migrate' })
        : undefined
      const res = await adminFetch(
        url.trim() ? '/api/admin/database-connect' : '/api/admin/database-migrate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(body ? { body } : {}),
        },
      )
      const data = await res.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string }
      if (res.ok && data.ok) {
        setStatus('success')
        setMessage(data.message ?? '✅ All database tables created successfully!')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Migration failed')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  async function executeSeed() {
    setStatus('seeding')
    setMessage('')
    try {
      const res = await adminFetch('/api/admin/database-seed', { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string }
      if (res.ok && data.ok) {
        setStatus('success')
        setMessage(data.message ?? 'Seeded successfully!')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Seed failed')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const busy = status === 'testing' || status === 'connecting' || status === 'migrating' || status === 'seeding'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Database Connection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your PostgreSQL database connection and tables.
        </p>
      </div>

      {/* ── Initialize Tables ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TableProperties className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-primary">Initialize Database Tables</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          إذا ظهر خطأ{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-rose-400">
            relation &quot;settings&quot; does not exist
          </code>
          {' '}اضغط هنا لإنشاء جميع الجداول تلقائياً.
        </p>
        {!configured && (
          <p className="text-xs text-amber-400/90 font-medium bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
            ⚠️ تنبيه: لم يتم ربط قاعدة بيانات PostgreSQL بعد. أدخل رابط الاتصال في قسم <strong>Connect New Database</strong> بالأسفل ثم اضغط <strong>Connect & Apply Migrations</strong>.
          </p>
        )}
        <button
          onClick={handleMigrateCurrent}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'migrating'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <TableProperties className="h-4 w-4" />}
          {status === 'migrating' ? 'Creating tables…' : 'Initialize Tables'}
        </button>

        {status === 'success' && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            <XCircle className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}
      </div>

      {/* ── Current status ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card/50 p-4 flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${configured ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Current Database</p>
          <p className="text-xs text-muted-foreground truncate font-mono">
            {configured ? (currentDbMasked || 'PostgreSQL (Connected)') : 'No database connected (Using fallback data)'}
          </p>
        </div>
        {configured ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Not Connected
          </span>
        )}
      </div>

      {/* ── Connect new database ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card/50 p-5 space-y-4">
        <h2 className="text-sm font-semibold">Connect New Database</h2>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">PostgreSQL Connection URL</label>
          <div className="relative">
            <input
              type={showUrl ? 'text' : 'password'}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestResult(null); setStatus('idle'); setMessage('') }}
              placeholder="postgresql://user:password@host:5432/dbname"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={() => setShowUrl(!showUrl)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports: Neon, Supabase, Railway, or any PostgreSQL provider.
          </p>
        </div>

        {/* Providers */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Neon', url: 'https://neon.tech', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            { name: 'Supabase', url: 'https://supabase.com', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
            { name: 'Railway', url: 'https://railway.app', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
          ].map((p) => (
            <a
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-lg border px-3 py-1.5 text-center text-xs font-medium transition-opacity hover:opacity-80 ${p.color}`}
            >
              {p.name} ↗
            </a>
          ))}
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
            testResult.ok
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {testResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span>
              {testResult.ok
                ? `Connection successful — ${testResult.tables?.length ?? 0} table(s) found`
                : 'Connection failed — check your URL'}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={busy || !url.trim()}
            className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
          >
            {status === 'testing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test Connection
          </button>
          <button
            onClick={handleConnect}
            disabled={busy || !url.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === 'connecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {status === 'connecting' ? 'Connecting & Migrating…' : 'Connect & Apply Migrations'}
          </button>
        </div>
      </div>

      {/* ── Seed section ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-300">Reset with Default Data</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Overwrites all current data with the original 24 packages, 2 coupons, and default settings.
        </p>
        <button
          onClick={() => setSeedConfirmOpen(true)}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          {status === 'seeding' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {status === 'seeding' ? 'Seeding…' : 'Seed Default Data'}
        </button>
      </div>

      {/* ── Tables list ──────────────────────────────────────────────────── */}
      {tables.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tables in database</p>
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <span key={t} className="rounded-lg bg-secondary/60 px-2.5 py-1 text-xs font-mono">{t}</span>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="Reset With Default Data"
        description="This will overwrite ALL current data (packages, settings, coupons, admin). Continue?"
        confirmLabel="Seed Default Data"
        onConfirm={async () => {
          setSeedConfirmOpen(false)
          await executeSeed()
        }}
      />
    </div>
  )
}
