'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const ONBOARDING_KEY = 'wealthost_onboarding_done'

const STEPS = [
  {
    icon:   '👋',
    color:  '#10b981',
    title:  '¡Bienvenido a WealthHost!',
    desc:   'Tu plataforma de gestión de riqueza personal. En menos de 2 minutos te mostramos todo lo que necesitas para empezar a tomar el control de tu dinero.',
    detail: 'WealthHost consolida en un solo lugar tus cuentas, inversiones, presupuestos, metas y reportes financieros profesionales.',
  },
  {
    icon:   '💳',
    color:  '#6366f1',
    title:  'Primero: registra tus movimientos',
    desc:   'Todo empieza con tus transacciones. Cada peso que registras alimenta el dashboard, los reportes y el Wealth Score automáticamente.',
    detail: 'Ve a Transacciones → Nueva transacción. Para ingresos, elige la fuente. Para gastos, elige la categoría. El botón verde + (abajo a la derecha) es tu atajo más rápido.',
  },
  {
    icon:   '📊',
    color:  '#f59e0b',
    title:  'Tu patrimonio en tiempo real',
    desc:   'El Dashboard muestra tu patrimonio neto actualizado con cada transacción que registras. Cuanto más datos tienes, más poderoso se vuelve.',
    detail: 'El gráfico de evolución construye tu historial financiero. Guarda un snapshot diario con el botón al fondo del Dashboard para ver cómo creces con el tiempo.',
  },
  {
    icon:   '🎯',
    color:  '#10b981',
    title:  'Presupuestos y metas que funcionan',
    desc:   'Los presupuestos controlan tus gastos mes a mes. Las metas te dicen exactamente cuándo alcanzarás tus objetivos financieros.',
    detail: 'El Wealth Score califica tu salud financiera de 0 a 100. Sube tu score registrando ingresos, reduciendo gastos innecesarios y agregando inversiones.',
  },
  {
    icon:   '📈',
    color:  '#6366f1',
    title:  'Invierte. Crece. Supera la inflación.',
    desc:   'El módulo de Inversiones es donde tu dinero empieza a trabajar para ti — no al revés. Registra acciones, CDTs, cripto y fondos en un solo lugar.',
    detail: 'El dinero que no inviertes pierde valor cada día por la inflación. Con WealthHost, cada peso tiene un propósito. Empieza con cualquier monto — lo importante es empezar hoy.',
  },
]

export default function OnboardingWizard() {
  const [show, setShow]   = useState(false)
  const [step, setStep]   = useState(0)

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY)
      if (!done) {
        const t = setTimeout(() => setShow(true), 800)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [])

  function finish() {
    try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
    setShow(false)
  }

  function skip() {
    try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
    setShow(false)
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: '#00000085', backdropFilter: 'blur(4px)' }}
      />

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
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}
        >
          <div className="flex items-center gap-2">
            <p style={{ color: '#6b7280', fontSize: '12px' }}>
              Paso {step + 1} de {STEPS.length}
            </p>
          </div>
          <button
            onClick={skip}
            className="flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: '#4b5563', fontSize: '12px' }}
          >
            <X size={13} /> Saltar
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', backgroundColor: '#0f1117' }}>
          <div
            style={{
              height: '100%',
              width: `${((step + 1) / STEPS.length) * 100}%`,
              backgroundColor: current.color,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Content */}
        <div className="px-7 py-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
            style={{ backgroundColor: current.color + '20' }}
          >
            {current.icon}
          </div>

          <h2 className="text-white font-bold text-xl mb-3 leading-tight">{current.title}</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
            {current.desc}
          </p>

          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#0f1117', border: `1px solid ${current.color}25` }}
          >
            <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: '1.7' }}>
              {current.detail}
            </p>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width:           i === step ? '20px' : '6px',
                  height:          '6px',
                  borderRadius:    '3px',
                  backgroundColor: i === step ? current.color : '#2a3040',
                  transition:      'all 0.3s ease',
                  border:          'none',
                  cursor:          'pointer',
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
            <button
              onClick={finish}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ backgroundColor: current.color, color: '#000' }}
            >
              ¡Empezar! 🚀
            </button>
          ) : (
            <button
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: current.color, color: '#000' }}
            >
              Siguiente <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}