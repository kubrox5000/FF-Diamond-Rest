import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { readdir, stat } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const root = process.cwd()
  const entries = await readdir(/* turbopackIgnore: true */ root)

  const files: { name: string; size: number }[] = []
  for (const name of entries) {
    try {
      const s = await stat(path.join(/* turbopackIgnore: true */ root, name))
      if (s.isFile()) files.push({ name, size: s.size })
    } catch { /* skip */ }
  }

  // Sort: dotfiles first, then regular files — alphabetically,
  // but give .env exact priority so it always appears before .env.*
  files.sort((a, b) => {
    const aDot = a.name.startsWith('.')
    const bDot = b.name.startsWith('.')
    if (aDot && !bDot) return -1
    if (!aDot && bDot) return 1
    // .env should sort before .env.example, .env.local, etc.
    if (a.name === '.env') return -1
    if (b.name === '.env') return 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({ files })
}
