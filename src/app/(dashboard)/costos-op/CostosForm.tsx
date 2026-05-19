'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { useAchievementToast } from '@/components/ui/WealthMessage'

const CATEGORIAS = ['Arriendo', 'Servicios públicos', 'Internet/Celular', 'Suscripciones', 'Alimentación', 'Transporte', 'Otro']

const COLORES: Record<string, string> = {
  'Arriendo': '#6366f1', 'Servicios públicos': '#f59e0b',
  'Internet/Celular': '#10b981', 'Suscripciones': '#ec4899',
  'Alimentación': '#ef4444', 'Transporte': '#3b82f6', 'Otro': '#6b7280',
}

type Cost = {
  id: string; name: string; category: string;
  amount: number; frequency: string; active: boolean
}
type Mode = 'list' | 'add' | 'edit'

export default function CostosForm({ costs }: { costs: Cost[] }) {
  const [mode, setMode]           = useState<Mode>('list')
  const [editId, setEditId]       = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm]           = useState({ name: '', category: 'Arriendo', amount: '', frequency: 'monthly' })
  const router                      = useRouter()
  const { toast }                   = useToast()
  const { trigger, ToastContainer } = useAchievementToast()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  function abrirEditar(cost: Cost) {
    setForm({ name: cost.name, category: cost.category, amount: String(cost.amount), frequency: cost.frequency })
    setEditId(cost.id)
    setMode('edit')
  }

  function abrirAgregar() {
    setForm({ name: '', category: 'Arriendo', amount: '', frequency: 'monthly' })
    setEditId(null)
    setMode('add')
  }

  async function guardar() {
    setGuardando(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')

      if (mode === 'edit' && editId) {
        const { error } = await supabase.from('operational_costs').update({
          name: form.name, category: form.category,
          amount: Number(form.amount), frequency: form.frequency
        }).eq('id', editId)
        if (error) throw error
        toast.success('Costo actualizado', `${form.name} se guardó correctamente.`)
      } else {
        const { error } = await supabase.from('operational_costs').insert({
          name: form.name, category: form.category,
          amount: Number(form.amount), frequency: form.frequency,
          active: true, user_id: data.session.user.id
        })
        if (error) throw error
        toast.success('Costo agregado', `${form.name} · ${fmtCOP(Number(form.amount))}/mes`)
        trigger('investment_added')
      }

      setMode('list')
      router.refresh()
    } catch (e: any) {
      toast.error(
        mode === 'edit' ? 'Error al actualizar costo' : 'Error al agregar costo',
        'Ocurrió un problema al guardar. Por favor intenta de nuevo.'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(cost: Cost) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('operational_costs')
        .update({ active: !cost.active })
        .eq('id', cost.id)
      if (error) throw error
      toast.info(
        cost.active ? 'Costo desactivado' : 'Costo activado',
        cost.name
      )
      router.refresh()
    } catch (e: any) {
      toast.error('Error al cambiar estado', 'Por favor intenta de nuevo.')
    }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm('¿Eliminar este costo?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('operational_costs').delete().eq('id', id)
      if (error) throw error
      toast.success('Costo eliminado', `${nombre} fue eliminado.`)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al eliminar', 'No se pudo eliminar. Por favor intenta de nuevo.')
    }
  }

  if (mode === 'add' || mode === 'edit') {
    return (
      <div className="card card-purple p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold">{mode === 'edit' ? 'Editar costo' : 'Nuevo costo fijo'}</p>
          <button onClick={() => setMode('list')} className="text-muted hover:text-white transition-colors" style={{ fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Nombre</label>
            <input className="form-input" placeholder="Ej: Arriendo apartamento"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Monto mensual (COP)</label>
            <input className="form-input" placeholder="500000" type="number"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setMode('list')} className="btn-secondary flex-1 py-2.5 text-sm">
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando || !form.name || !form.amount}
            className="btn-primary flex-1 py-2.5 text-sm"
            style={{ opacity: (!form.name || !form.amount || guardando) ? 0.5 : 1 }}>
            {guardando ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    )
  }

  const isEmpty = costs.length === 0

  return (
    <div className="space-y-6">
      <div className={`card overflow-hidden${isEmpty ? ' breathe-teal' : ''}`}
        style={isEmpty ? { borderColor: '#00d4aa25' } : {}}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white font-semibold">Lista de costos</p>
          <button onClick={abrirAgregar}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: '#10b98120', border: '1px solid #10b98140', color: '#10b981' }}>
            + Agregar costo
          </button>
        </div>

        {isEmpty && (
          <div className="px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 mx-auto"
              style={{ backgroundColor: '#00d4aa10', border: '1px solid #00d4aa25' }}>
              <span style={{ fontSize: '26px' }}>💎</span>
            </div>
            <p className="text-white font-bold text-lg mb-2">
              Conoce el costo real de tu estilo de vida
            </p>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              Quienes tienen visión saben exactamente qué necesitan para operar.
            </p>
          </div>
        )}

        {costs.length > 0 && costs.map((cost, i) => {
          const color = COLORES[cost.category] ?? '#6b7280'
          return (
            <div key={cost.id}
              className="flex items-center justify-between px-6 py-4 transition-all hover:bg-white/[0.02]"
              style={{
                borderBottom: i < costs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                opacity: cost.active ? 1 : 0.5
              }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: color + '20', color }}>
                  {cost.category.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{cost.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color + '15', color }}>
                    {cost.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="tabular-nums font-semibold" style={{ color: '#ef4444', fontSize: '15px' }}>
                  {fmtCOP(cost.amount)}
                </p>
                <button onClick={() => toggleActivo(cost)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all${cost.active ? ' costo-activo' : ''}`}
                  style={cost.active ? {} : {
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#6b7280',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                  {cost.active ? 'Activo' : 'Inactivo'}
                </button>
                <button onClick={() => abrirEditar(cost)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: '#6b7280' }}>
                  ✏️
                </button>
                <button onClick={() => eliminar(cost.id, cost.name)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
                  style={{ color: '#6b7280' }}>
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <ToastContainer />
    </div>
  )
}
