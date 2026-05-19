'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil, Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { useAchievementToast } from '@/components/ui/WealthMessage'

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
  const router                      = useRouter()
  const { toast }                   = useToast()
  const { trigger, ToastContainer } = useAchievementToast()

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

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
        trigger('goal_created')
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

  if (!open) return isEdit ? (
    <button onClick={() => setOpen(true)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
      style={{ color: '#4b5563', border: '1px solid rgba(255,255,255,0.08)' }}>
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
      <div className="card card-purple fixed z-50 rounded-2xl p-6 w-full shadow-2xl overflow-y-auto"
        style={{
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
          <label className="form-label">Ícono</label>
          <div className="flex gap-2 flex-wrap">
            {ICONOS.map(i => (
              <button key={i} onClick={() => set('icon', i)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: form.icon === i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.icon === i ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Colores — keep as-is, user color picker */}
        <div className="mb-5">
          <label className="form-label">Color</label>
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
            <label className="form-label">Nombre de la meta</label>
            <input className="form-input" placeholder="Ej: Casa propia, Auto, Viaje..."
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Monto total (COP)</label>
            <input className="form-input" placeholder="0" type="number"
              value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Pagado hasta hoy (COP)</label>
            <input className="form-input" placeholder="0" type="number"
              value={form.current_amount} onChange={e => set('current_amount', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="form-label">Fecha límite (opcional)</label>
            <input className="form-input" style={{ colorScheme: 'dark' }} type="date"
              value={form.target_date} onChange={e => set('target_date', e.target.value)} />
          </div>
        </div>

        {/* Tracker de aportes */}
        <div className="stat-cell rounded-xl p-4 mb-3">
          <p className="text-white" style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
            📅 Plan de aportes
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="form-label">Monto por aporte (COP)</label>
              <input className="form-input" placeholder="0" type="number"
                value={form.contribution_amount}
                onChange={e => set('contribution_amount', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Frecuencia</label>
              <div className="flex gap-1.5">
                {FRECUENCIAS.map(f => (
                  <button key={f.value}
                    onClick={() => set('contribution_freq', f.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      backgroundColor: form.contribution_freq === f.value ? '#6366f125' : 'rgba(255,255,255,0.04)',
                      color:           form.contribution_freq === f.value ? '#6366f1'   : '#6b7280',
                      border:          `1px solid ${form.contribution_freq === f.value ? '#6366f150' : 'rgba(255,255,255,0.08)'}`,
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
              <div className="stat-cell rounded-lg px-3 py-2">
                <p className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Equivale a
                </p>
                <p className="tabular-nums font-semibold" style={{ color: '#6366f1', fontSize: '13px', marginTop: '2px' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(mensualEfec)}/mes
                </p>
              </div>
              <div className="stat-cell rounded-lg px-3 py-2">
                <p className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fecha estimada
                </p>
                <p className="font-semibold" style={{ color: '#10b981', fontSize: '13px', marginTop: '2px' }}>
                  {fechaEst ?? '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Destacar en Dashboard */}
        <button
          onClick={() => set('is_featured', !form.is_featured)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-4"
          style={{
            backgroundColor: form.is_featured ? '#6366f115' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${form.is_featured ? '#6366f150' : 'rgba(255,255,255,0.08)'}`,
          }}>
          <div className="flex items-center gap-3">
            <Pin size={15} style={{ color: form.is_featured ? '#6366f1' : '#6b7280' }} />
            <div className="text-left">
              <p style={{ color: form.is_featured ? '#e5e7eb' : '#9ca3af', fontSize: '13px', fontWeight: '500' }}>
                Mostrar como recordatorio en el Dashboard
              </p>
              <p className="text-muted" style={{ fontSize: '11px' }}>
                Aparece en tu página principal como compromiso destacado
              </p>
            </div>
          </div>
          <div className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
            style={{ backgroundColor: form.is_featured ? '#6366f1' : 'rgba(255,255,255,0.12)' }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: form.is_featured ? '22px' : '2px' }} />
          </div>
        </button>

        {form.is_featured && (
          <div className="px-3 py-2 rounded-xl mb-4 flex items-start gap-2"
            style={{ backgroundColor: '#6366f110', border: '1px solid #6366f125' }}>
            <span style={{ fontSize: '13px', flexShrink: 0 }}>💡</span>
            <p className="text-muted" style={{ fontSize: '11px', lineHeight: '1.5' }}>
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
            <button onClick={() => setOpen(false)} className="btn-secondary px-4 py-2 text-sm">
              Cancelar
            </button>
            <button onClick={guardar} disabled={saving || !form.name || !form.target_amount}
              className="btn-primary px-4 py-2 text-sm"
              style={{ opacity: (!form.name || !form.target_amount || saving) ? 0.5 : 1 }}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  )
}
