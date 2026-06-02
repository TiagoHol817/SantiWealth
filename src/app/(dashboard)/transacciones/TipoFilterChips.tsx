'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const OPTS: { id: 'todos' | 'income' | 'expense'; label: string }[] = [
  { id: 'todos',   label: 'Todos'    },
  { id: 'income',  label: 'Ingresos' },
  { id: 'expense', label: 'Gastos'   },
]

/**
 * Client-side filter chips for transaction type. URL-driven — uses `?tipo=`
 * search param. The active chip is read from the current URL, not local
 * state, so it stays in sync if the user lands directly via a deep link
 * (e.g. from the Patrimonio dashboard KPI cards).
 */
export default function TipoFilterChips() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const current      = searchParams.get('tipo') ?? 'todos'

  function setTipo(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'todos') params.delete('tipo')
    else                params.set('tipo', id)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {OPTS.map((o) => {
        const active = current === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setTipo(o.id)}
            style={{
              padding:      '7px 14px',
              borderRadius: '999px',
              fontSize:     '12px',
              fontWeight:   600,
              background:   active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.04)',
              border:       `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`,
              color:        active ? '#a78bfa' : '#9ca3af',
              cursor:       'pointer',
              transition:   'all 150ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
