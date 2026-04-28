'use client'
import { useBalance } from '@/context/BalanceContext'

export default function HiddenValue({
  value, className, style
}: {
  value: string
  className?: string
  style?: React.CSSProperties
}) {
  const { visible } = useBalance()
  return (
    <span className={className} style={{
      ...style,
      filter: visible ? 'none' : 'blur(8px)',
      userSelect: visible ? 'auto' : 'none',
      transition: 'filter 0.3s'
    }}>
      {visible ? value : '••••••••'}
    </span>
  )
}