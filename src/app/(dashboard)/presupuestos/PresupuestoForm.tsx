'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CATEGORIAS = ['Alimentación', 'Transporte', 'Servicios/Suscripciones', 'Vivienda', 'Salud', 'Entretenimiento', 'Ropa y personal', 'Otro']

export default function PresupuestoForm({ limites, budgetId, mes, year }: {
  limites: Record<string, number>
  budgetId?: string
  mes: number
  year: number
}) {
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIAS.map(c => [c, limites[c] ? String(limites[c]) : '']))
  )
  const router = useRouter()

  async function guardar() {
    setGuardando(true)
    setError('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError('No autenticado'); setGuardando(false); return }

    const nuevosLimites: Record<string, number> = {}
    CATEGORIAS.forEach(c => { if (form[c]) nuevosLimites[c] = Number(form[c].replace(/\./g, '')) })

    if (budgetId) {
      await supabase.from('budgets').update({ notes: JSON.stringify(nuevosLimites) }).eq('id', budgetId)
    } else {
      await supabase.from('budgets').insert({
        user_id: session.user.id,
        name: `Presupuesto ${mes}/${year}`,
        month: mes,
        year: year,
        currency: 'COP',
        is_active: true,
        notes: JSON.stringify(nuevosLimites)
      })
    }

    setGuardando(false)
    setAbierto(false)
    router.refresh()
  }

  const inputStyle = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040',
    borderRadius: '8px', color: '#e5e7eb', padding: '8px 12px',
    fontSize: '14px', width: '100%', outline: 'none'
  }
  const labelStyle = { color: '#6b7280', fontSize: '12px', marginBottom: '4px', display: 'block' as const }

  if (!abierto) return (
    <button onClick={() => setAbierto(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium mb-6"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#00d4aa' }}>
      ⚙️ {budgetId ? 'Editar presupuesto' : 'Configurar presupuesto'}
    </button>
  )

  return (
    <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: '#1a1f2e', border: '1px solid #6366f1' }}>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white font-medium">Límites por categoría (COP)</p>
        <button onClick={() => setAbierto(false)} style={{ color: '#6b7280', fontSize: '20px' }}>×</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CATEGORIAS.map(cat => (
          <div key={cat}>
            <label style={labelStyle}>{cat}</label>
            <input style={inputStyle} type="number" placeholder="0"
              value={form[cat]} onChange={e => setForm(f => ({ ...f, [cat]: e.target.value }))} />
          </div>
        ))}
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>⚠️ {error}</p>}

      <button onClick={guardar} disabled={guardando}
        className="w-full py-2 rounded-lg text-sm font-medium mt-4"
        style={{ backgroundColor: '#6366f1', color: '#fff' }}>
        {guardando ? 'Guardando...' : 'Guardar presupuesto'}
      </button>
    </div>
  )
}