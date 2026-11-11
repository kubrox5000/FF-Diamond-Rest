import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'
import postgres from 'postgres'
import { detectSsl, isDatabaseConfigured } from '@/lib/db-ssl'
import { getAdminSession } from '@/lib/admin-session'
import { databaseSetupGate } from '@/lib/database-setup-guard'

export const dynamic = 'force-dynamic'

async function readEnv(): Promise<string> {
  try {
    return await readFile(path.join(process.cwd(), '.env'), 'utf-8')
  } catch {
    return ''
  }
}

function gateResponse(authenticated: boolean) {
  const gate = databaseSetupGate(authenticated, isDatabaseConfigured())
  return gate.allowed ? null : NextResponse.json({ error: gate.error }, { status: gate.status })
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ configured: isDatabaseConfigured() })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  const denied = gateResponse(Boolean(session))
  if (denied) return denied

  const body = await req.json().catch(() => null) as { url?: unknown } | null
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid database URL' }, { status: 400 })
  }
  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    return NextResponse.json({ error: 'Invalid database URL' }, { status: 400 })
  }

  let sql: ReturnType<typeof postgres> | null = null
  try {
    sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10, ssl: detectSsl(url) })
    const rows = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `

    // Recheck immediately before first-time configuration; never replace an active URL.
    const finalGate = gateResponse(Boolean(await getAdminSession()))
    if (finalGate) return finalGate

    process.env.DATABASE_URL = url
    const envPath = path.join(process.cwd(), '.env')
    let content = await readEnv()
    if (content.includes('DATABASE_URL=')) content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`)
    else content += `\nDATABASE_URL=${url}\n`
    try {
      await writeFile(envPath, content, { encoding: 'utf-8', mode: 0o600 })
    } catch {
      // Serverless deployments use configured environment variables and may have a read-only filesystem.
    }

    return NextResponse.json({ ok: true, tables: rows.map((row) => row.tablename) })
  } catch {
    return NextResponse.json({ error: 'Database setup failed; verify the connection details and try again.' }, { status: 400 })
  } finally {
    if (sql) await sql.end().catch(() => undefined)
  }
}
