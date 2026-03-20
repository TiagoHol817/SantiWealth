import { createClient } from '@/lib/supabase/server'
import CDTUploader from './CDTUploader'
import HiddenValue from '@/components/HiddenValue'

export default async function CDTsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('accounts').select('*').eq('type', 'other').ilike('name', '%CDT%')

  const today = new Date()
  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  const cdts = accounts?.map(a => {
    const meta = typeof a.notes === 'string' ? JSON.parse(a.notes) : (a.notes ?? {})
    const vencimiento = new Date(meta.vencimiento)
    const apertura = new Date(meta.apertura)
    const diasRestantes = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const diasTotales = Math.ceil((vencimiento.getTime() - apertura.getTime()) / (1000 * 60 * 60 * 24))
    const progreso = Math.min(100, Math.round(((diasTotales - diasRestantes) / diasTotales) * 100))
    const capital = Number(a.current_balance) || 0
    const rendimientoTotal = capital * (meta.tasa_ea / 100) * (diasTotales / 365)
    const rendimientoActual = capital * (meta.tasa_ea / 100) * ((diasTotales - diasRestantes) / 365)
    const vencido = diasRestantes <= 0
    const urgente = diasRestantes > 0 && diasRestantes <= 15
    return { ...a, meta, diasRestantes, diasTotales, progreso, capital, rendimientoTotal, rendimientoActual, vencido, urgente }
  }) ?? []

  const totalCapital     = cdts.reduce((s, c) => s + c.capital, 0)
  const totalRendimiento = cdts.reduce((s, c) => s + c.rendimientoTotal, 0)
  const totalActual      = cdts.reduce((s, c) => s + c.rendimientoActual, 0)

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CDTs</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Certificados de Depósito a Término — Bancolombia
          </p>
        </div>
        <CDTUploader cdts={cdts.map(c => ({ id: c.id, name: c.name, notes: c.meta, current_balance: c.capital }))} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Capital total',           value: totalCapital,     color: '#e5e7eb' },
          { label: 'Rendimiento proyectado',  value: totalRendimiento, color: '#00d4aa' },
          { label: 'Rendimiento acumulado',   value: totalActual,      color: '#6366f1' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-6 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {item.label}
            </p>
            <HiddenValue value={fmtCOP(item.value)} className="tabular-nums font-bold"
              style={{ color: item.color, fontSize: '24px' }} />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {cdts.map(cdt => {
          const accentColor = cdt.vencido ? '#ef4444' : cdt.urgente ? '#f59e0b' : '#00d4aa'
          const detalles = [
            { label: 'Tasa EA',          value: `${cdt.meta.tasa_ea}%`,          isAmount: false },
            { label: 'Tasa Nominal',     value: `${cdt.meta.tasa_nominal}%`,     isAmount: false },
            { label: 'Rendimiento total',value: fmtCOP(cdt.rendimientoTotal),    isAmount: true  },
            { label: 'Acumulado hoy',    value: fmtCOP(cdt.rendimientoActual),   isAmount: true  },
          ]
          return (
            <div key={cdt.id} className="rounded-2xl p-6 relative overflow-hidden"
              style={{ backgroundColor: '#1a1f2e', border: `1px solid ${cdt.vencido ? '#ef444440' : cdt.urgente ? '#f59e0b40' : '#2a3040'}` }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5 blur-3xl"
                style={{ background: accentColor, transform: 'translate(20%,-20%)' }} />
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: accentColor + '20', color: accentColor }}>CDT</div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">{cdt.name}</h2>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>
                      {fmtDate(cdt.meta.apertura)} → {fmtDate(cdt.meta.vencimiento)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: accentColor + '20', color: accentColor }}>
                    {cdt.vencido ? 'Vencido' : cdt.urgente ? `⚠️ Vence en ${cdt.diasRestantes} días` : `${cdt.diasRestantes} días restantes`}
                  </span>
                </div>
                <div className="text-right">
                  <HiddenValue value={fmtCOP(cdt.capital)} className="tabular-nums font-bold text-white" style={{ fontSize: '22px' }} />
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>Capital</p>
                </div>
              </div>
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>Progreso del plazo</p>
                  <p className="tabular-nums font-semibold" style={{ color: accentColor, fontSize: '12px' }}>{cdt.progreso}%</p>
                </div>
                <div className="rounded-full overflow-hidden" style={{ backgroundColor: '#0f1117', height: '8px' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cdt.progreso}%`, backgroundColor: accentColor }} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {detalles.map(item => (
                  <div key={item.label} className="rounded-xl p-4"
                    style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                    <p style={{ color: '#4b5563', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {item.label}
                    </p>
                    {item.isAmount
                      ? <HiddenValue value={item.value} className="tabular-nums font-semibold" style={{ color: accentColor, fontSize: '15px' }} />
                      : <p className="tabular-nums font-semibold" style={{ color: accentColor, fontSize: '15px' }}>{item.value}</p>
                    }
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}