export interface PublicPackage {
  id: number
  diamonds: number
  bonusDiamonds: number
  priceUsd: string
  priceUsdt: string
  discountPct: number
  popular: boolean
  flashSale: boolean
  deliveryEta: string
  active: boolean
  sortOrder: number
}

export interface PublicPaymentMethod {
  id: number
  key: string
  label: string
  network: string
  cat: string
  icon: string
  walletAddress: string
  active: boolean
  sortOrder: number
}

export interface PublicOrder {
  id: number
  orderNumber: string
  trackingToken?: string
  packageId: number
  diamonds: number
  playerUid: string
  nickname: string | null
  server: string
  email: string | null
  country: string | null
  phone: string | null
  amountUsd: string
  amountUsdt: string
  paymentMethod: string
  walletAddress: string | null
  txId: string | null
  proofUrl: string | null
  couponCode: string | null
  status: string
  adminNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicReview {
  id: number
  name: string
  rating: number
  title: string | null
  comment: string
  country: string | null
  countryCode: string | null
  packageLabel: string | null
  verified: boolean
  createdAt: string
}
