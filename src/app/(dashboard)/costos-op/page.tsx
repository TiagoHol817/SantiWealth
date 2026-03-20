import { createClient } from '@/lib/supabase/server'
import CostosForm from './CostosForm'
import HiddenValue from '@/components/HiddenValue'

const COLORES: Record<string,string> = {
  'Arriendo':'#6366f1','Servicios públicos':'#f59e0b','Internet/Celular':'#00d4aa',
  'Suscripciones':'#ec4899','Alimentación':'#ef4444','Transporte':'#3b82f6','Otro':'#6b7280',
}
const ICONOS: Record<string,string> = {
  'Arriendo':'🏠','Servicios públicos':'💡','Internet/Celular':'📱',
  'Suscripciones':'🔄','Alimentación':'🍽️','Transporte':'🚗','Otro':'📦',
}

export default async function CostosOpPage() {
  const supabase = await createClient()
  const { data: costs } = await supabase.from('operational_costs').select('*').order('category')
  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  const activos = costs?.filter(c => c.active) ?? []
  const totalMensual = activos.reduce((s, c) => s + Number(c.amount), 0)
  const porCategoria: Record<string,number> = {}
  activos.forEach(c => { porCategoria[c.category] = (porCategoria[c.category] ?? 0) + Number(c.amount) })
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a,b) => b[1]-a[1])

  return (
    <div className="space-y-6 pb-8" style={{ color: '#e5e7eb' }}>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Costos Operacionales</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>Gastos fijos recurrentes</p>
        </div>
        <CostosForm costs={activos} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total mensual',  value: totalMensual,       color: '#ef4444' },
          { label: 'Total anual',    value: totalMensual * 12,  color: '#f59e0b' },
          { label: 'Costos activos', value: activos.length,     color: '#00d4aa', isCount: true },
        ].map(item => (
          <div key={item.label} className="rounded-2xl p-6 relative overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
              style={{ background: item.color, transform: 'translate(30%,-30%)' }} />
            <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              {item.label}
            </p>
            {(item as any).isCount
              ? <p className="tabular-nums font-bold text-white" style={{ fontSize: '24px' }}>{item.value}</p>
              : <HiddenValue value={fmtCOP(item.value as number)} className="tabular-nums font-bold" style={{ color: item.color, fontSize: '24px' }} />
            }
          </div>
        ))}
      </div>

      {categoriasOrdenadas.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
          <p className="text-white font-semibold mb-4">Distribución por categoría</p>
          <div className="flex rounded-full overflow-hidden mb-5" style={{ height: '12px' }}>
            {categoriasOrdenadas.map(([cat, total]) => (
              <div key={cat} style={{ width: `${(total/totalMensual)*100}%`, backgroundColor: COLORES[cat] ?? '#6b7280' }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {categoriasOrdenadas.map(([cat, total]) => {
              const color = COLORES[cat] ?? '#6b7280'
              const pct = ((total/totalMensual)*100).toFixed(1)
              return (
                <div key={cat} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ backgroundColor: '#0f1117' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: color + '20' }}>
                      <span style={{ fontSize: '16px' }}>{ICONOS[cat] ?? '📦'}</span>
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>{cat}</span>
                  </div>
                  <div className="text-right">
                    <HiddenValue value={fmtCOP(total)} className="tabular-nums font-semibold text-white text-sm" />
                    <p style={{ color, fontSize: '11px' }}>{pct}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2a3040' }}>
          <p className="text-white font-semibold">Lista de costos</p>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>{costs?.length ?? 0} registros</span>
        </div>
        {!costs?.length ? (
          <div className="px-6 py-16 text-center">
            <p className="text-4xl mb-4">💸</p>
            <p className="text-white font-medium mb-2">Sin costos registrados</p>
          </div>
        ) : costs.map((cost, i) => {
          const color = COLORES[cost.category] ?? '#6b7280'
          return (
            <div key={cost.id}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02] group"
              style={{ borderBottom: i < costs.length-1 ? '1px solid #1e2535' : 'none', opacity: cost.active ? 1 : 0.4 }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color + '15' }}>
                  {ICONOS[cost.category] ?? '📦'}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{cost.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '15', color }}>{cost.category}</span>
                    {!cost.active && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1e2535', color: '#6b7280' }}>Inactivo</span>}
                  </div>
                </div>
              </div>
              <HiddenValue value={fmtCOP(Number(cost.amount))} className="tabular-nums font-semibold" style={{ color: '#ef4444', fontSize: '15px' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}