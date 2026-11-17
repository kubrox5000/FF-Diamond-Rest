'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Lock, User, Database, Eye, EyeOff, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Database setup section
  const [dbOpen, setDbOpen] = useState(false)
  const [dbUrl, setDbUrl] = useState('')
  const [showDbUrl, setShowDbUrl] = useState(false)
  const [dbStatus, setDbStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [dbMessage, setDbMessage] = useState('')
  const [currentDb, setCurrentDb] = useState('')

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) return
    adminFetch('/api/admin/database-setup')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { configured?: boolean; masked?: string } | null) => {
        if (d?.configured) setCurrentDb(d.masked ?? '')
      })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json() as { ok?: boolean; token?: string; username?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Login failed')
      // Save token in localStorage as fallback when cookies are blocked
      if (data.token) {
        localStorage.setItem('admin_token', data.token)
      }
      toast.success('Welcome back!')
      router.push('/admin/dashboard')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed')
      setLoading(false)
    }
  }

  async function handleSaveDb() {
    if (!dbUrl.trim()) return
    setDbStatus('saving')
    setDbMessage('')
    try {
      const res = await adminFetch('/api/admin/database-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dbUrl.trim() }),
      })
      if (res.status === 401) {
        setDbStatus('error')
        setDbMessage('Please sign in first before connecting a database.')
        return
      }
      const data = await res.json() as { ok?: boolean; error?: string; tables?: string[] }
      if (res.ok && data.ok) {
        setDbStatus('success')
        setDbMessage(`Connected! ${data.tables?.length ?? 0} table(s) found.`)
        setCurrentDb(dbUrl.trim().replace(/:\/\/[^@]+@/, '://****:****@'))
        setDbUrl('')
        toast.success('Database URL saved successfully!')
      } else {
        setDbStatus('error')
        setDbMessage(data.error ?? 'Connection failed')
      }
    } catch {
      setDbStatus('error')
      setDbMessage('Network error. Please try again.')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl diamond-float leading-none">💎</span>
          <h1 className="text-2xl font-extrabold">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage FF Diamond</p>
        </div>

        {/* Database Setup Accordion */}
        <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setDbOpen(!dbOpen)}
            className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-secondary/30 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Database Connection
              {currentDb && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-normal">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              )}
            </span>
            {dbOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {dbOpen && (
            <div className="border-t border-border px-5 pb-5 pt-4 space-y-3">
              {currentDb && (
                <p className="text-xs text-muted-foreground font-mono truncate bg-secondary/40 rounded-lg px-3 py-2">
                  {currentDb}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">PostgreSQL Connection URL</label>
                <div className="relative">
                  <input
                    type={showDbUrl ? 'text' : 'password'}
                    value={dbUrl}
                    onChange={(e) => { setDbUrl(e.target.value); setDbStatus('idle'); setDbMessage('') }}
                    placeholder="postgresql://user:pass@host:5432/db"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbUrl(!showDbUrl)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showDbUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {dbStatus === 'success' && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  {dbMessage}
                </div>
              )}
              {dbStatus === 'error' && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  {dbMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveDb}
                disabled={dbStatus === 'saving' || !dbUrl.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {dbStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                {dbStatus === 'saving' ? 'Connecting…' : 'Save & Connect'}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Supports Neon · Supabase · Railway · any PostgreSQL
              </p>
            </div>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={submit} className="glass rounded-2xl border border-border p-6">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-base"
            translate="no"
            autoComplete="username"
          />

          <label className="mb-1.5 mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-shimmer glow-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
