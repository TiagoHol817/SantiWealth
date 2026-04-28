// src/components/ui/CountUpNumber.tsx
// Número animado con countup para métricas financieras del dashboard

'use client'

import { useCountUp } from '@/hooks/useCountUp'

interface Props {
  value:     number
  currency?: 'COP' | 'USD'
  delay?:    number
  className?: string
  style?:    React.CSSProperties
  hideSign?: boolean    // ocultar el signo negativo (para gastos que ya se saben negativos)
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style:               'currency',
    currency:            'COP',
    maximumFractionDigits: 0,
  }).format(n)

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style:               'currency',
    currency:            'USD',
    maximumFractionDigits: 2,
  }).format(n)

export default function CountUpNumber({ value, currency = 'COP', delay = 0, className = '', style, hideSign }: Props) {
  // Animate the absolute value; preserve sign visually
  const animated = useCountUp(Math.abs(value), { duration: 1200, delay, ease: 'outExpo' })
  const sign     = !hideSign && value < 0 ? '-' : ''
  const formatted = currency === 'USD' ? fmtUSD(animated) : fmtCOP(animated)

  return (
    <span className={`tabular-nums ${className}`} style={style}>
      {sign}{formatted}
    </span>
  )
}
