'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const ONBOARDING_KEY = 'wealthost_onboarding_done'

const STEPS = [
  {
    icon:    '👋',
    color:   '#10b981',
    title:   '¡Bienvenido a WealtHost!',
    desc:    'Tu plataforma personal de gestión de riqueza. En menos de 2 minutos te explicamos todo lo que necesitas saber para empezar.',
    detail:  'WealtHost consolida en un solo lugar tus cuentas bancarias, inversiones, criptomonedas, presupuestos, metas y reportes financieros profesionales.',
  },
  {
    icon:    '💳',
    color:   '#6366f1',
    title:   'Primero: registra tus transacciones',
    desc:    'Todo empieza aquí. Cada ingreso, gasto o pago de deuda que registres alimenta automáticamente el resto de la app.',
    detail:  'Ve a Transacciones → Nueva transacción. Para ingresos, elige la fuente (plataforma digital, freelance, salario). Para gastos, elige la categoría. Para deudas, úsalo para abonos a créditos o apartamento.',
  },
  {
    icon:    '📊',
    color:   '#f59e0b',
    title:   'El Dashboard lo consolida todo',
    desc:    'Una vez que tengas transacciones e inversiones registradas, el Dashboard muestra tu patrimonio neto en tiempo real.',
    detail:  'El gráfico de evolución construye su historial con los snapshots diarios — guarda uno cada día con el botón al fondo del Dashboard.',
  },
  {
    icon:    '🎯',
    color:   '#10b981',
    title:   'Define presupuestos y metas',
    desc:    'Los presupuestos controlan tus gastos mes a mes. Las metas te proyectan cuándo alcanzarás tus objetivos financieros.',
    detail:  'El Health Score te da una calificación de 0-100 sobre tu control financiero. Las metas usan tu ahorro mensual real para calcular la fecha estimada de cumplimiento.',
  },
  {
    icon:    '📈',
    color:   '#6366f1',
    title:   'Reportes profesionales automáticos',
    desc:    'Con datos registrados, los Reportes generan tu Estado de Resultados, Balance General y Flujo de Caja sin ningún trabajo extra.',
    detail:  'Cambia entre período Semana, Quincenal, Mes o Año. El Estado de Resultados muestra utilidad neta y margen. El Balance General compara activos vs pasivos.',
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