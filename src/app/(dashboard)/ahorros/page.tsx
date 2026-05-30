import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HiddenValue from '@/components/HiddenValue'
import HelpModal from '@/components/help/HelpModal'
import { PiggyBank, Plus, Calendar, Target, ChevronRight } from 'lucide-react'
import { computePlan, type SavingsPlanRow, type Pace } from '@/lib/savings'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmt = (n: number, c: 'COP' | 'USD') => (c === 'USD' ? fmtUSD(n) : fmtCOP(n))
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const FREQ_LABEL: Record<string, string> = {
  weekly:   'semanal',
  biweekly: 'quincenal',
  monthly:  'mensual',
  custom:   'personalizado',
}

const PACE_CONFIG: Record<Pace, { color: string; label: string; bg: string }> = {
  ahead:     { color: '#a78bfa', label: '🚀 Adelantado', bg: 'rgba(167,139,250,0.10)' },
  on_track:  { color: '#10b981', label: '✓ Al día',      bg: 'rgba(16,185,129,0.10)' },
  behind:    { color: '#ef4444', label: '⚠ Atrasado',    bg: 'rgba(239,68,68,0.10)'  },
  completed: { color: '#10b981', label: '🎉 Completado', bg: 'rgba(16,185,129,0.14)' },
}

export default async function AhorrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rawPlans } = await supabase
    .from('savings_plans')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('target_date', { ascending: true })

  const plans = (rawPlans ?? []).map((row: SavingsPlanRow) => ({
    row,
    computed: computePlan(row),
  }))

  // KPI totals — group by currency in case the user mixes COP and USD plans
  const copPlans = plans.filter((p) => p.row.currency === 'COP')
  const usdPlans = plans.filter((p) => p.row.currency === 'USD')

  const totalSavedCOP = copPlans.reduce((s, p) => s + Number(p.row.current_amount), 0)
  const totalTargetCOP = copPlans.reduce((s, p) => s + Number(p.row.target_amount), 0)
  const totalSavedUSD = usdPlans.reduce((s, p) => s + Number(p.row.current_amount), 0)
  const totalTargetUSD = usdPlans.reduce((s, p) => s + Number(p.row.target_amount), 0)

  // Nearest upcoming deposit across all plans
  const upcoming = plans
    .filter((p) => p.computed.pace !== 'completed' && p.computed.daysRemaining > 0)
    .map((p) => ({ p, date: p.computed.nextDepositDate, amount: p.computed.nextDepositAmount }))
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  return (
    <div className="space-y-6 pb-8" style={{ background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.06) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden page-enter">
        <div className="blob-purple absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Ahorro programado</h1>
            <p className="page-subtitle">Planes con depósitos periódicos hacia un objetivo</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="ahorros" />
            <Link href="/ahorros/nuevo" className="btn-primary inline-flex items-center gap-2" style={{ padding: '10px 18px', fontSize: '13px' }}>
              <Plus size={14} /> Nuevo plan
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 page-enter page-enter-delay-1">
        {/* Total ahorrado */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#a78bfa', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <PiggyBank size={13} style={{ color: '#a78bfa' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total ahorrado</p>
          </div>
          {totalSavedCOP > 0 && (
            <HiddenValue value={fmtCOP(totalSavedCOP)} className="tabular-nums font-bold" style={{ color: '#e5e7eb', fontSize: '20px', display: 'block' }} />
          )}
          {totalSavedUSD > 0 && (
            <HiddenValue value={fmtUSD(totalSavedUSD)} className="tabular-nums font-bold" style={{ color: '#e5e7eb', fontSize: '20px', display: 'block' }} />
          )}
          {totalSavedCOP === 0 && totalSavedUSD === 0 && <p style={{ color: '#4b5563', fontSize: '20px', fontWeight: 700 }}>—</p>}
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
            {plans.length} plan{plans.length === 1 ? '' : 'es'} activo{plans.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Meta total */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#6366f1', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Target size={13} style={{ color: '#6366f1' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Meta total</p>
          </div>
          {totalTargetCOP > 0 && (
            <HiddenValue value={fmtCOP(totalTargetCOP)} className="tabular-nums font-bold" style={{ color: '#6366f1', fontSize: '20px', display: 'block' }} />
          )}
          {totalTargetUSD > 0 && (
            <HiddenValue value={fmtUSD(totalTargetUSD)} className="tabular-nums font-bold" style={{ color: '#6366f1', fontSize: '20px', display: 'block' }} />
          )}
          {totalTargetCOP === 0 && totalTargetUSD === 0 && <p style={{ color: '#4b5563', fontSize: '20px', fontWeight: 700 }}>—</p>}
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>Objetivos combinados</p>
        </div>

        {/* Próximo depósito */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#10b981', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Calendar size={13} style={{ color: '#10b981' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Próximo depósito</p>
          </div>
          {upcoming ? (
            <>
              <p className="tabular-nums font-bold" style={{ color: '#10b981', fontSize: '20px' }}>
                {fmt(upcoming.amount, upcoming.p.row.currency)}
              </p>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {upcoming.p.row.icon} {upcoming.p.row.name} · {fmtDate(upcoming.date)}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#4b5563', fontSize: '20px', fontWeight: 700 }}>—</p>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>Sin planes pendientes</p>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {plans.length === 0 && (
        <div className="card card-purple relative overflow-hidden page-enter page-enter-delay-2" style={{ padding: '56px 32px', textAlign: 'center' }}>
          <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: '#6366f1', transform: 'translate(-50%, -40%)' }} />
          <div
            style={{
              width:        '80px',
              height:       '80px',
              borderRadius: '20px',
              background:   'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.20))',
              border:       '1px solid rgba(99,102,241,0.30)',
              display:      'inline-flex',
              alignItems:   'center',
              justifyContent: 'center',
              margin:       '0 auto 24px',
              fontSize:     '36px',
              position:     'relative',
            }}
          >
            🐷
          </div>
          <h2 className="text-white font-bold text-2xl mb-3 tracking-tight" style={{ position: 'relative' }}>
            Empieza tu primer plan de ahorro
          </h2>
          <p className="text-muted" style={{ fontSize: '15px', maxWidth: '460px', margin: '0 auto 28px', position: 'relative' }}>
            Define un objetivo, una fecha, y deja que WealtHost calcule cuánto aportar.
          </p>
          <Link href="/ahorros/nuevo" className="btn-primary inline-flex items-center gap-2" style={{ position: 'relative', padding: '12px 22px', fontSize: '14px' }}>
            <Plus size={15} /> Crear mi primer plan
          </Link>
        </div>
      )}

      {/* Plan grid */}
      {plans.length > 0 && (
        <div className="ahorros-grid page-enter page-enter-delay-2">
          {plans.map(({ row, computed }) => {
            const cfg     = PACE_CONFIG[computed.pace]
            const c       = row.color ?? '#6366f1'
            return (
              <Link
                key={row.id}
                href={`/ahorros/${row.id}`}
                className="card card-purple ahorros-card"
                style={{
                  position:       'relative',
                  overflow:       'hidden',
                  padding:        '18px 20px',
                  textDecoration: 'none',
                  display:        'block',
                  transition:     'transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms',
                }}
              >
                {/* Left accent bar */}
                <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: c }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width:        '40px',
                      height:       '40px',
                      borderRadius: '12px',
                      background:   c + '20',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      fontSize:     '20px',
                      flexShrink:   0,
                    }}
                  >
                    {row.icon ?? '🐷'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '15px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.name}
                    </p>
                    <p className="text-muted" style={{ fontSize: '11px' }}>
                      {row.currency} · {FREQ_LABEL[row.frequency] ?? row.frequency}
                    </p>
                  </div>
                  <span
                    style={{
                      padding:      '4px 10px',
                      borderRadius: '999px',
                      fontSize:     '11px',
                      fontWeight:   600,
                      background:   cfg.bg,
                      color:        cfg.color,
                      flexShrink:   0,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '10px' }}>
                  <div className="flex justify-between" style={{ marginBottom: '6px' }}>
                    <HiddenValue
                      value={`${fmt(Number(row.current_amount), row.currency)} / ${fmt(Number(row.target_amount), row.currency)}`}
                      style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span className="tabular-nums" style={{ color: c, fontSize: '13px', fontWeight: 700 }}>
                      {computed.percentComplete.toFixed(0)}%
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: '6px', position: 'relative' }}>
                    <div className="progress-fill" style={{ width: `${computed.percentComplete}%`, backgroundColor: c }} />
                    {/* Ideal-pace marker */}
                    {computed.percentExpected > 0 && computed.percentExpected < 100 && (
                      <span style={{
                        position:     'absolute',
                        left:         `${computed.percentExpected}%`,
                        top:          '-2px',
                        bottom:       '-2px',
                        width:        '2px',
                        background:   'rgba(255,255,255,0.35)',
                        borderRadius: '1px',
                      }} />
                    )}
                  </div>
                </div>

                {/* Footer */}
                <p className="text-muted" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span>
                    {computed.daysRemaining > 0
                      ? `Quedan ${computed.daysRemaining} ${computed.daysRemaining === 1 ? 'día' : 'días'}`
                      : 'Vencido'}
                  </span>
                  {computed.pace !== 'completed' && computed.nextDepositAmount > 0 && (
                    <span style={{ color: '#9ca3af' }}>
                      Próx. aporte: <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{fmt(computed.nextDepositAmount, row.currency)}</span>
                    </span>
                  )}
                  <ChevronRight size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
                </p>
              </Link>
            )
          })}
        </div>
      )}

      <style>{`
        .ahorros-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .ahorros-card:hover {
          transform: translateY(-1px);
          border-color: rgba(99,102,241,0.45) !important;
        }
        @media (max-width: 760px) {
          .ahorros-grid { grid-template-columns: 1fr }
        }
      `}</style>
    </div>
  )
}
