import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core'

// Diamond packages available for purchase
export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  diamonds: integer('diamonds').notNull(),
  bonusDiamonds: integer('bonus_diamonds').notNull().default(0),
  priceUsd: numeric('price_usd', { precision: 10, scale: 2 }).notNull(),
  priceUsdt: numeric('price_usdt', { precision: 10, scale: 2 }).notNull(),
  discountPct: integer('discount_pct').notNull().default(0),
  popular: boolean('popular').notNull().default(false),
  flashSale: boolean('flash_sale').notNull().default(false),
  deliveryEta: text('delivery_eta').notNull().default('1-5 minutes'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Customer orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  trackingToken: text('tracking_token').notNull().unique(),
  packageId: integer('package_id').notNull(),
  diamonds: integer('diamonds').notNull(),
  playerUid: text('player_uid').notNull(),
  nickname: text('nickname'),
  server: text('server').notNull().default('Global'),
  email: text('email'),
  country: text('country'),
  phone: text('phone'),
  amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
  amountUsdt: numeric('amount_usdt', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('USDT_TRC20'),
  walletAddress: text('wallet_address'),
  txId: text('tx_id'),
  proofUrl: text('proof_url'),
  couponCode: text('coupon_code'),
  // pending_payment | payment_review | paid | processing | completed | cancelled
  status: text('status').notNull().default('pending_payment'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Customer reviews shown on the site
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  rating: integer('rating').notNull().default(5),
  title: text('title'),
  comment: text('comment').notNull(),
  country: text('country'),
  countryCode: text('country_code'),
  packageLabel: text('package_label'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Discount coupons
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountPct: integer('discount_pct').notNull().default(0),
  active: boolean('active').notNull().default(true),
  usedCount: integer('used_count').notNull().default(0),
  maxUses: integer('max_uses'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Admin users
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Payment methods shown on the store & used when creating orders
export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  network: text('network').notNull().default(''),
  cat: text('cat').notNull().default('wallet'), // 'crypto' | 'wallet'
  icon: text('icon').notNull().default('usdt'), // drives CryptoIcon brand mark
  walletAddress: text('wallet_address').notNull().default(''),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// Global site settings (single row keyed by id=1)
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  data: jsonb('data').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Package = typeof packages.$inferSelect
export type Order = typeof orders.$inferSelect
export type Review = typeof reviews.$inferSelect
export type Coupon = typeof coupons.$inferSelect
export type PaymentMethod = typeof paymentMethods.$inferSelect
