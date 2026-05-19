'use client'

const SIZE: Record<string, string> = {
  sm: '13px',
  md: '14px',
  lg: '22px',
  xl: '26px',
}

export default function WealtHostBrand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span style={{ fontSize: SIZE[size], letterSpacing: '-0.01em', lineHeight: 1 }}>
      <span className="brand-wealth">Wealt</span>
      <span className="brand-host">Host</span>
    </span>
  )
}
