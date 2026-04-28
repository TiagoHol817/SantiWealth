'use client'

import { useEffect, useState } from 'react'
import { getAchievementToast, type CopyModule } from '@/lib/copy'

// ─────────────────────────────────────────────────────────────────
// WealthMessage — Mensajes motivacionales contextuales
//
// Uso:
//   <WealthMessage module="metas" variant="stat" />
//   <WealthMessage module="ingresos" variant="empty" />
//   <AchievementToast event="goal_created" />
// ─────────────────────────────────────────────────────────────────

interface WealthMessageProps {
  module: CopyModule
  variant?: 'stat' | 'tip' | 'inline'
  className?: string
}

export function WealthMessage({ module, variant = 'inline', className = '' }: WealthMessageProps) {
  const [content, setContent] = useState<{ icon: string; text: string } | null>(null)

  useEffect(() => {
    // Import dinámico para no bloquear el render
    import('@/lib/copy').then(({ HELP_CONTENT }) => {
      const data = HELP_CONTENT[module]
      if (!data) return

      if (variant === 'stat' && data.stat) {
        setContent({ icon: data.icon, text: data.stat })
      } else {
        // Rotar un step aleatorio del módulo
        const idx = Math.floor(Math.random() * data.steps.length)
        setContent({ icon: data.icon, text: data.steps[idx] })
      }
    })
  }, [module, variant])

  if (!content) return null

  if (variant === 'stat') {
    return (
      <div
        className={`flex items-start gap-3 rounded-xl border border-[#00d4aa]/20 bg-[#00d4aa]/5 px-4 py-3 ${className}`}
      >
        <span className="mt-0.5 text-base leading-none">{content.icon}</span>
        <p className="text-sm leading-relaxed text-[#00d4aa]/90">{content.text}</p>
      </div>
    )
  }

  return (
    <p className={`text-sm leading-relaxed text-[#e5e7eb]/60 ${className}`}>
      {content.icon} {content.text}
    </p>
  )
}

// ─── Achievement Toast ────────────────────────────────────────────

interface AchievementToastProps {
  event: string
  onClose?: () => void
}

export function AchievementToast({ event, onClose }: AchievementToastProps) {
  const [message] = useState(() => getAchievementToast(event as never))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#00d4aa]/30 bg-[#1a1f2e] px-5 py-3.5 shadow-xl shadow-black/40">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[#00d4aa]" />
        <p className="text-sm font-medium text-[#e5e7eb]">{message}</p>
      </div>
    </div>
  )
}

// ─── useAchievementToast hook ─────────────────────────────────────

interface ToastState {
  event: string
  id: number
}

export function useAchievementToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const trigger = (event: string) => {
    setToasts((prev) => [...prev, { event, id: Date.now() }])
  }

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map((t) => (
        <AchievementToast key={t.id} event={t.event} onClose={() => remove(t.id)} />
      ))}
    </>
  )

  return { trigger, ToastContainer }
}

// ─── WealthEmptyState ─────────────────────────────────────────────

interface WealthEmptyStateProps {
  module: CopyModule
  onAction?: () => void
  className?: string
}

export function WealthEmptyState({ module, onAction, className = '' }: WealthEmptyStateProps) {
  const [content, setContent] = useState<{
    title: string
    subtitle: string
    cta: string
  } | null>(null)

  useEffect(() => {
    import('@/lib/copy').then(({ EMPTY_STATES }) => {
      setContent(EMPTY_STATES[module])
    })
  }, [module])

  if (!content) return null

  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="mb-6 h-16 w-16 rounded-2xl bg-[#1a1f2e] border border-[#00d4aa]/20 flex items-center justify-center">
        <div className="h-3 w-3 rounded-full bg-[#00d4aa]/40 animate-pulse" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#e5e7eb]">{content.title}</h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-[#e5e7eb]/50">{content.subtitle}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="rounded-xl bg-[#00d4aa] px-6 py-2.5 text-sm font-semibold text-[#0f1117] transition-all hover:scale-[1.02] hover:bg-[#00d4aa]/90 active:scale-[0.98]"
        >
          {content.cta}
        </button>
      )}
    </div>
  )
}

// ─── WealthScoreBadge ─────────────────────────────────────────────

interface WealthScoreBadgeProps {
  score: number
  className?: string
}

export function WealthScoreBadge({ score, className = '' }: WealthScoreBadgeProps) {
  const [data, setData] = useState<{ label: string; message: string } | null>(null)

  useEffect(() => {
    import('@/lib/copy').then(({ getWealthScoreMessage }) => {
      setData(getWealthScoreMessage(score))
    })
  }, [score])

  if (!data) return null

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="inline-block rounded-full bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold text-[#00d4aa]">
        {data.label}
      </span>
      <p className="text-xs leading-relaxed text-[#e5e7eb]/50">{data.message}</p>
    </div>
  )
}
