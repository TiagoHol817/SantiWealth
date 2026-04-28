'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { getGreeting } from '@/lib/copy'

function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(date)
}

function getTzLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZoneName: 'short',
      timeZone: tz,
    }).formatToParts(new Date())
    const abbr = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz
    return `${city} (${abbr})`
  } catch {
    return tz
  }
}

interface Props {
  userName: string
  subtitle?: string
}

export default function SmartGreeting({ userName, subtitle }: Props) {
  const [mounted,           setMounted]           = useState(false)
  const [timeStr,           setTimeStr]           = useState('')
  const [tzLabel,           setTzLabel]           = useState('')
  const [motivationalLine,  setMotivationalLine]  = useState('Resumen de tu patrimonio')

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    function update() {
      const now = new Date()
      setTimeStr(formatTime(now, tz))
      setTzLabel(getTzLabel(tz))
    }

    setMounted(true)
    // Generate motivational greeting once on mount (random — don't regenerate every minute)
    setMotivationalLine(subtitle ?? getGreeting(userName))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white" style={{ lineHeight: 1.2 }}>
        {mounted ? 'Hola' : 'Hola'},{' '}
        <span style={{ color: '#D4AF37', fontWeight: 600 }}>{userName}</span>
        <span style={{ color: '#D4AF37' }}>.</span>
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '5px' }}>
        {mounted ? motivationalLine : 'Resumen de tu patrimonio'}
      </p>
      <div className="flex items-center gap-1.5 mt-2" style={{ minHeight: '18px' }}>
        {mounted && (
          <>
            <Clock size={12} style={{ color: '#4b5563' }} />
            <span suppressHydrationWarning style={{ color: '#4b5563', fontSize: '12px' }}>
              {timeStr} · {tzLabel}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
