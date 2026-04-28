import Link from 'next/link'
import HiddenValue from '@/components/HiddenValue'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1 }).format(n)

interface Props {
  goal: {
    id: string
    name: string
    target_amount: number
    current_amount: number
    target_date: string | null
    icon: string
    color: string
  }
}

export default function FeaturedGoalWidget({ goal }: Props) {
  const { name, target_amount, current_amount, target_date, icon, color } = goal
  const pct   = target_amount > 0 ? Math.min(100, Math.round((current_amount / target_amount) * 100)) : 0
  const falta = Math.max(0, target_amount - current_amount)

  let mensualNecesario: number | null = null
  let diasLabel: string | null = null
  if (target_date) {
    const dias = Math.ceil((new Date(target_date).getTime() - Date.now()) / 86400000)
    if (dias > 0) {
      diasLabel = `${dias} días restantes`
      const mesesRestantes = Math.max(1, Math.ceil(dias / 30))
      if (falta > 0) mensualNecesario = Math.ceil(falta / mesesRestantes)
    } else {
      diasLabel = 'Fecha vencida'
    }
  }

  return (
    <div className="rounded-2xl p-6 relative overflow-hidden breathe-purple"
      style={{ backgroundColor: '#1a1f2e', border: `1px solid ${color}30` }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 blur-3xl"
        style={{ background: color, transform: 'translate(20%,-20%)' }} />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: color + '20' }}>
            {icon}
          </div>
          <div>
            <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '3px' }}>Meta destacada</p>
            <p className="text-white font-bold text-lg leading-tight">{name}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
          {pct}%
        </span>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Ahorrado
          </p>
          <HiddenValue value={fmtCOP(current_amount)} className="tabular-nums font-bold"
            style={{ color, fontSize: '16px' }} />
        </div>
        <div>
          <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Meta total
          </p>
          <HiddenValue value={fmtCOP(target_amount)} className="tabular-nums font-semibold"
            style={{ color: '#9ca3af', fontSize: '16px' }} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-full overflow-hidden mb-2"
        style={{ height: '8px', backgroundColor: '#0f1117' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 0 ? 'transparent' : `linear-gradient(90deg, ${color}66, ${color})`,
          }} />
      </div>
      <div className="flex justify-between mb-4" style={{ fontSize: '10px', color: '#4b5563' }}>
        <span>0%</span>
        <span style={{ color: '#6b7280' }}>{fmtCompact(falta)} restante</span>
      </div>

      {/* Monthly needed + deadline */}
      {(mensualNecesario !== null || diasLabel) && (
        <div className="rounded-xl px-3 py-2.5 mb-4 flex items-center justify-between"
          style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
          {mensualNecesario !== null && (
            <div>
              <p style={{ color: '#4b5563', fontSize: '10px' }}>Ahorra/mes</p>
              <HiddenValue value={fmtCOP(mensualNecesario)} className="tabular-nums font-semibold"
                style={{ color: '#f59e0b', fontSize: '13px' }} />
            </div>
          )}
          {diasLabel && (
            <div className="text-right">
              <p style={{ color: '#4b5563', fontSize: '10px' }}>Plazo</p>
              <p className="font-semibold" style={{ color: '#9ca3af', fontSize: '13px' }}>{diasLabel}</p>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <Link href="/metas"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: color + '15', color, border: `1px solid ${color}30` }}>
        Ver en Metas →
      </Link>
    </div>
  )
}
