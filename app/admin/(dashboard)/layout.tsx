'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { adminFetch } from '@/lib/admin-fetch'

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    adminFetch('/api/admin/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((d: { username?: string }) => {
        if (!active) return
        if (d.username) {
          setUsername(d.username)
        } else {
          router.replace('/admin')
        }
      })
      .catch(() => {
        if (active) router.replace('/admin')
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => { active = false }
  }, [pathname, router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-2xl diamond-float">💎</span>
      </div>
    )
  }

  if (!username) return null

  return <AdminShell username={username}>{children}</AdminShell>
}
