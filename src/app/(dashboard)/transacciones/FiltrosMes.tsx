'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIAS = ['todas', 'Alimentación', 'Transporte', 'Servicios/Suscripciones', 'Ingreso', 'Otro']

export default function FiltrosMes() {
  const router = useRouter()
  const params = useSearchParams()
  const mes = params.get('mes') ?? new Date().toISOString().slice(0, 7)
  const catFiltro = params.get('categoria') ?? 'todas'
  const cuentaFiltro = params.get('cuenta') ?? 'todas'

  const nav = (newParams: Record<string, string>) => {
    const url = new URLSearchParams({ mes, cuenta: cuentaFiltro, categoria: catFiltro, ...newParams })
    router.push(`?${url.toString()}`)
  }

  return (
    <div className="flex gap-3 mb-4 flex-wrap items-center">
      <input type="month" value={mes}
        onChange={e => nav({ mes: e.target.value })}
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', borderRadius: '8px', color: '#e5e7eb', padding: '6px 12px', fontSize: '13px' }} />
      {CATEGORIAS.map(cat => (
        <button key={cat} onClick={() => nav({ categoria: cat })}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{
            backgroundColor: catFiltro === cat ? '#6366f1' : '#1a1f2e',
            color: catFiltro === cat ? '#fff' : '#6b7280',
            border: '1px solid #2a3040'
          }}>{cat === 'todas' ? 'Todas' : cat}</button>
      ))}
    </div>
  )
}