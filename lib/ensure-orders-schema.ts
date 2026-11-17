import 'server-only'
import postgres from 'postgres'
import { detectSsl, getActiveDatabaseUrl } from '@/lib/db-ssl'

let ensurePromise: Promise<void> | null = null

// Ensure legacy databases created prior to 0005_secure_tracking_token.sql
// have the non-null unique tracking_token column required by orders queries.
export async function ensureOrdersSchema(): Promise<void> {
  const url = getActiveDatabaseUrl()
  if (!url) return

  if (!ensurePromise) {
    ensurePromise = (async () => {
      const sql = postgres(url, {
        prepare: false,
        max: 1,
        connect_timeout: 15,
        ssl: detectSsl(url),
      })
      try {
        await sql.unsafe(`
          ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_token" text;
          UPDATE "orders" SET "tracking_token" = md5(random()::text || clock_timestamp()::text || "id"::text) WHERE "tracking_token" IS NULL;
          ALTER TABLE "orders" ALTER COLUMN "tracking_token" SET NOT NULL;
          CREATE UNIQUE INDEX IF NOT EXISTS "orders_tracking_token_unique" ON "orders" USING btree ("tracking_token");
        `)
      } finally {
        await sql.end().catch(() => undefined)
      }
    })().catch((err) => {
      ensurePromise = null
      throw err
    })
  }

  return ensurePromise
}
