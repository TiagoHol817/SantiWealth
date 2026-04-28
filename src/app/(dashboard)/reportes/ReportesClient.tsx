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
      <div className="flex items-center gap-1 p-1 rounded-xl"
        style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040' }}>
        {PERIODOS.map(p => (
          <button key={p.id}
            onClick={() => navPeriodo(p.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: periodo === p.id ? '#1a1f2e' : 'transparent',
              color:           periodo === p.id ? '#e5e7eb'  : '#6b7280',
              border:          periodo === p.id ? '1px solid #2a3040' : '1px solid transparent',
            }}>
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
          style={{
            backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
            borderRadius: '10px', color: '#e5e7eb', padding: '7px 12px',
            fontSize: '13px', outline: 'none', colorScheme: 'dark',
          }}
        />
      )}
    </div>
  )
}