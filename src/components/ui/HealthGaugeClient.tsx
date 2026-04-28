// src/components/ui/HealthGaugeClient.tsx
// Gauge semicircular animado con Anime.js v4 para el módulo de Presupuestos

'use client'

import { useEffect, useRef } from 'react'
import { animate }           from 'animejs'

interface Props {
  pct:     number
  sinDatos: boolean
}

export default function HealthGaugeClient({ pct, sinDatos }: Props) {
  const arcRef  = useRef<SVGCircleElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  const color  = sinDatos ? '#4b5563' : pct <= 60 ? '#10b981' : pct <= 80 ? '#f59e0b' : '#ef4444'
  const label  = sinDatos ? 'Sin datos' : pct <= 60 ? 'Vas bien 👍' : pct <= 80 ? 'Cuidado ⚠️' : 'Excedido 🚨'
  const r      = 44
  const circ   = 2 * Math.PI * r
  const ARC    = 270
  const startAngle = -135

  const targetDash = sinDatos ? 0 : circ * (Math.min(pct, 100) / 100) * (ARC / 360)

  useEffect(() => {
    if (sinDatos) return
    const arc  = arcRef.current
    const text = textRef.current
    if (!arc) return

    // start at 0
    arc.setAttribute('stroke-dasharray', `0 ${circ}`)

    const obj = { value: 0 }
    animate(obj, {
      value:    Math.min(pct, 100),
      duration: 1000,
      ease:     'outExpo',
      delay:    300,
      onUpdate: () => {
        const v    = obj.value
        const dash = circ * (v / 100) * (ARC / 360)
        arc.setAttribute('stroke-dasharray', `${dash} ${circ}`)
        if (text) text.textContent = `${Math.round(v)}%`
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, sinDatos])

  return (
    <div className="flex flex-col items-center">
      <div style={{ position: 'relative', width: '110px', height: '80px', overflow: 'hidden' }}>
        <svg width="110" height="110" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Track */}
          <circle cx="55" cy="55" r={r} fill="none" stroke="#1e2535" strokeWidth="8"
            strokeDasharray={`${circ * ARC / 360} ${circ * (1 - ARC / 360)}`}
            strokeLinecap="round"
            transform={`rotate(${startAngle} 55 55)`} />
          {/* Fill */}
          {!sinDatos && (
            <circle
              ref={arcRef}
              cx="55" cy="55" r={r}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${targetDash} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(${startAngle} 55 55)`}
              style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
            />
          )}
          <text
            ref={textRef}
            x="55" y="62"
            textAnchor="middle"
            dominantBaseline="central"
            fill={color}
            fontSize="16"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
          >
            {sinDatos ? '--' : `${Math.round(pct)}%`}
          </text>
        </svg>
      </div>
      <p style={{ color, fontSize: '13px', fontWeight: '700', marginTop: '-4px', textAlign: 'center' }}>{label}</p>
      <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '2px' }}>Uso del presupuesto</p>
    </div>
  )
}
