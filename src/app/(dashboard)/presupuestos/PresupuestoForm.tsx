'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { Settings, X, Copy, Check } from 'lucide-react'

const CATEGORIAS = [
  'Alimentación', 'Transporte', 'Servicios/Suscripciones', 'Vivienda',
  'Salud', 'Entretenimiento', 'Ropa y personal', 'Otro'
]

const ICONOS: Record<string, string> = {
  'Alimentación': '🍽️', 'Transporte': '🚗', 'Servicios/Suscripciones': '📱',
  'Vivienda': '🏠', 'Salud': '❤️', 'Entretenimiento': '🎬',
  'Ropa y personal': '👕', 'Otro': '📦'
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function PresupuestoForm({ limites, budgetId, mes, year, limitesAnterior }: {
  limites: Record<string, number>
  budgetId?: string
  mes: number
  year: number
  limitesAnterior?: Record<string, number>
}) {
  const [abierto, setAbierto]     = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [form, setForm]           = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIAS.map(c => [c, limites[c] ? String(limites[c]) : '']))
  )
  const router    = useRouter()
  const { toast } = useToast()

  const totalPresupuesto = CATEGORIAS.reduce((s, c) => s + (Number(form[c]) || 0), 0)

  function copiarMesAnterior() {
    if (!limitesAnterior || Object.keys(limitesAnterior).length === 0) {
      toast.warning('Sin datos anteriores', 'No hay presupuesto del mes anterior para copiar.')
      return
    }
    setForm(Object.fromEntries(CATEGORIAS.map(c => [c, limitesAnterior[c] ? String(limitesAnterior[c]) : ''])))
    setCopied(true)
    toast.success('Presupuesto copiado', 'Se copiaron los límites del mes anterior.')
    setTimeout(() => setCopied(false), 2000)
  }

  async function guardar() {
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No autenticado')

      const nuevosLimites: Record<string, number> = {}
      CATEGORIAS.forEach(c => {
        const val = Number(form[c].toString().replace(/\./g, '').replace(/,/g, ''))
        if (val > 0) nuevosLimites[c] = val
      })

      if (budgetId) {
        const { error } = await supabase.from('budgets')
          .update({ notes: JSON.stringify(nuevosLimites) }).eq('id', budgetId)
        if (error) throw error
        toast.success('Presupuesto actualizado', `${Object.keys(nuevosLimites).length} categorías guardadas · ${fmtCOP(totalPresupuesto)}`)
      } else {
        const { error } = await supabase.from('budgets').insert({
          user_id:   session.user.id,
          name:      `Presupuesto ${mes}/${year}`,
          month:     mes,
          year:      year,
          currency:  'COP',
          is_active: true,
          notes:     JSON.stringify(nuevosLimites)
        })
        if (error) throw error
        toast.success('Presupuesto creado', `${Object.keys(nuevosLimites).length} categorías · ${fmtCOP(totalPresupuesto)}`)
      }

      setAbierto(false)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al guardar', e?.message ?? 'Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040',
    borderRadius: '10px', color: '#e5e7eb', padding: '9px 12px 9px 40px',
    fontSize: '14px', width: '100%', outline: 'none',
  }

  if (!abierto) return (
    <button
      onClick={() => setAbierto(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #6366f140', color: '#6366f1' }}>
      <Settings size={14} />
      {budgetId ? 'Editar presupuesto' : 'Configurar presupuesto'}
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000090' }} onClick={() => setAbierto(false)} />
      <div className="fixed z-50 rounded-2xl w-full shadow-2xl overflow-y-auto"
        style={{
          backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          maxWidth: '560px', maxHeight: '90vh', padding: '1.5rem',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold text-lg">
              {budgetId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
              Configura tus límites de gasto por categoría
            </p>
          </div>
          <button onClick={() => setAbierto(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            style={{ color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>

        {/* Total y botón copiar */}
        <div className="flex items-center justify-between mb-5 p-4 rounded-xl"
          style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040' }}>
          <div>
            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total presupuestado
            </p>
            <p className="tabular-nums font-bold" style={{ color: '#6366f1', fontSize: '20px', marginTop: '2px' }}>
              {fmtCOP(totalPresupuesto)}
            </p>
          </div>
          {limitesAnterior && Object.keys(limitesAnterior).length > 0 && (
            <button
              onClick={copiarMesAnterior}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: copied ? '#10b98120' : '#1a1f2e',
                color:           copied ? '#10b981'   : '#9ca3af',
                border:          `1px solid ${copied ? '#10b98140' : '#2a3040'}`,
              }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar mes anterior'}
            </button>
          )}
        </div>

        {/* Campos por categoría */}
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIAS.map(cat => {
            const val = Number(form[cat]) || 0
            return (
              <div key={cat}>
                <label style={{
                  color: '#6b7280', fontSize: '11px', marginBottom: '6px',
                  display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  {ICONOS[cat]} {cat}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: val > 0 ? '#6366f1' : '#4b5563',
                    fontSize: '13px', fontWeight: '500',
                  }}>
                    $
                  </span>
                  <input
                    style={inp}
                    type="number"
                    placeholder="0"
                    value={form[cat]}
                    onChange={e => setForm(f => ({ ...f, [cat]: e.target.value }))}
                  />
                </div>
                {val > 0 && (
                  <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '3px' }}>
                    {fmtCOP(val)}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setAbierto(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#6b7280' }}>
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || totalPresupuesto === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: '#6366f1', color: '#fff',
              opacity: (guardando || totalPresupuesto === 0) ? 0.5 : 1,
            }}>
            {guardando ? 'Guardando...' : budgetId ? 'Guardar cambios' : 'Crear presupuesto'}
          </button>
        </div>
      </div>
    </>
  )
}