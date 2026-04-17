'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, X } from 'lucide-react'

const CATEGORIAS = [
  'todas', 'Alimentación', 'Transporte', 'Vivienda', 'Servicios/Suscripciones',
  'Salud', 'Entretenimiento', 'Ropa y personal', 'Educación',
  'Salario', 'Inversiones', 'Arriendo',
  'Crédito hipotecario', 'Tarjeta crédito', 'Préstamo', 'Otro'
]

const TIPOS = [
  { value: 'todos',        label: 'Todos',     color: '#6b7280' },
  { value: 'income',       label: 'Ingresos',  color: '#00d4aa' },
  { value: 'expense',      label: 'Gastos',    color: '#ef4444' },
  { value: 'debt_payment', label: 'Deudas',    color: '#f59e0b' },
]

export default function FiltrosMes() {
  const router                    = useRouter()
  const params                    = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const mes         = params.get('mes')       ?? new Date().toISOString().slice(0, 7)
  const catFiltro   = params.get('categoria') ?? 'todas'
  const cuentaFiltro = params.get('cuenta')   ?? 'todas'
  const tipoFiltro  = params.get('tipo')      ?? 'todos'
  const busqueda    = params.get('q')         ?? ''

  const [localSearch, setLocalSearch] = useState(busqueda)

  const nav = (newParams: Record<string, string>) => {
    const url = new URLSearchParams({
      mes, cuenta: cuentaFiltro, categoria: catFiltro,
      tipo: tipoFiltro, q: busqueda, ...newParams
    })
    startTransition(() => router.push(`?${url.toString()}`))
  }

  const handleSearch = (val: string) => {
    setLocalSearch(val)
    const url = new URLSearchParams({
      mes, cuenta: cuentaFiltro, categoria: catFiltro,
      tipo: tipoFiltro, q: val
    })
    startTransition(() => router.push(`?${url.toString()}`))
  }

  const clearAll = () => {
    setLocalSearch('')
    const url = new URLSearchParams({
      mes, cuenta: 'todas', categoria: 'todas', tipo: 'todos', q: ''
    })
    startTransition(() => router.push(`?${url.toString()}`))
  }

  const hasActiveFilters = catFiltro !== 'todas' || tipoFiltro !== 'todos' || busqueda !== ''

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040',
    borderRadius: '10px', color: '#e5e7eb', padding: '7px 12px 7px 36px',
    fontSize: '13px', outline: 'none', width: '100%',
  }

  return (
    <div className="space-y-3 mb-5">

      {/* Fila 1: búsqueda + mes */}
      <div className="flex gap-3 items-center">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            style={inp}
            placeholder="Buscar por descripción, categoría o monto..."
            value={localSearch}
            onChange={e => handleSearch(e.target.value)}
          />
          {localSearch && (
            <button
              onClick={() => handleSearch('')}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
              <X size={13} />
            </button>
          )}
        </div>

        <input
          type="month"
          value={mes}
          onChange={e => nav({ mes: e.target.value })}
          style={{
            backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
            borderRadius: '10px', color: '#e5e7eb', padding: '7px 12px',
            fontSize: '13px', outline: 'none', flexShrink: 0,
          }}
        />

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444430', flexShrink: 0 }}>
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      {/* Fila 2: filtros de tipo */}
      <div className="flex gap-2 flex-wrap">
        {TIPOS.map(tipo => (
          <button
            key={tipo.value}
            onClick={() => nav({ tipo: tipo.value })}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              backgroundColor: tipoFiltro === tipo.value ? tipo.color + '25' : '#1a1f2e',
              color:           tipoFiltro === tipo.value ? tipo.color : '#6b7280',
              border:          `1px solid ${tipoFiltro === tipo.value ? tipo.color + '60' : '#2a3040'}`,
            }}>
            {tipo.label}
          </button>
        ))}

        <div style={{ width: '1px', backgroundColor: '#2a3040', margin: '0 4px' }} />

        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => nav({ categoria: cat })}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              backgroundColor: catFiltro === cat ? '#6366f1' : '#1a1f2e',
              color:           catFiltro === cat ? '#fff' : '#6b7280',
              border:          '1px solid #2a3040',
            }}>
            {cat === 'todas' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      {isPending && (
        <p style={{ color: '#6b7280', fontSize: '11px' }}>Filtrando...</p>
      )}
    </div>
  )
}