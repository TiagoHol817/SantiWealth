import { createClient } from '@/lib/supabase/server'
import CDTUploader from './CDTUploader'
import HiddenValue from '@/components/HiddenValue'
import HelpModal from '@/components/help/HelpModal'
import { Landmark, Clock, TrendingUp } from 'lucide-react'

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

interface UnifiedCDT {
  id:             string
  name:           string
  institution:    string
  apertura:       string
  vencimiento:    string
  capital:        number
  tasaEa:         number
  tasaNominal:    number
  diasRestantes:  number
  diasTotales:    number
  progreso:       number
  rendTotal:      number
  rendActual:     number
  vencido:        boolean
  urgente:        boolean
  source:         'cdts_table' | 'legacy_account'
}

export default async function CDTsPage() {
  const supabase = await createClient()

  // ── Two data sources, unified ─────────────────────────────────────────────
  // 1. cdts table  → modern, dedicated schema (preferred for new imports/manual)
  // 2. accounts of type='other' named "%CDT%" → legacy rows still in use
  // We dedupe nothing — the legacy ones are different records that haven't been
  // migrated. They will eventually disappear as users replace them.
  const [{ data: rawCdts }, { data: cdtAccounts }] = await Promise.all([
    supabase.from('cdts').select('*').order('start_date', { ascending: false }),
    supabase.from('accounts').select('*').eq('type', 'other').ilike('name', '%CDT%'),
  ])

  const today = new Date()

  const fromTable: UnifiedCDT[] = (rawCdts ?? []).map((c) => {
    const endDate     = c.end_date ?? c.start_date
    const apertura    = new Date(c.start_date)
    const vencim      = new Date(endDate)
    const diasRestantes = Math.ceil((vencim.getTime() - today.getTime()) / 86_400_000)
    const diasTotales   = Math.max(1, Math.ceil((vencim.getTime() - apertura.getTime()) / 86_400_000))
    const progreso    = Math.min(100, Math.max(0, Math.round(((diasTotales - diasRestantes) / diasTotales) * 100)))
    const capital     = Number(c.capital)
    const tasaEa      = Number(c.interest_rate ?? 0)
    const rendTotal   = capital * (tasaEa / 100) * (diasTotales / 365)
    const rendActual  = capital * (tasaEa / 100) * ((diasTotales - Math.max(0, diasRestantes)) / 365)
    return {
      id:           c.id as string,
      name:         `${c.bank}${c.investment_id ? ' #' + String(c.investment_id).slice(-6) : ''}`,
      institution:  String(c.bank ?? 'Banco'),
      apertura:     c.start_date,
      vencimiento:  endDate,
      capital,
      tasaEa,
      tasaNominal:  tasaEa,
      diasRestantes,
      diasTotales,
      progreso,
      rendTotal,
      rendActual,
      vencido:      diasRestantes <= 0,
      urgente:      diasRestantes > 0 && diasRestantes <= 15,
      source:       'cdts_table',
    }
  })

  const fromLegacy: UnifiedCDT[] = (cdtAccounts ?? []).map((a) => {
    const meta          = typeof a.notes === 'string' ? JSON.parse(a.notes) : (a.notes ?? {})
    const vencimiento   = new Date(meta.vencimiento)
    const apertura      = new Date(meta.apertura)
    const diasRestantes = Math.ceil((vencimiento.getTime() - today.getTime()) / 86_400_000)
    const diasTotales   = Math.max(1, Math.ceil((vencimiento.getTime() - apertura.getTime()) / 86_400_000))
    const progreso      = Math.min(100, Math.max(0, Math.round(((diasTotales - diasRestantes) / diasTotales) * 100)))
    const capital       = Number(a.current_balance) || 0
    const tasaEa        = Number(meta.tasa_ea ?? 0)
    const rendTotal     = capital * (tasaEa / 100) * (diasTotales / 365)
    const rendActual    = capital * (tasaEa / 100) * ((diasTotales - Math.max(0, diasRestantes)) / 365)
    return {
      id:           a.id,
      name:         a.name,
      institution:  'Bancolombia',
      apertura:     meta.apertura,
      vencimiento:  meta.vencimiento,
      capital,
      tasaEa,
      tasaNominal:  Number(meta.tasa_nominal ?? meta.tasa_ea ?? 0),
      diasRestantes,
      diasTotales,
      progreso,
      rendTotal,
      rendActual,
      vencido:      diasRestantes <= 0,
      urgente:      diasRestantes > 0 && diasRestantes <= 15,
      source:       'legacy_account',
    }
  })

  const cdts = [...fromTable, ...fromLegacy].sort((a, b) => a.diasRestantes - b.diasRestantes)

  const totalCapital  = cdts.reduce((s, c) => s + c.capital, 0)
  const totalEsperado = cdts.reduce((s, c) => s + c.rendTotal, 0)
  const proximo       = cdts.find((c) => !c.vencido)

  // CDTUploader needs the legacy account shape (uses meta JSON in notes)
  const uploaderCDTs = fromLegacy.map((c) => ({
    id:               c.id,
    name:             c.name,
    notes:            {
      apertura:        c.apertura,
      vencimiento:     c.vencimiento,
      tasa_ea:         c.tasaEa,
      tasa_nominal:    c.tasaNominal,
      plazo_dias:      c.diasTotales,
      interes_periodo: c.rendTotal,
    },
    current_balance:  c.capital,
  }))

  return (
    <div className="space-y-6 pb-8" style={{ background: 'radial-gradient(ellipse at top right, rgba(245,158,11,0.06) 0%, transparent 60%)' }}>

      {/* Header */}
      <div className="relative overflow-hidden page-enter">
        <div className="blob-amber absolute -top-20 -right-20 opacity-40" style={{ width: '300px', height: '300px' }} />
        <div className="relative flex items-end justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Renta Fija — CDTs</h1>
            <p className="page-subtitle">
              Certificados de depósito a término · Capital y rendimientos garantizados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="cdts" />
            <CDTUploader cdts={uploaderCDTs} />
          </div>
        </div>
      </div>

      {/* KPIs — 3 cards */}
      <div className="grid grid-cols-3 gap-4 page-enter page-enter-delay-1">
        {/* Capital total */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#f59e0b', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Landmark size={13} style={{ color: '#f59e0b' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Capital total
            </p>
          </div>
          <HiddenValue value={fmtCOP(totalCapital)} className="tabular-nums font-bold" style={{ color: '#e5e7eb', fontSize: '20px' }} />
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
            {cdts.length} CDT{cdts.length === 1 ? '' : 's'} activo{cdts.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Rendimiento esperado */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#10b981', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={13} style={{ color: '#10b981' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Rendimiento esperado
            </p>
          </div>
          <HiddenValue value={fmtCOP(totalEsperado)} className="tabular-nums font-bold" style={{ color: '#10b981', fontSize: '20px' }} />
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>Al vencimiento total</p>
        </div>

        {/* Próximo vencimiento */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: '#6366f1', transform: 'translate(30%,-30%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Clock size={13} style={{ color: '#6366f1' }} />
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Próximo vencimiento
            </p>
          </div>
          {proximo ? (
            <>
              <p className="tabular-nums font-bold" style={{ color: '#6366f1', fontSize: '20px' }}>
                {proximo.diasRestantes} {proximo.diasRestantes === 1 ? 'día' : 'días'}
              </p>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {proximo.institution} · {fmtDate(proximo.vencimiento)}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: '#4b5563', fontSize: '20px', fontWeight: 700 }}>—</p>
              <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>Sin CDTs activos</p>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {cdts.length === 0 && (
        <div className="card card-amber relative overflow-hidden page-enter page-enter-delay-2" style={{ padding: '56px 32px', textAlign: 'center' }}>
          <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: '#f59e0b', transform: 'translate(-50%, -40%)' }} />
          <div
            style={{
              width:        '80px',
              height:       '80px',
              borderRadius: '20px',
              background:   'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.20))',
              border:       '1px solid rgba(245,158,11,0.30)',
              display:      'inline-flex',
              alignItems:   'center',
              justifyContent: 'center',
              margin:       '0 auto 24px',
              fontSize:     '36px',
              position:     'relative',
            }}
          >
            🏦
          </div>
          <h2 className="text-white font-bold text-2xl mb-3 tracking-tight" style={{ position: 'relative' }}>
            Tu primer CDT espera
          </h2>
          <p className="text-muted" style={{ fontSize: '15px', maxWidth: '460px', margin: '0 auto 28px', position: 'relative' }}>
            Importa el PDF de tu banco o agrégalo manualmente — calculamos tasa, vencimiento y rendimiento.
          </p>
          <div style={{ position: 'relative' }}>
            <CDTUploader cdts={uploaderCDTs} />
          </div>
        </div>
      )}

      {/* CDT list */}
      {cdts.length > 0 && (
        <div className="space-y-4 page-enter page-enter-delay-2">
          {cdts.map((cdt) => {
            const accent = cdt.vencido ? '#ef4444' : cdt.urgente ? '#f59e0b' : '#10b981'
            return (
              <div
                key={`${cdt.source}:${cdt.id}`}
                className="card card-amber relative overflow-hidden"
                style={{ padding: '20px 24px', borderColor: cdt.vencido ? '#ef444440' : cdt.urgente ? '#f59e0b40' : undefined }}
              >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5 blur-3xl"
                  style={{ background: accent, transform: 'translate(20%,-20%)' }} />

                {/* Header row */}
                <div className="flex items-start justify-between mb-5" style={{ position: 'relative', flexWrap: 'wrap', gap: '12px' }}>
                  <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: accent + '20', color: accent }}
                    >
                      <Landmark size={18} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg" style={{ marginBottom: '2px' }}>{cdt.name}</h3>
                      <p className="text-muted" style={{ fontSize: '12px' }}>
                        {fmtDate(cdt.apertura)} → {fmtDate(cdt.vencimiento)}
                      </p>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: accent + '20', color: accent }}
                    >
                      {cdt.vencido
                        ? 'Vencido'
                        : cdt.urgente
                          ? `⚠️ Vence en ${cdt.diasRestantes} días`
                          : `${cdt.diasRestantes} días restantes`}
                    </span>
                  </div>
                  <div className="text-right">
                    <HiddenValue value={fmtCOP(cdt.capital)} className="tabular-nums font-bold text-white" style={{ fontSize: '20px' }} />
                    <p className="text-muted" style={{ fontSize: '12px' }}>Capital depositado</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4" style={{ position: 'relative' }}>
                  <div className="flex justify-between" style={{ marginBottom: '6px' }}>
                    <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso del plazo</p>
                    <p className="tabular-nums font-semibold" style={{ color: accent, fontSize: '12px' }}>{cdt.progreso}%</p>
                  </div>
                  <div className="progress-track" style={{ height: '8px' }}>
                    <div className="progress-fill" style={{ width: `${cdt.progreso}%`, backgroundColor: accent }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3" style={{ position: 'relative' }}>
                  {[
                    { label: 'Tasa EA',            value: `${cdt.tasaEa}%`,         isAmt: false },
                    { label: 'Tasa Nominal',       value: `${cdt.tasaNominal}%`,    isAmt: false },
                    { label: 'Rendimiento total',  value: fmtCOP(cdt.rendTotal),    isAmt: true  },
                    { label: 'Acumulado hoy',      value: fmtCOP(cdt.rendActual),   isAmt: true  },
                  ].map((item) => (
                    <div key={item.label} className="stat-cell p-3">
                      <p className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        {item.label}
                      </p>
                      {item.isAmt
                        ? <HiddenValue value={item.value} className="tabular-nums font-semibold" style={{ color: accent, fontSize: '14px' }} />
                        : <p className="tabular-nums font-semibold" style={{ color: accent, fontSize: '14px' }}>{item.value}</p>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
