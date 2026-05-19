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
  { value: 'income',       label: 'Ingresos',  color: '#10b981' },
  { value: 'expense',      label: 'Gastos',    color: '#ef4444' },
  { value: 'debt_payment', label: 'Deudas',    color: '#f59e0b' },
]

export default function FiltrosMes() {
  const router                       = useRouter()
  const params                       = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const mes          = params.get('mes')       ?? new Date().toISOString().slice(0, 7)
  const catFiltro    = params.get('categoria') ?? 'todas'
  const cuentaFiltro = params.get('cuenta')   ?? 'todas'
  const tipoFiltro   = params.get('tipo')      ?? 'todos'
  const busqueda     = params.get('q')         ?? ''

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

  return (
    <div className="space-y-3 mb-5">

      {/* Fila 1: búsqueda + mes */}
      <div className="flex gap-3 items-center">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '36px' }}
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
          className="form-input"
          style={{ flexShrink: 0, width: 'auto' }}
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
              backgroundColor: tipoFiltro === tipo.value ? tipo.color + '25' : 'rgba(255,255,255,0.05)',
              color:           tipoFiltro === tipo.value ? tipo.color : '#6b7280',
              border:          `1px solid ${tipoFiltro === tipo.value ? tipo.color + '60' : 'rgba(255,255,255,0.08)'}`,
            }}>
            {tipo.label}
          </button>
        ))}

        <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => nav({ categoria: cat })}
            className="px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              backgroundColor: catFiltro === cat ? '#6366f1' : 'rgba(255,255,255,0.05)',
              color:           catFiltro === cat ? '#fff' : '#6b7280',
              border:          `1px solid ${catFiltro === cat ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
            }}>
            {cat === 'todas' ? 'Todas' : cat}
          </button>
        ))}
      </div>

      {isPending && (
        <p className="text-muted" style={{ fontSize: '11px' }}>Filtrando...</p>
      )}
    </div>
  )
}
