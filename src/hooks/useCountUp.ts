// src/hooks/useCountUp.ts
// Anima un número de 0 → target usando Anime.js v4

'use client'

import { useEffect, useRef, useState } from 'react'
import { animate }                      from 'animejs'

interface Options {
  duration?: number   // ms (default 1200)
  delay?: number      // ms (default 0)
  ease?: string       // Anime.js easing (default 'outExpo')
  decimals?: number   // decimal places (default 0)
}

export function useCountUp(target: number, options: Options = {}) {
  const { duration = 1200, delay = 0, ease = 'outExpo', decimals = 0 } = options
  const [displayed, setDisplayed] = useState(0)
  const obj = useRef({ value: 0 })

  useEffect(() => {
    obj.current.value = 0
    animate(obj.current, {
      value:    target,
      duration,
      delay,
      ease,
      onUpdate: () => {
        const raw = obj.current.value
        setDisplayed(parseFloat(raw.toFixed(decimals)))
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return displayed
}
