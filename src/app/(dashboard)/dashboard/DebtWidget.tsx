'use client'
import { useState } from 'react'
import HiddenValue from '@/components/HiddenValue'

interface Goal {
  id:             string
  name:           string
  target_amount:  number
  current_amount: number
  deadline?:      string | null
  icon:           string
  color:          string
}

interface Props {
  goal: Goal
  avgMonthlyPayment?: number // promedio calculado desde transacciones del tipo debt_payment
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const SCENARIOS = [
  { label: 'Base',   extra: 0,           color: '#6b7280' },
  { label: '+50%',   extra: null,         color: '#6366f1' }, // +50% del base
  { label: '+100%',  extra: null,         color: '#f59e0b' }, // doble del base
  { label: 'Meta',   extra: null,         color: '#00d4aa' }, // llegar en deadline
]

export default function DebtWidget({ goal, avgMonthlyPayment = 0 }: Props) {
  const [scenarioIdx, setScenarioIdx] = useState(0)

  const paid      = Math.max(0, goal.target_amount - goal.current_amount)
  // current_amount en metas de deuda = saldo restante
  const remaining = goal.current_amount
  const progressPct = goal.target_amount > 0
    ? Math.min(100, Math.round((paid / goal.target_amount) * 100))
    : 0

  // Calcular abono base desde promedio o estimado
  const basePayment = avgMonthlyPayment > 0 ? avgMonthlyPayment : Math.ceil(remaining / 36)

  // Calcular abono para llegar en deadline
  let deadlinePayment = 0
  if (goal.deadline) {
    const months = Math.max(1, Math.ceil(
      (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    ))
    deadlinePayment = Math.ceil(remaining / months)
  }

  const scenarios = [
    { label: 'Base',     payment: basePayment,               color: '#6b7280' },
    { label: '+50%',     payment: Math.ceil(basePayment * 1.5), color: '#6366f1' },
    { label: '+100%',    payment: Math.ceil(basePayment * 2),   color: '#f59e0b' },
    { label: '⚡ Meta',  payment: deadlinePayment || Math.ceil(basePayment * 2.5), color: '#00d4aa' },
  ]

  const currentPayment = scenarios[scenarioIdx].payment
  const accentColor    = scenarios[scenarioIdx].color

  const monthsRemaining = currentPayment > 0 ? Math.ceil(remaining / currentPayment) : Infinity
  const estimatedDate   = isFinite(monthsRemaining)
    ? (() => {
        const d = new Date()
        d.setMonth(d.getMonth() + monthsRemaining)
        return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
      })()
    : '—'

  // ¿Llega antes del deadline?
  const onTrack = goal.deadline
    ? monthsRemaining <= Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : null

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
        style={{ background: accentColor, transform: 'translate(20%,-20%)', transition: 'background 0.4s' }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: accentColor + '20' }}>
            {goal.icon}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">{goal.name}</h2>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              Restante:{' '}
              <HiddenValue value={fmtCOP(remaining)} className="inline tabular-nums text-white" />
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="tabular-nums font-black"
            style={{ color: accentColor, fontSize: '32px', lineHeight: 1, transition: 'color 0.3s' }}>
            {progressPct}%
          </p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
            <HiddenValue value={fmtCOP(paid)} className="inline tabular-nums" /> pagados
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#0f1117', height: '12px' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${accentColor} 0%, #6366f1 100%)`,
          }} />
      </div>
      <div className="flex justify-between mb-4">
        <p style={{ color: '#4b5563', fontSize: '12px' }}>
          Pagado: <span className="tabular-nums text-white">{fmtCOP(paid)}</span>
        </p>
        <p style={{ color: '#4b5563', fontSize: '12px' }}>
          Meta: <span className="tabular-nums text-white">{fmtCOP(goal.target_amount)}</span>
        </p>
      </div>

      {/* Selector de escenario */}
      <div style={{ borderTop: '1px solid #1e2535', paddingTop: '16px' }}>
        <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          Simular abono mensual
        </p>
        <div className="flex gap-2 mb-4">
          {scenarios.map((s, i) => (
            <button key={s.label}
              onClick={() => setScenarioIdx(i)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: scenarioIdx === i ? s.color + '25' : '#0f1117',
                color:           scenarioIdx === i ? s.color           : '#6b7280',
                border:          `1px solid ${scenarioIdx === i ? s.color + '60' : '#2a3040'}`,
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Proyección */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#0f1117' }}>
            <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Meses restantes
            </p>
            <p className="tabular-nums font-bold"
              style={{ color: accentColor, fontSize: '22px', marginTop: '2px', transition: 'color 0.3s' }}>
              {isFinite(monthsRemaining) ? monthsRemaining : '∞'}
            </p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: '#0f1117' }}>
            <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fecha estimada
            </p>
            <p className="font-bold" style={{ color: '#6366f1', fontSize: '15px', marginTop: '2px' }}>
              {estimatedDate}
            </p>
          </div>
        </div>

        {/* Alerta de estado */}
        {onTrack === true && (
          <div className="mt-3 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ backgroundColor: '#00d4aa15', border: '1px solid #00d4aa30' }}>
            <span style={{ fontSize: '13px' }}>✓</span>
            <p style={{ color: '#00d4aa', fontSize: '11px', fontWeight: '600' }}>
              En ruta para cumplir tu fecha límite
            </p>
          </div>
        )}
        {onTrack === false && (
          <div className="mt-3 px-3 py-2 rounded-xl"
            style={{ backgroundColor: '#f59e0b15', border: '1px solid #f59e0b30' }}>
            <p style={{ color: '#f59e0b', fontSize: '11px', fontWeight: '600' }}>
              Para llegar a tiempo necesitas ~{fmtCOP(deadlinePayment)}/mes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}