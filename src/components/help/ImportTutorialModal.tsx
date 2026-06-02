'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { importContent, type ImportType } from './importContent'

interface Props {
  open:    boolean
  onClose: () => void
  type:    ImportType
}

/**
 * Stacked above the parent import modal (z-[110] vs z-[100]) so it can be
 * launched from inside one and still capture the click/keyboard surface.
 *
 * Portaled to document.body to escape any ancestor `transform` containing
 * block — same defense every other modal in the app uses.
 *
 * Esc closes (without closing the parent import modal). Backdrop click
 * closes. Body scroll lock while open.
 */
export default function ImportTutorialModal({ open, onClose, type }: Props) {
  const [step, setStep] = useState(0)

  const tutorial   = importContent[type]
  const totalSteps = tutorial.steps.length
  const isLast     = step === totalSteps - 1
  const accent     = tutorial.accentColor === 'red' ? '#ef4444' : '#10b981'

  // Reset to step 0 each time we re-open
  useEffect(() => { if (open) setStep(0) }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()  // don't bubble up and close the parent modal too
        onClose()
      }
    }
    // Use capture phase so we intercept Escape before the parent modal's
    // listener (which would also close the import modal underneath).
    window.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const current = tutorial.steps[step]

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[105]"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-[110] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#1a1f2e',
          border:          `1px solid ${accent}40`,
          top:             '50%',
          left:            '50%',
          transform:       'translate(-50%, -50%)',
          width:           '100%',
          maxWidth:        '480px',
          maxHeight:       '90vh',
          overflowY:       'auto',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}
        >
          <div>
            <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Tutorial
            </p>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
              {tutorial.title}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#9ca3af', cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', backgroundColor: '#0f1117' }}>
          <div style={{
            height:          '100%',
            width:           `${((step + 1) / totalSteps) * 100}%`,
            backgroundColor: accent,
            transition:      'width 320ms cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>

        {/* Body — one step at a time */}
        <div className="px-7 py-7">
          <div
            className="rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{
              width:      '60px',
              height:     '60px',
              background: `${accent}1f`,
              border:     `1px solid ${accent}40`,
            }}
          >
            {current.icon}
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '10px', lineHeight: 1.3 }}>
            {current.title}
          </h3>
          <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: 1.65 }}>
            {current.body}
          </p>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {tutorial.steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Paso ${i + 1}`}
                style={{
                  width:           i === step ? '20px' : '6px',
                  height:          '6px',
                  borderRadius:    '3px',
                  backgroundColor: i === step ? accent : '#2a3040',
                  border:          'none',
                  cursor:          'pointer',
                  transition:      'all 250ms cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-7 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid #1e2535', backgroundColor: '#0f1117' }}
        >
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: step === 0 ? 'transparent' : '#1e2535',
              color:           step === 0 ? '#2a3040'     : '#9ca3af',
              border:          step === 0 ? '1px solid transparent' : '1px solid #2a3040',
              cursor:          step === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={14} /> Atrás
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: accent, color: '#0f1117' }}
            >
              Empezar →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: accent, color: '#0f1117' }}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
