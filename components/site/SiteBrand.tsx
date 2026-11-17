'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface BrandConfig {
  siteName: string
  logo: string
}

const DEFAULT_BRAND: BrandConfig = {
  siteName: 'FF Diamond',
  logo: '',
}

const SiteBrandContext = createContext<BrandConfig>(DEFAULT_BRAND)

export function SiteBrandProvider({
  initialBrand,
  children,
}: {
  initialBrand?: Partial<BrandConfig>
  children: ReactNode
}) {
  const value: BrandConfig = {
    siteName: initialBrand?.siteName?.trim() || DEFAULT_BRAND.siteName,
    logo: initialBrand?.logo?.trim() || DEFAULT_BRAND.logo,
  }
  return <SiteBrandContext.Provider value={value}>{children}</SiteBrandContext.Provider>
}

export function SiteBrand({ nameClass = 'text-lg font-extrabold tracking-tight text-gradient' }: { nameClass?: string }) {
  const brand = useContext(SiteBrandContext)
  const name = brand.siteName || DEFAULT_BRAND.siteName
  const src = brand.logo || ''

  return (
    <>
      {src ? (
        <img src={src} alt={name} className="h-8 w-auto max-w-40 object-contain" />
      ) : (
        <span className="text-2xl diamond-float leading-none" aria-hidden>💎</span>
      )}
      <span className={nameClass} translate="no">{name}</span>
    </>
  )
}

