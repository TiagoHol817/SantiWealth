'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const ONBOARDING_KEY = 'wealthost_onboarding_done'

// Module-level flag survives component re-mounts within an SPA session.
let inSessionDismissed = false

const STEPS = [
  { icon: '👋', color: '#10b981', title: '¡Bienvenido a WealtHost!',                          desc: 'Tu plataforma de gestión de riqueza personal. En menos de 2 minutos te mostramos todo lo que necesitas.', detail: 'WealtHost consolida en un solo lugar tus cuentas, inversiones, presupuestos, metas y reportes.' },
  { icon: '💳', color: '#6366f1', title: 'Primero: registra tus movimientos',                  desc: 'Cada peso que registras alimenta el dashboard, los reportes y el Wealth Score automáticamente.',     detail: 'Ve a Transacciones → Nueva transacción. El botón verde + (abajo a la derecha) es tu atajo más rápido.' },
  { icon: '📊', color: '#f59e0b', title: 'Tu patrimonio en tiempo real',                       desc: 'El Patrimonio muestra tu valor neto actualizado con cada transacción que registras.',                 detail: 'El gráfico construye tu historial. Guarda un snapshot diario para ver cómo creces.' },
  { icon: '🎯', color: '#10b981', title: 'Presupuestos y metas que funcionan',                 desc: 'Los presupuestos controlan tus gastos. Las metas te dicen cuándo alcanzarás tus objetivos.',          detail: 'El Wealth Score califica tu salud financiera de 0 a 100. Sube tu score con buenos hábitos.' },
  { icon: '📈', color: '#6366f1', title: 'Invierte. Crece. Supera la inflación.',              desc: 'El módulo de Inversiones es donde tu dinero empieza a trabajar para ti.',                              detail: 'El dinero que no inviertes pierde valor cada día. Cada peso debe tener un propósito.' },
] as const

export default function OnboardingWizard() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (inSessionDismissed) return

    // Source-of-truth: DB. Storage is a fast-path cache.
    try {
      const local   = localStorage.getItem(ONBOARDING_KEY)
      const session = sessionStorage.getItem(ONBOARDING_KEY)
      if (local || session) return
    } catch { /* storage blocked */ }

    let cancelled = false
    void fetch('/api/onboarding/status')
      .then((r) => r.json())
      .then((data: { completed?: boolean }) => {
        if (cancelled) return
        if (data.completed) {
          inSessionDismissed = true
          try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
          return
        }
        if (!inSessionDismissed) {
          setTimeout(() => { if (!inSessionDismissed) setShow(true) }, 800)
        }
      })
      .catch(() => { /* network failure — keep wizard hidden, don't pop unexpectedly */ })

    return () => { cancelled = true }
  }, [])

  async function dismiss() {
    inSessionDismissed = true
    setShow(false)
    try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
    try { sessionStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
    try { await fetch('/api/onboarding/complete', { method: 'POST' }) } catch {}
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ backgroundColor: '#00000085', backdropFilter: 'blur(4px)' }} />
      <div
        className="fixed z-50 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#1a1f2e',
          border: `1px solid ${current.color}40`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%', maxWidth: '500px',
        }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>Paso {step + 1} de {STEPS.length}</p>
          <button onClick={dismiss} className="flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: '#4b5563', fontSize: '12px' }}>
            <X size={13} /> Saltar
          </button>
        </div>

        <div style={{ height: '3px', backgroundColor: '#0f1117' }}>
          <div style={{ height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: current.color, transition: 'width 0.4s ease' }} />
        </div>

        <div className="px-7 py-7">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5" style={{ backgroundColor: current.color + '20' }}>
            {current.icon}
          </div>
          <h2 className="text-white font-bold text-xl mb-3 leading-tight">{current.title}</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>{current.desc}</p>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#0f1117', border: `1px solid ${current.color}25` }}>
            <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: '1.7' }}>{current.detail}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? '20px' : '6px', height: '6px', borderRadius: '3px',
                backgroundColor: i === step ? current.color : '#2a3040',
                transition: 'all 0.3s ease', border: 'none', cursor: 'pointer',
              }} />
            ))}
          </div>
        </div>

        <div className="px-7 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #1e2535', backgroundColor: '#0f1117' }}>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: step === 0 ? 'transparent' : '#1e2535',
              color:           step === 0 ? '#2a3040'     : '#9ca3af',
              border:          step === 0 ? '1px solid transparent' : '1px solid #2a3040',
            }}
          >
            <ChevronLeft size={15} /> Anterior
          </button>

          {isLast ? (
            <button onClick={dismiss} className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ backgroundColor: current.color, color: '#000' }}>
              ¡Empezar! 🚀
            </button>
          ) : (
            <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{ backgroundColor: current.color, color: '#000' }}>
              Siguiente <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
