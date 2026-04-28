// src/components/ui/AnimatedBar.tsx
// Barra de progreso animada con Anime.js v4 — rellena de 0% → pct% al montar

'use client'

import { useEffect, useRef } from 'react'
import { animate }           from 'animejs'

interface Props {
  pct:           number    // 0–100
  progressColor: string
  height?:       number    // px (default 10)
  milestones?:   number[]  // marcas verticales (default [25,50,75])
}

export default function AnimatedBar({
  pct,
  progressColor,
  height = 10,
  milestones = [25, 50, 75],
}: Props) {
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.width = '0%'
    animate(el, {
      width:    `${pct}%`,
      duration: 1000,
      ease:     'outExpo',
      delay:    200,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct])

  return (
    <div className="relative mb-1" style={{ height: `${height}px` }}>
      <div className="absolute inset-0 rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117' }}>
        <div
          ref={fillRef}
          className="h-full rounded-full"
          style={{
            width:      '0%',
            background: pct === 0
              ? 'transparent'
              : `linear-gradient(90deg, ${progressColor}66, ${progressColor})`,
          }}
        />
      </div>
      {milestones.map(m => (
        <div
          key={m}
          style={{
            position:        'absolute',
            top:             '-3px',
            left:            `${m}%`,
            width:           '2px',
            height:          `${height + 6}px`,
            backgroundColor: pct >= m ? progressColor : '#2a3040',
            transform:       'translateX(-50%)',
            borderRadius:    '1px',
            transition:      'background-color 0.5s ease',
          }}
        />
      ))}
    </div>
  )
}
