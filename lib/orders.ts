// Shared domain constants & helpers (client-safe)

export const SERVERS = [
  'Global',
  'India (IND)',
  'Bangladesh (BD)',
  'Indonesia (ID)',
  'Brazil (BR)',
  'MENA',
  'Latin America',
  'Europe',
] as const

export const PAYMENT_METHODS = [
  { id: 'USDT_TRC20', label: 'USDT (TRC20)', network: 'Tron Network', icon: 'trc20', cat: 'crypto' },
  { id: 'USDT_BEP20', label: 'USDT (BEP20)', network: 'BNB Smart Chain', icon: 'bep20', cat: 'crypto' },
  { id: 'BINANCE_PAY', label: 'Binance Pay', network: 'Binance App', icon: 'binance', cat: 'wallet' },
  { id: 'BTC', label: 'BTC', network: 'Bitcoin Network', icon: 'btc', cat: 'crypto' },
  { id: 'ETH', label: 'ETH', network: 'Ethereum Network', icon: 'eth', cat: 'crypto' },
  { id: 'BNB', label: 'BNB', network: 'BNB Smart Chain', icon: 'bnb', cat: 'crypto' },
  { id: 'USDC', label: 'USDC', network: 'Ethereum Network', icon: 'usdc', cat: 'crypto' },
  { id: 'SOL', label: 'SOL (Solana)', network: 'Solana Network', icon: 'sol', cat: 'crypto' },
  { id: 'WISE', label: 'Wise', network: 'Wise Account', icon: 'wise', cat: 'wallet' },
  { id: 'PAYONEER', label: 'Payoneer', network: 'Payoneer Account', icon: 'payoneer', cat: 'wallet' },
  { id: 'SKRILL', label: 'Skrill', network: 'Skrill Account', icon: 'skrill', cat: 'wallet' },
  { id: 'NETELLER', label: 'Neteller', network: 'Neteller Account', icon: 'neteller', cat: 'wallet' },
  { id: 'REDOTPAY', label: 'RedotPay', network: 'RedotPay', icon: 'redotpay', cat: 'wallet' },
  { id: 'BYBIT', label: 'Bybit', network: 'Bybit Account', icon: 'bybit', cat: 'wallet' },
  { id: 'REVOLUT', label: 'Revolut', network: 'Revolut Account', icon: 'revolut', cat: 'wallet' },
] as const

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id']
export type PaymentCat = (typeof PAYMENT_METHODS)[number]['cat']

export type OrderStatus =
  | 'pending_payment'
  | 'payment_review'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'cancelled'

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; dot: string; step: number }
> = {
  pending_payment: { label: 'Pending Payment', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-400', step: 1 },
  payment_review: { label: 'Payment Under Review', color: 'text-sky-300 bg-sky-500/10 border-sky-500/30', dot: 'bg-sky-400', step: 2 },
  paid: { label: 'Paid', color: 'text-violet-300 bg-violet-500/10 border-violet-500/30', dot: 'bg-violet-400', step: 3 },
  processing: { label: 'Processing', color: 'text-blue-300 bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-400', step: 4 },
  completed: { label: 'Completed', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400', step: 5 },
  cancelled: { label: 'Cancelled', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-400', step: 0 },
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending_payment',
  'payment_review',
  'paid',
  'processing',
  'completed',
  'cancelled',
]

export function generateOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `FF-${t}-${r}`
}

export function formatUsd(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return `$${n.toFixed(2)}`
}

export function formatUsdt(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return `${n.toFixed(2)} USDT`
}

export function discountedPrice(price: string | number, discountPct: number): number {
  const n = typeof price === 'string' ? parseFloat(price) : price
  return +(n * (1 - discountPct / 100)).toFixed(2)
}

export function validateDiscountPct(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null
  if (value < 0 || value > 100) return null
  return value
}

export function discountedCents(baseCents: number, discountPct: unknown): number | null {
  if (!Number.isSafeInteger(baseCents) || baseCents <= 0) return null
  const pct = validateDiscountPct(discountPct)
  if (pct === null) return null
  const amountCents = Math.round((baseCents * (100 - pct)) / 100)
  return Number.isSafeInteger(amountCents) && amountCents > 0 ? amountCents : null
}
