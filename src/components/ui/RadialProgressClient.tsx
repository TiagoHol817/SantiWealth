// src/components/ui/RadialProgressClient.tsx
// Progreso radial SVG animado con Anime.js v4

'use client'

import { useEffect, useRef } from 'react'
import { animate }           from 'animejs'

interface Props {
  pct:    number   // 0–100
  color:  string
  size?:  number   // px (default 120)
}

export default function RadialProgressClient({ pct, color, size = 120 }: Props) {
  const arcRef  = useRef<SVGCircleElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  const r    = 46
  const circ = 2 * Math.PI * r

  useEffect(() => {
    const arc  = arcRef.current
    const text = textRef.current
    if (!arc) return

    arc.style.strokeDasharray = `0 ${circ}`

    const obj = { value: 0 }
    animate(obj, {
      value:    Math.min(pct, 100),
      duration: 1200,
      ease:     'outExpo',
      delay:    150,
      onUpdate: () => {
        const v    = obj.value
        const dash = (v / 100) * circ
        arc.style.strokeDasharray = `${dash} ${circ}`
        if (text) text.textContent = `${Math.round(v)}%`
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct])

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0f1117" strokeWidth="8" />
      <circle
        ref={arcRef}
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${(Math.min(pct, 100) / 100) * circ} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
      />
      <text
        ref={textRef}
        x="50" y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="18"
        fontWeight="bold"
        fontFamily="Roboto, sans-serif"
      >
        {Math.min(pct, 100)}%
      </text>
    </svg>
  )
}
