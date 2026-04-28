'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil, Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

const ICONOS  = ['🎯','🏠','🚗','✈️','💰','📈','🎓','💍','🏖️','💻','🏗️','📦']
const COLORES = ['#D4AF37','#6366f1','#f59e0b','#ef4444','#3b82f6','#ec4899']

const FRECUENCIAS = [
  { value: 'semanal',    label: 'Semanal',    factor: 4.33 },
  { value: 'quincenal',  label: 'Quincenal',  factor: 2    },
  { value: 'mensual',    label: 'Mensual',    factor: 1    },
]

type Goal = {
  id: string; name: string; target_amount: number; current_amount: number
  target_date?: string; icon: string; color: string; is_featured?: boolean
  contribution_amount?: number; contribution_freq?: string
}

export default function GoalForm({ editGoal }: { editGoal?: Goal }) {
  const isEdit = !!editGoal
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    name:                  editGoal?.name                  ?? '',
    target_amount:         String(editGoal?.target_amount  ?? ''),
    current_amount:        String(editGoal?.current_amount ?? ''),
    target_date:           editGoal?.target_date           ?? '',
    icon:                  editGoal?.icon                  ?? '🎯',
    color:                 editGoal?.color                 ?? '#D4AF37',
    is_featured:           editGoal?.is_featured           ?? false,
    contribution_amount:   String(editGoal?.contribution_amount ?? ''),
    contribution_freq:     editGoal?.contribution_freq     ?? 'mensual',
  })
  const router    = useRouter()
  const { toast } = useToast()

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  // Cálculo en tiempo real de proyección
  const contribAmt  = Number(form.contribution_amount) || 0
  const freq        = FRECUENCIAS.find(f => f.value === form.contribution_freq)!
  const mensualEfec = contribAmt * freq.factor
  const falta       = Math.max(0, Number(form.target_amount) - Number(form.current_amount))
  const mesesEst    = mensualEfec > 0 && falta > 0 ? Math.ceil(falta / mensualEfec) : null
  const fechaEst    = mesesEst
    ? (() => {
        const d = new Date()
        d.setMonth(d.getMonth() + mesesEst)
        return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
      })()
    : null

  async function guardar() {
    setSaving(true)
    try {
      const supabase = createClient()

      if (form.is_featured && !editGoal?.is_featured) {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('investment_goals')
          .update({ is_featured: false })
          .eq('user_id', user!.id)
          .eq('is_featured', true)
      }

      const payload = {
        name:                 form.name,
        target_amount:        Number(form.target_amount),
        current_amount:       Number(form.current_amount) || 0,
        target_date:          form.target_date || null,
        icon:                 form.icon,
        color:                form.color,
        is_featured:          form.is_featured,
        contribution_amount:  Number(form.contribution_amount) || 0,
        contribution_freq:    form.contribution_freq,
      }

      if (isEdit) {
        const { error } = await supabase.from('investment_goals').update(payload).eq('id', editGoal!.id)
        if (error) throw error
        toast.success('Meta actualizada', `${form.name} se guardó correctamente.`)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('investment_goals').insert({ ...payload, user_id: user!.id })
        if (error) throw error
        toast.success('Meta creada', `${form.name} fue creada exitosamente.`)
      }

      setOpen(false)
      if (!isEdit) setForm({
        name:'', target_amount:'', current_amount:'', target_date:'',
        icon:'🎯', color:'#D4AF37', is_featured: false,
        contribution_amount:'', contribution_freq:'mensual',
      })
      router.refresh()
    } catch (e: any) {
      toast.error(
        isEdit ? 'Error al actualizar meta' : 'Error al crear meta',
        e?.message ?? 'Ocurrió un error inesperado.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta meta?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('investment_goals').delete().eq('id', editGoal!.id)
      if (error) throw error
      toast.success('Meta eliminada', `${editGoal!.name} fue eliminada.`)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al eliminar meta', e?.message ?? 'No se pudo eliminar.')
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none',
  }
  const lbl = {
    color: '#6b7280', fontSize: '11px', marginBottom: '4px',
    display: 'block' as const, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
  }

  if (!open) return isEdit ? (
    <button onClick={() => setOpen(true)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
      style={{ color: '#4b5563', border: '1px solid #2a3040' }}>
      <Pencil size={13} />
    </button>
  ) : (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
      style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117', boxShadow: '0 2px 10px #D4AF3730' }}>
      <Plus size={15} /> Nueva meta
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />
      <div className="fixed z-50 rounded-2xl p-6 w-full shadow-2xl overflow-y-auto"
        style={{
          backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          maxWidth: '480px', maxHeight: '92vh',
        }}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">
            {isEdit ? 'Editar meta' : 'Nueva meta financiera'}
          </h3>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            style={{ color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>

        {/* Íconos */}
        <div className="mb-4">
          <label style={lbl}>Ícono</label>
          <div className="flex gap-2 flex-wrap">
            {ICONOS.map(i => (
              <button key={i} onClick={() => set('icon', i)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: form.icon === i ? '#2a3040' : '#0f1117',
                  border: `1px solid ${form.icon === i ? '#D4AF37' : '#2a3040'}`,
                }}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Colores */}
        <div className="mb-5">
          <label style={lbl}>Color</label>
          <div className="flex gap-2">
            {COLORES.map(c => (
              <button key={c} onClick={() => set('color', c)}
                className="w-8 h-8 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  outline: form.color === c ? '2px solid white' : 'none',
                  outlineOffset: '2px',
                }} />
            ))}
          </div>
        </div>

        {/* Campos básicos */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <label style={lbl}>Nombre de la meta</label>
            <input style={inp} placeholder="Ej: Casa propia, Auto, Viaje..."
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Monto total (COP)</label>
            <input style={inp} placeholder="0" type="number"
              value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Pagado hasta hoy (COP)</label>
            <input style={inp} placeholder="0" type="number"
              value={form.current_amount} onChange={e => set('current_amount', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label style={lbl}>Fecha límite (opcional)</label>
            <input style={{ ...inp, colorScheme: 'dark' }} type="date"
              value={form.target_date} onChange={e => set('target_date', e.target.value)} />
          </div>
        </div>

        {/* ── Tracker de aportes ────────────────────────────── */}
        <div className="rounded-xl p-4 mb-3"
          style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
          <p style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
            📅 Plan de aportes
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label style={lbl}>Monto por aporte (COP)</label>
              <input style={inp} placeholder="0" type="number"
                value={form.contribution_amount}
                onChange={e => set('contribution_amount', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Frecuencia</label>
              <div className="flex gap-1.5">
                {FRECUENCIAS.map(f => (
                  <button key={f.value}
                    onClick={() => set('contribution_freq', f.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: form.contribution_freq === f.value ? '#6366f125' : '#1a1f2e',
                      color:           form.contribution_freq === f.value ? '#6366f1'   : '#6b7280',
                      border:          `1px solid ${form.contribution_freq === f.value ? '#6366f150' : '#2a3040'}`,
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Proyección en tiempo real */}
          {contribAmt > 0 && falta > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#1a1f2e' }}>
                <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Equivale a
                </p>
                <p className="tabular-nums font-semibold" style={{ color: '#6366f1', fontSize: '13px', marginTop: '2px' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(mensualEfec)}/mes
                </p>
              </div>
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#1a1f2e' }}>
                <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fecha estimada
                </p>
                <p className="font-semibold" style={{ color: '#10b981', fontSize: '13px', marginTop: '2px' }}>
                  {fechaEst ?? '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Toggle Destacar en Dashboard ─────────────────── */}
        <button
          onClick={() => set('is_featured', !form.is_featured)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-4"
          style={{
            backgroundColor: form.is_featured ? '#6366f115' : '#0f1117',
            border: `1px solid ${form.is_featured ? '#6366f150' : '#2a3040'}`,
          }}>
          <div className="flex items-center gap-3">
            <Pin size={15} style={{ color: form.is_featured ? '#6366f1' : '#6b7280' }} />
            <div className="text-left">
              <p style={{ color: form.is_featured ? '#e5e7eb' : '#9ca3af', fontSize: '13px', fontWeight: '500' }}>
                Mostrar como recordatorio en el Dashboard
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px' }}>
                Aparece en tu página principal como compromiso destacado
              </p>
            </div>
          </div>
          <div className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
            style={{ backgroundColor: form.is_featured ? '#6366f1' : '#2a3040' }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: form.is_featured ? '22px' : '2px' }} />
          </div>
        </button>

        {form.is_featured && (
          <div className="px-3 py-2 rounded-xl mb-4 flex items-start gap-2"
            style={{ backgroundColor: '#6366f110', border: '1px solid #6366f125' }}>
            <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
            <p style={{ color: '#9ca3af', fontSize: '11px', lineHeight: '1.5' }}>
              Solo un compromiso puede mostrarse en el Dashboard. Al activar este, el anterior dejará de aparecer.
            </p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-between">
          {isEdit ? (
            <button onClick={eliminar}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-900/30"
              style={{ color: '#ef4444', border: '1px solid #ef444430' }}>
              Eliminar
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ backgroundColor: '#0f1117', color: '#6b7280' }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.name || !form.target_amount}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117',
                opacity: (!form.name || !form.target_amount || saving) ? 0.5 : 1,
              }}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}