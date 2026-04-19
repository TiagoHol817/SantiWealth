'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, Lightbulb, AlertTriangle, Info } from 'lucide-react'
import { HELP_CONTENT, type ModuleHelp } from './helpContent'

const STORAGE_KEY = 'santiwealth_help_seen'

function getSeenModules(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
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
  moduleId:   string
  autoOpen?:  boolean
}

export default function HelpModal({ moduleId, autoOpen = true }: Props) {
  const [open,    setOpen]    = useState(false)
  const [tab,     setTab]     = useState<'guide' | 'tips'>('guide')

  const content: ModuleHelp | undefined = HELP_CONTENT[moduleId]

  useEffect(() => {
    if (!autoOpen || !content) return
    const seen = getSeenModules()
    if (!seen.includes(moduleId)) {
      // Pequeño delay para que la página cargue primero
      const t = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(t)
    }
  }, [moduleId, autoOpen, content])

  function handleClose() {
    markSeen(moduleId)
    setOpen(false)
  }

  if (!content) return null

  const tipIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle size={13} />
    if (type === 'tip')     return <Lightbulb size={13} />
    return <Info size={13} />
  }
  const tipColor = (type: string) => {
    if (type === 'warning') return { bg: '#2d1f0a', border: '#f59e0b40', text: '#f59e0b' }
    if (type === 'tip')     return { bg: '#0a2d1f', border: '#10b98140', text: '#10b981' }
    return { bg: '#0a0d2d', border: '#6366f140', text: '#6366f1' }
  }

  return (
    <>
      {/* Botón ? */}
      <button
        onClick={() => { setOpen(true); setTab('guide') }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
        style={{
          backgroundColor: content.color + '15',
          color:           content.color,
          border:          `1px solid ${content.color}30`,
        }}
        title={`Guía de ${content.title}`}
      >
        <span style={{ fontWeight: '700', fontSize: '13px', lineHeight: 1 }}>?</span>
        <span>¿Cómo funciona?</span>
      </button>

      {/* Overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: '#00000070', backdropFilter: 'blur(2px)' }}
            onClick={handleClose}
          />

          {/* Modal */}
          <div
            className="fixed z-50 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: '#1a1f2e',
              border: `1px solid ${content.color}40`,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%', maxWidth: '520px',
              maxHeight: '88vh', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-5 flex items-start justify-between"
              style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: content.color + '20' }}
                >
                  {content.icon}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">{content.title}</h2>
                  <p style={{ color: content.color, fontSize: '12px', marginTop: '2px' }}>{content.subtitle}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                style={{ color: '#6b7280', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-2">
              {([['guide', '📖 Guía'], ['tips', '💡 Tips']] as [string, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id as any)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: tab === id ? content.color + '20' : '#0f1117',
                    color:           tab === id ? content.color           : '#6b7280',
                    border:          `1px solid ${tab === id ? content.color + '50' : '#2a3040'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="px-6 py-4">

              {/* Tab: Guía */}
              {tab === 'guide' && (
                <>
                  <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.7', marginBottom: '20px' }}>
                    {content.description}
                  </p>

                  {/* Flujo de datos */}
                  {content.flow && (
                    <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                      <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                        Flujo de datos
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {content.flow.map((step, i) => (
                          <div key={step.label} className="flex items-center gap-2">
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                              style={{ backgroundColor: step.color + '20', border: `1px solid ${step.color}30` }}
                            >
                              <span style={{ fontSize: '14px' }}>{step.icon}</span>
                              <span style={{ color: step.color, fontSize: '12px', fontWeight: '600' }}>{step.label}</span>
                            </div>
                            {i < content.flow!.length - 1 && (
                              <ChevronRight size={14} style={{ color: '#4b5563', flexShrink: 0 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pasos */}
                  <div className="space-y-3">
                    {content.steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 p-4 rounded-xl"
                        style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: content.color + '15' }}
                        >
                          {step.icon}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm mb-1">{step.title}</p>
                          <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.6' }}>{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tab: Tips */}
              {tab === 'tips' && (
                <div className="space-y-3 mt-2">
                  {content.tips.map((tip, i) => {
                    const c = tipColor(tip.type)
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-xl"
                        style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <div style={{ color: c.text, marginTop: '2px', flexShrink: 0 }}>
                          {tipIcon(tip.type)}
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: '1.6' }}>{tip.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderTop: '1px solid #1e2535', backgroundColor: '#0f1117' }}
            >
              <a
                href="/ayuda"
                style={{ color: '#6b7280', fontSize: '12px' }}
                className="hover:text-white transition-colors"
              >
                Ver centro de ayuda completo →
              </a>
              <button
                onClick={handleClose}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: content.color, color: '#000' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}