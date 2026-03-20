'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ICONOS = ['🎯','🏠','🚗','✈️','💰','📈','🎓','💍','🏖️','💻']
const COLORES = ['#00d4aa','#6366f1','#f59e0b','#ef4444','#3b82f6','#ec4899']

type Goal = {
  id: string; name: string; target_amount: number; current_amount: number
  deadline?: string; icon: string; color: string
}

export default function GoalForm({ editGoal }: { editGoal?: Goal }) {
  const isEdit = !!editGoal
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name:           editGoal?.name           ?? '',
    target_amount:  String(editGoal?.target_amount  ?? ''),
    current_amount: String(editGoal?.current_amount ?? ''),
    deadline:       editGoal?.deadline       ?? '',
    icon:           editGoal?.icon           ?? '🎯',
    color:          editGoal?.color          ?? '#00d4aa',
  })
  const router = useRouter()
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const payload = {
        name:           form.name,
        target_amount:  Number(form.target_amount),
        current_amount: Number(form.current_amount) || 0,
        deadline:       form.deadline || null,
        icon:           form.icon,
        color:          form.color,
      }
      if (isEdit) {
        await supabase.from('goals').update(payload).eq('id', editGoal!.id)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('goals').insert({ ...payload, user_id: user!.id })
      }
      setOpen(false)
      if (!isEdit) setForm({ name:'', target_amount:'', current_amount:'', deadline:'', icon:'🎯', color:'#00d4aa' })
      router.refresh()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta meta?')) return
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', editGoal!.id)
    router.refresh()
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '8px 12px', fontSize: '14px', width: '100%', outline: 'none'
  }
  const lbl = { color: '#6b7280', fontSize: '11px', marginBottom: '4px', display: 'block' as const, letterSpacing: '0.05em', textTransform: 'uppercase' as const }

  if (!open) return isEdit ? (
    <button onClick={() => setOpen(true)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
      style={{ color: '#4b5563', border: '1px solid #2a3040' }}>
      <Pencil size={13} />
    </button>
  ) : (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#00d4aa' }}>
      <Plus size={15} /> Nueva meta
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />
      <div className="fixed z-50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">{isEdit ? 'Editar meta' : 'Nueva meta financiera'}</h3>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            style={{ color: '#6b7280' }}><X size={16} /></button>
        </div>

        {/* Iconos */}
        <div className="mb-4">
          <label style={lbl}>Ícono</label>
          <div className="flex gap-2 flex-wrap">
            {ICONOS.map(i => (
              <button key={i} onClick={() => set('icon', i)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: form.icon === i ? '#2a3040' : '#0f1117', border: `1px solid ${form.icon === i ? '#00d4aa' : '#2a3040'}` }}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Colores */}
        <div className="mb-4">
          <label style={lbl}>Color</label>
          <div className="flex gap-2">
            {COLORES.map(c => (
              <button key={c} onClick={() => set('color', c)}
                className="w-8 h-8 rounded-full transition-all"
                style={{ backgroundColor: c, outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label style={lbl}>Nombre</label>
            <input style={inp} placeholder="Ej: Apartamento Flandes"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Meta (COP)</label>
            <input style={inp} placeholder="280000000" type="number"
              value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Ahorrado (COP)</label>
            <input style={inp} placeholder="0" type="number"
              value={form.current_amount} onChange={e => set('current_amount', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label style={lbl}>Fecha límite (opcional)</label>
            <input style={{ ...inp, colorScheme: 'dark' }} type="date"
              value={form.deadline} onChange={e => set('deadline', e.target.value)} />
          </div>
        </div>

        {error && (
          <p className="text-sm mt-3 p-3 rounded-xl" style={{ color: '#ef4444', backgroundColor: '#ef444415' }}>
            ⚠️ {error}
          </p>
        )}

        <div className="flex items-center justify-between mt-5">
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
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#00d4aa', color: '#000', opacity: (!form.name || !form.target_amount) ? 0.5 : 1 }}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}