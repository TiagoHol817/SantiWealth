import Link from 'next/link'
import type { WealthScoreResult } from '@/lib/services/wealthScore'
import { WealthScoreBadge } from '@/components/ui/WealthMessage'

interface Props {
  score: WealthScoreResult
  hasTransactions?: boolean
}

function PillarBar({ label, score, hint, color }: {
  label: string; score: number; hint: string; color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p style={{ color: '#9ca3af', fontSize: '11px' }}>{label}</p>
        <p className="tabular-nums font-bold" style={{ color, fontSize: '11px' }}>{score}</p>
      </div>
      <div className="rounded-full overflow-hidden mb-1" style={{ height: '5px', backgroundColor: '#0f1117' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
      <p style={{ color: '#4b5563', fontSize: '10px' }}>{hint}</p>
    </div>
  )
}

function RadialScore({ total, color }: { total: number; color: string }) {
  const r    = 42
  const circ = 2 * Math.PI * r
  const dash = (Math.min(total, 100) / 100) * circ
  return (
    <svg width={110} height={110} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#0f1117" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ filter: `drop-shadow(0 0 8px ${color}66)`, transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="50" y="45" textAnchor="middle" fill={color}
        fontSize="22" fontWeight="800" fontFamily="Roboto, sans-serif">{total}</text>
      <text x="50" y="60" textAnchor="middle" fill="#4b5563"
        fontSize="9" fontFamily="Roboto, sans-serif">/100</text>
    </svg>
  )
}

export default function WealthScoreWidget({ score, hasTransactions = true }: Props) {
  const { total, grade, color, trend, pillars } = score

  if (!hasTransactions) {
    return (
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
          style={{ background: '#6366f1', transform: 'translate(20%,-20%)' }} />
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white font-semibold text-sm">Wealth Score</p>
            <p style={{ color: '#6b7280', fontSize: '11px' }}>Salud financiera inteligente</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: '#6366f120', color: '#6366f1', border: '1px solid #6366f140' }}>
            Sin datos
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="w-[110px] h-[110px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ border: '9px solid #0f1117' }}>
            <span style={{ fontSize: '32px' }}>📊</span>
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Tu Wealth Score aparecerá aquí</p>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
              Registra tus primeras transacciones e ingresos para calcular tu salud financiera.
            </p>
            <p style={{ color: '#4b5563', fontSize: '11px', marginBottom: '14px' }}>
              El score se calcula con tus ingresos, gastos, ahorro e inversiones.
            </p>
            <Link href="/transacciones"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: '#6366f120', color: '#6366f1', border: '1px solid #6366f140' }}>
              + Agregar primera transacción
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const animClass = total < 60 ? 'breathe-purple' : total < 80 ? 'breathe-amber' : ''

  return (
    <div className={`rounded-2xl p-5 relative overflow-hidden${animClass ? ` ${animClass}` : ''}`}
      style={{ backgroundColor: '#1a1f2e', border: `1px solid ${color}30` }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
        style={{ background: color, transform: 'translate(20%,-20%)' }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">Wealth Score</p>
          <p style={{ color: '#6b7280', fontSize: '11px' }}>Salud financiera inteligente</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
          {grade}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <RadialScore total={total} color={color} />

        <div className="flex-1 space-y-3">
          <PillarBar
            label={pillars.savingsRate.label}
            score={pillars.savingsRate.score}
            hint={pillars.savingsRate.hint}
            color="#10b981"
          />
          <PillarBar
            label={pillars.investmentRatio.label}
            score={pillars.investmentRatio.score}
            hint={pillars.investmentRatio.hint}
            color="#6366f1"
          />
          <PillarBar
            label={pillars.burnRateCoverage.label}
            score={pillars.burnRateCoverage.score}
            hint={pillars.burnRateCoverage.hint}
            color="#D4AF37"
          />
        </div>
      </div>

      {/* Feedback */}
      <div className="mt-4 px-4 py-2.5 rounded-xl flex items-center gap-2"
        style={{ backgroundColor: color + '12', border: `1px solid ${color}25` }}>
        <p style={{ color: '#9ca3af', fontSize: '12px' }}>{trend}</p>
      </div>

      {/* Motivational badge */}
      <WealthScoreBadge score={total} className="mt-3" />
    </div>
  )
}
