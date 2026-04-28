// src/app/(dashboard)/dashboard/RadialScoreClient.tsx
// SVG arc animado con Anime.js v4 — dibuja de 0 → score al montar

'use client'

import { useEffect, useRef } from 'react'
import { animate }           from 'animejs'

interface Props {
  total: number   // 0–100
  color: string
}

export default function RadialScoreClient({ total, color }: Props) {
  const arcRef  = useRef<SVGCircleElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  const r    = 42
  const circ = 2 * Math.PI * r  // ~263.9
  const targetDash = (Math.min(total, 100) / 100) * circ

  useEffect(() => {
    const arc  = arcRef.current
    const text = textRef.current
    if (!arc || !text) return

    // Start from empty arc
    arc.style.strokeDasharray  = `0 ${circ}`
    arc.style.strokeDashoffset = '0'

    const obj = { value: 0 }

    animate(obj, {
      value:    total,
      duration: 1400,
      ease:     'outExpo',
      onUpdate: () => {
        const v    = obj.value
        const dash = (Math.min(v, 100) / 100) * circ
        arc.style.strokeDasharray = `${dash} ${circ}`
        if (text) text.textContent = String(Math.round(v))
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  return (
    <svg width={110} height={110} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0f1117" strokeWidth="9" />
      {/* Animated arc */}
      <circle
        ref={arcRef}
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={`${targetDash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
      />
      {/* Score text */}
      <text ref={textRef} x="50" y="45" textAnchor="middle" fill={color}
        fontSize="22" fontWeight="800" fontFamily="Roboto, sans-serif">
        {total}
      </text>
      <text x="50" y="60" textAnchor="middle" fill="#4b5563"
        fontSize="9" fontFamily="Roboto, sans-serif">
        /100
      </text>
    </svg>
  )
}
