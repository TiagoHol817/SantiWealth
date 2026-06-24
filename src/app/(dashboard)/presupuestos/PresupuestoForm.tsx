'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { useAchievementToast } from '@/components/ui/WealthMessage'
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
  const router                      = useRouter()
  const { toast }                   = useToast()
  const { trigger, ToastContainer } = useAchievementToast()

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
        trigger('budget_created')
      }

      setAbierto(false)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al guardar', e?.message ?? 'Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) return (
    <button
      onClick={() => setAbierto(true)}
      className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
      style={{ color: '#6366f1', borderColor: '#6366f140' }}>
      <Settings size={14} />
      {budgetId ? 'Editar presupuesto' : 'Configurar presupuesto'}
    </button>
  )

  // Portal the modal into <body>. position:fixed alone is not enough — the
  // /presupuestos page wrapper uses `.page-enter`, which animates `transform`
  // with `animation-fill-mode: both`, so a non-`none` transform persists on the
  // ancestor. Per the CSS spec that ancestor becomes the containing block for
  // descendant `position: fixed`, trapping the modal off-screen. Rendering
  // through document.body (plus flex centering + max-height/overflow) sidesteps
  // it entirely. Same pattern as EditarTransaccion / GoalForm.
  return (
    <>
      {typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: '#00000090' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) setAbierto(false) }}
      >
        <div
          className="card card-purple rounded-2xl w-full shadow-2xl overflow-y-auto breathe-purple"
          style={{ maxWidth: '560px', maxHeight: '92vh', padding: '1.5rem' }}
          onMouseDown={(e) => e.stopPropagation()}
        >

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold text-lg">
              {budgetId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
            </h3>
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
              Un presupuesto no te limita. Te da libertad.
            </p>
          </div>
          <button onClick={() => setAbierto(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            style={{ color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>

        {/* Total y botón copiar */}
        <div className="stat-cell flex items-center justify-between mb-5 p-4 rounded-xl">
          <div>
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                backgroundColor: copied ? '#10b98120' : 'rgba(255,255,255,0.06)',
                color:           copied ? '#10b981'   : '#9ca3af',
                border:          `1px solid ${copied ? '#10b98140' : 'rgba(255,255,255,0.10)'}`,
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
                <label className="form-label">{ICONOS[cat]} {cat}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: val > 0 ? '#6366f1' : '#4b5563',
                    fontSize: '13px', fontWeight: '500',
                  }}>
                    $
                  </span>
                  <input
                    className="form-input"
                    style={{ paddingLeft: '28px' }}
                    type="number"
                    placeholder="0"
                    value={form[cat]}
                    onChange={e => setForm(f => ({ ...f, [cat]: e.target.value }))}
                  />
                </div>
                {val > 0 && (
                  <p className="text-muted" style={{ fontSize: '10px', marginTop: '3px' }}>
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
            className="btn-secondary flex-1 py-2.5 text-sm">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || totalPresupuesto === 0}
            className="btn-primary flex-1 py-2.5 text-sm"
            style={{ opacity: (guardando || totalPresupuesto === 0) ? 0.5 : 1 }}>
            {guardando ? 'Guardando...' : budgetId ? 'Guardar cambios' : 'Crear presupuesto'}
          </button>
        </div>
        </div>
      </div>,
      document.body
      )}
      <ToastContainer />
    </>
  )
}
