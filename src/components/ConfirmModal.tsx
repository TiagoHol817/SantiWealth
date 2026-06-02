'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

type Variant = 'danger' | 'warning' | 'info'

interface Props {
  open:          boolean
  title:         string
  message:       string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      Variant
  loading?:      boolean
  onConfirm:     () => void | Promise<void>
  onCancel:      () => void
}

const ACCENT: Record<Variant, string> = {
  danger:  '#ef4444',
  warning: '#f59e0b',
  info:    '#6366f1',
}

/**
 * Reusable confirmation dialog — replaces native window.confirm().
 *
 * Portaled into document.body so it always renders at viewport level
 * regardless of any ancestor's CSS transform (we hit that trap multiple
 * times with .page-enter).
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, loading, onCancel])

  if (!open || typeof document === 'undefined') return null

  const accent = ACCENT[variant]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div
        className="card rounded-2xl p-6 w-full shadow-2xl"
        style={{
          maxWidth:     '440px',
          borderTop:    `3px solid ${accent}`,
          background:   '#1a1f2e',
          border:       '1px solid rgba(255,255,255,0.08)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
          <div
            style={{
              flexShrink:   0,
              width:        '44px',
              height:       '44px',
              borderRadius: '50%',
              background:   `${accent}22`,
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={22} color={accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '16px', marginBottom: '6px', lineHeight: 1.3 }}>
              {title}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>{message}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary"
            style={{ padding: '10px 18px', fontSize: '13px', cursor: loading ? 'wait' : 'pointer' }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => { void onConfirm() }}
            disabled={loading}
            className="btn-primary"
            style={{
              padding:    '10px 18px',
              fontSize:   '13px',
              cursor:     loading ? 'wait' : 'pointer',
              background: variant === 'danger'
                ? `linear-gradient(135deg, ${accent}, #dc2626)`
                : variant === 'warning'
                  ? `linear-gradient(135deg, ${accent}, #d97706)`
                  : undefined,
              color: variant === 'danger' || variant === 'warning' ? '#fff' : undefined,
            }}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
