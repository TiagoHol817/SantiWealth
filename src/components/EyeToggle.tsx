'use client'
import { Eye, EyeOff } from 'lucide-react'
import { useBalance } from '@/context/BalanceContext'

export default function EyeToggle() {
  const { visible, toggle } = useBalance()
  return (
    <button onClick={toggle}
      className="rounded-lg p-1.5 transition-all hover:bg-white/10"
      style={{ color: '#4b5563', position: 'relative', zIndex: 10 }}>
      {visible ? <Eye size={15} /> : <EyeOff size={15} />}
    </button>
  )
}