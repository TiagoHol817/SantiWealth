'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { HELP_CONTENT, type ModuleHelp } from './helpContent'

const STORAGE_KEY = 'santiwealth_help_seen'

const MODULE_ORDER = [
  'patrimonio', 'dashboard',           // dashboard kept as legacy alias
  'transacciones', 'inversiones', 'cdts', 'presupuestos',
  'metas', 'ahorros', 'costos-op', 'reportes',
]

function getSeenModules(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function markSeen(moduleId: string) {
  try {
    const seen = getSeenModules()
    if (!seen.includes(moduleId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, moduleId]))
    }
  } catch {}
}

interface Props {
  moduleId:  string
  autoOpen?: boolean
}

export default function HelpModal({ moduleId, autoOpen = true }: Props) {
  const [open,    setOpen]    = useState(false)
  const [animate, setAnimate] = useState(false)

  const content: ModuleHelp | undefined = HELP_CONTENT[moduleId]

  useEffect(() => {
    if (!autoOpen || !content) return
    const seen = getSeenModules()
    if (!seen.includes(moduleId)) {
      const t = setTimeout(() => { setOpen(true); setTimeout(() => setAnimate(true), 30) }, 600)
      return () => clearTimeout(t)
    }
  }, [moduleId, autoOpen, content])

  function handleClose() {
    markSeen(moduleId)
    setAnimate(false)
    setTimeout(() => setOpen(false), 250)
  }

  // Esc-to-close + body-scroll-lock while the modal is open. Mirrors every
  // other modal in the app (ConfirmModal, AccountEditModal, etc.).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!content) return null

  const seenCount  = typeof window !== 'undefined' ? getSeenModules().length : 0
  const moduleIdx  = MODULE_ORDER.indexOf(moduleId)
  const stepNumber = moduleIdx >= 0 ? moduleIdx + 1 : 1
  const totalMods  = MODULE_ORDER.length

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => setAnimate(true), 30) }}
        className="help-btn"
        title={`Guía de ${content.title}`}
      >
        ?
      </button>

      {/* Overlay — portaled to <body> so it escapes any ancestor `transform`
          or `opacity` that would otherwise create a containing block for
          `position: fixed` and trap the modal inside the page header
          (every page wrapper uses `.page-enter` which animates transform). */}
      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{
              backgroundColor: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              opacity: animate ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
            onClick={handleClose}
          />

          {/* Modal — flex-centered alternative would also work via portal,
              but we keep the existing top/left + transform to preserve the
              entrance animation. Now safe because we're a direct child of
              <body> — no transformed ancestors to capture us. */}
          <div
            className="fixed z-[70] rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: '#1a1f2e',
              border: `1px solid ${content.color}40`,
              top: '50%', left: '50%',
              transform: animate
                ? 'translate(-50%, -50%) translateY(0)'
                : 'translate(-50%, -50%) translateY(20px)',
              opacity: animate ? 1 : 0,
              transition: 'transform 300ms cubic-bezier(0.34,1.2,0.64,1), opacity 300ms ease',
              width: '100%', maxWidth: '520px',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Close X */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all z-10"
              style={{ color: '#6b7280' }}
            >
              <X size={16} />
            </button>

            {/* Icon + title block */}
            <div className="px-7 pt-7 pb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
                style={{
                  background: `linear-gradient(135deg, ${content.color}30, ${content.color}15)`,
                  border: `1px solid ${content.color}40`,
                }}
              >
                {content.icon}
              </div>
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: 600, lineHeight: 1.3, marginBottom: '0' }}>
                {content.title}
              </h2>
            </div>

            {/* Steps — numbered progression */}
            <div className="px-7 pb-3 space-y-3">
              {content.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0 font-bold"
                    style={{
                      width: '28px', height: '28px', minWidth: '28px',
                      backgroundColor: '#00d4aa',
                      color: '#0f1117',
                      fontSize: '13px',
                      marginTop: '1px',
                    }}
                  >
                    {i + 1}
                  </div>
                  <p style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.65', paddingTop: '4px' }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>

            {/* Stat callout */}
            {content.stat && (
              <div className="px-7 pt-2 pb-1">
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#00d4aa0d', border: '1px solid #00d4aa33' }}
                >
                  <span style={{ fontSize: '14px', lineHeight: 1, marginTop: '2px' }}>💡</span>
                  <p style={{ color: '#00d4aa', fontSize: '12px', lineHeight: '1.6' }}>{content.stat}</p>
                </div>
              </div>
            )}

            {/* CTA button */}
            <div className="px-7 pt-4 pb-5">
              <button
                onClick={handleClose}
                className="w-full transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: '#00d4aa',
                  color: '#0f1117',
                  fontWeight: 600,
                  fontSize: '14px',
                  height: '48px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                {content.cta}
              </button>
            </div>

            {/* Bottom bar: module counter + progress dots */}
            <div
              className="px-7 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid #1e2535', backgroundColor: '#0f1117' }}
            >
              <p style={{ color: '#4b5563', fontSize: '11px' }}>
                Módulo {stepNumber} de {totalMods}
              </p>
              <div className="flex items-center gap-1.5">
                {MODULE_ORDER.map((id) => {
                  const seen = typeof window !== 'undefined' && getSeenModules().includes(id)
                  const current = id === moduleId
                  return (
                    <div
                      key={id}
                      style={{
                        width:           current ? '16px' : '6px',
                        height:          '6px',
                        borderRadius:    '3px',
                        backgroundColor: current ? content.color : seen ? content.color + '60' : '#2a3040',
                        transition:      'all 0.3s ease',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
