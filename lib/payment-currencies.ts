// Single authoritative list of supported storefront cryptocurrencies.
// BUSD is discontinued and excluded from all public pages, checkout, and API validation.

export const SUPPORTED_CRYPTO_CURRENCIES = [
  'USDT',
  'BTC',
  'ETH',
  'SOL',
  'LTC',
  'BNB',
] as const

export type SupportedCryptoCurrency = (typeof SUPPORTED_CRYPTO_CURRENCIES)[number]

// CryptoIcon IDs corresponding 1:1 to SUPPORTED_CRYPTO_CURRENCIES
export const SUPPORTED_CRYPTO_ICON_IDS = [
  'USDT_TRC20',
  'BTC',
  'ETH',
  'SOL',
  'LTC',
  'BNB',
] as const

export const STOREFRONT_CRYPTO_METHOD_KEYS = [
  'USDT_TRC20',
  'BTC',
  'ETH',
  'SOL',
  'LTC',
  'BNB',
] as const

export const STOREFRONT_GATEWAY_KEYS = [
  'ATLOS',
  'HELEKET',
  'PLISIO',
] as const

export const STOREFRONT_ALLOWED_PAYMENT_KEYS: ReadonlySet<string> = new Set([
  ...STOREFRONT_GATEWAY_KEYS,
  ...STOREFRONT_CRYPTO_METHOD_KEYS,
])

export const SUPPORTED_CRYPTO_COMMA_LIST = SUPPORTED_CRYPTO_CURRENCIES.join(', ')
export const SUPPORTED_CRYPTO_DOT_LIST = SUPPORTED_CRYPTO_CURRENCIES.join(' · ')
