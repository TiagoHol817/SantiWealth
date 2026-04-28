// src/components/ui/FadeIn.tsx
// Fade-in en scroll usando Anime.js v4

'use client'

import { useEffect, useRef }  from 'react'
import { animate, onScroll }  from 'animejs'

interface Props {
  children:  React.ReactNode
  delay?:    number
  className?: string
}

export default function FadeIn({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Inicializar oculto
    el.style.opacity   = '0'
    el.style.transform = 'translateY(28px)'

    animate(el, {
      opacity:    [0, 1],
      translateY: [28, 0],
      duration:   650,
      delay,
      ease:       'out(2)',
      autoplay:   onScroll({ enter: 'bottom 90%' }),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
