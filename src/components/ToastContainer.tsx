'use client'

import { useToast, Toast, ToastType } from '@/context/ToastContext'
import { useEffect, useState } from 'react'

const CONFIG: Record<ToastType, { color: string; bg: string; border: string; icon: string }> = {
  success: {
    color:  '#00d4aa',
    bg:     '#0a1f1c',
    border: '#00d4aa40',
    icon:   '✓',
  },
  error: {
    color:  '#ef4444',
    bg:     '#1f0a0a',
    border: '#ef444440',
    icon:   '✕',
  },
  warning: {
    color:  '#f59e0b',
    bg:     '#1f180a',
    border: '#f59e0b40',
    icon:   '⚠',
  },
  info: {
    color:  '#6366f1',
    bg:     '#0f0a1f',
    border: '#6366f140',
    icon:   'i',
  },
}

function ProgressBar({ duration, color }: { duration: number; color: string }) {
  const [width, setWidth] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setWidth(remaining)
      if (remaining === 0) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [duration, color])

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: '#ffffff10',
      borderRadius: '0 0 12px 12px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: color,
        transition: 'width 50ms linear',
      }} />
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  const cfg = CONFIG[toast.type]

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10)
    const fadeOut = (toast.duration ?? 4000) - 400
    const t2 = setTimeout(() => setVisible(false), fadeOut)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [toast.duration])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
        cursor: 'pointer',
        minWidth: '280px',
        maxWidth: '380px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Icono */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: `${cfg.color}20`,
        border: `1.5px solid ${cfg.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        color: cfg.color,
        flexShrink: 0,
        marginTop: '1px',
      }}>
        {cfg.icon}
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '600',
          color: '#e5e7eb',
          lineHeight: '1.3',
        }}>
          {toast.title}
        </p>
        {toast.message && (
          <p style={{
            margin: '3px 0 0',
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '1.4',
          }}>
            {toast.message}
          </p>
        )}
      </div>

      {/* Barra de progreso */}
      <ProgressBar duration={toast.duration ?? 4000} color={cfg.color} />
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  )
}
