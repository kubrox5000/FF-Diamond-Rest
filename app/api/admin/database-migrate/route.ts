import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { detectSsl, getActiveDatabaseUrl } from '@/lib/db-ssl'

export const dynamic = 'force-dynamic'

// جميع جمل إنشاء الجداول مجمّعة — تستخدم IF NOT EXISTS لتكون آمنة للتشغيل مرات متعددة
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS "admins" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "admins_username_unique" UNIQUE("username")
);

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "discount_pct" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "used_count" integer DEFAULT 0 NOT NULL,
  "max_uses" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_number" text NOT NULL,
  "tracking_token" text NOT NULL,
  "package_id" integer NOT NULL,
  "diamonds" integer NOT NULL,
  "player_uid" text NOT NULL,
  "nickname" text,
  "server" text DEFAULT 'Global' NOT NULL,
  "email" text,
  "country" text,
  "phone" text,
  "amount_usd" numeric(10, 2) NOT NULL,
  "amount_usdt" numeric(10, 2) NOT NULL,
  "payment_method" text DEFAULT 'USDT_TRC20' NOT NULL,
  "wallet_address" text,
  "tx_id" text,
  "proof_url" text,
  "coupon_code" text,
  "status" text DEFAULT 'pending_payment' NOT NULL,
  "admin_notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
  CONSTRAINT "orders_tracking_token_unique" UNIQUE("tracking_token")
);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_token" text;
UPDATE "orders" SET "tracking_token" = md5(random()::text || clock_timestamp()::text || "id"::text) WHERE "tracking_token" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "tracking_token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_tracking_token_unique" ON "orders" USING btree ("tracking_token");

CREATE TABLE IF NOT EXISTS "packages" (
  "id" serial PRIMARY KEY NOT NULL,
  "diamonds" integer NOT NULL,
  "bonus_diamonds" integer DEFAULT 0 NOT NULL,
  "price_usd" numeric(10, 2) NOT NULL,
  "price_usdt" numeric(10, 2) NOT NULL,
  "discount_pct" integer DEFAULT 0 NOT NULL,
  "popular" boolean DEFAULT false NOT NULL,
  "flash_sale" boolean DEFAULT false NOT NULL,
  "delivery_eta" text DEFAULT '1-5 minutes' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "avatar" text,
  "rating" integer DEFAULT 5 NOT NULL,
  "comment" text NOT NULL,
  "country" text,
  "title" text,
  "country_code" text,
  "package_label" text,
  "verified" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "network" text DEFAULT '' NOT NULL,
  "cat" text DEFAULT 'wallet' NOT NULL,
  "icon" text DEFAULT 'usdt' NOT NULL,
  "wallet_address" text DEFAULT '' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "payment_methods_key_unique" UNIQUE("key")
);

INSERT INTO "payment_methods" ("key", "label", "network", "cat", "icon", "sort_order")
  VALUES
    ('USDT_TRC20', 'USDT (TRC20)', 'Tron Network', 'crypto', 'usdt', 1),
    ('USDT_BEP20', 'USDT (BEP20)', 'BNB Smart Chain', 'crypto', 'usdt', 2),
    ('BINANCE_PAY', 'Binance Pay', 'Binance App', 'wallet', 'binance', 3),
    ('BTC', 'BTC', 'Bitcoin Network', 'crypto', 'btc', 4),
    ('ETH', 'ETH', 'Ethereum Network', 'crypto', 'eth', 5),
    ('BNB', 'BNB', 'BNB Smart Chain', 'crypto', 'bnb', 6),
    ('USDC', 'USDC', 'Ethereum Network', 'crypto', 'usdc', 7),
    ('WISE', 'Wise', 'Wise Account', 'wallet', 'wise', 8),
    ('PAYONEER', 'Payoneer', 'Payoneer Account', 'wallet', 'payoneer', 9),
    ('SKRILL', 'Skrill', 'Skrill Account', 'wallet', 'skrill', 10),
    ('NETELLER', 'Neteller', 'Neteller Account', 'wallet', 'neteller', 11),
    ('REDOTPAY', 'RedotPay', 'RedotPay', 'wallet', 'redotpay', 12),
    ('BYBIT', 'Bybit', 'Bybit Account', 'wallet', 'bybit', 13),
    ('REVOLUT', 'Revolut', 'Revolut Account', 'wallet', 'revolut', 14)
  ON CONFLICT ("key") DO NOTHING;

UPDATE "payment_methods" SET "cat" = 'wallet' WHERE "key" = 'BINANCE_PAY';
`.trim()

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = getActiveDatabaseUrl()
  if (!url) {
    return NextResponse.json(
      { error: 'No database connected. Please enter your PostgreSQL connection URL below in "Connect New Database" first.' },
      { status: 400 },
    )
  }

  try {
    const postgres = (await import('postgres')).default
    const sql = postgres(url, {
      prepare: false,
      max: 1,
      connect_timeout: 15,
      ssl: detectSsl(url),
    })
    await sql.unsafe(MIGRATION_SQL)
    await sql.end()
    return NextResponse.json({ ok: true, message: '✅ All database tables created successfully!' })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
