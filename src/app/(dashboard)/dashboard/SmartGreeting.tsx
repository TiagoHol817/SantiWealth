'use client'

import { useMemo } from 'react'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

interface Props {
  userName: string
  subtitle?: string
}

export default function SmartGreeting({ userName, subtitle = 'Resumen de tu patrimonio' }: Props) {
  // Memoized so the greeting doesn't change mid-render cycle
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white" style={{ lineHeight: 1.2 }}>
        {greeting},{' '}
        <span style={{ color: '#D4AF37', fontWeight: 600 }}>{userName}</span>
        <span style={{ color: '#D4AF37' }}>.</span>
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>{subtitle}</p>
    </div>
  )
}
