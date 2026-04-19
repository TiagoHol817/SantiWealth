'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const SIZE = {
  sm:  { brand: '13px', weight: '700' },
  md:  { brand: '14px', weight: '700' },
  lg:  { brand: '22px', weight: '800' },
  xl:  { brand: '26px', weight: '800' },
}

export default function WealtHostBrand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const hostColor = !mounted || resolvedTheme === 'dark' ? '#ffffff' : '#000000'
  const { brand, weight } = SIZE[size]

  return (
    <span style={{ fontSize: brand, fontWeight: weight, letterSpacing: '-0.01em', lineHeight: 1 }}>
      <span style={{ color: '#D4AF37' }}>Wealth</span>
      <span style={{ color: hostColor }}>Host</span>
    </span>
  )
}
