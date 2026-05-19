'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const PERIODOS = [
  { id: 'semana',    label: 'Semana',    icon: '7D'  },
  { id: 'quincenal', label: 'Quincenal', icon: '15D' },
  { id: 'mes',       label: 'Mes',       icon: '30D' },
  { id: 'año',       label: 'Año',       icon: '365' },
]

export default function ReportesClient({ cashflow }: { cashflow: any[] }) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const periodo  = params.get('periodo') ?? 'mes'
  const mes      = params.get('mes')     ?? new Date().toISOString().slice(0, 7)

  const navPeriodo = (id: string) => {
    const url = new URLSearchParams(params.toString())
    url.set('periodo', id)
    router.push(`${pathname}?${url.toString()}`)
  }

  const navMes = (val: string) => {
    const url = new URLSearchParams(params.toString())
    url.set('mes', val)
    url.set('periodo', 'mes')
    router.push(`${pathname}?${url.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Selector de período */}
      <div className="card flex items-center gap-1 p-1 rounded-xl">
        {PERIODOS.map(p => (
          <button key={p.id}
            onClick={() => navPeriodo(p.id)}
            className={`chart-tab${periodo === p.id ? ' chart-tab-active' : ''}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Selector de mes — solo visible en modo "mes" */}
      {periodo === 'mes' && (
        <input
          type="month"
          value={mes}
          onChange={e => navMes(e.target.value)}
          className="form-input"
          style={{ colorScheme: 'dark', padding: '7px 12px', fontSize: '13px' }}
        />
      )}
    </div>
  )
}
