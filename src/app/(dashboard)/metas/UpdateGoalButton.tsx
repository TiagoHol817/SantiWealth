'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

export default function UpdateGoalButton({ id, current }: { id: string; current: number }) {
  const [open, setOpen]     = useState(false)
  const [valor, setValor]   = useState(String(current))
  const [saving, setSaving] = useState(false)
  const router    = useRouter()
  const { toast } = useToast()

  async function actualizar() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('investment_goals')
        .update({ current_amount: Number(valor) })
        .eq('id', id)

      if (error) throw error
      toast.success('Progreso actualizado', `Nuevo monto: $${Number(valor).toLocaleString('es-CO')}`)
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al actualizar', e?.message ?? 'No se pudo guardar el monto.')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '6px 10px', fontSize: '13px', outline: 'none', width: '160px'
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
      style={{
        backgroundColor: '#D4AF3720', color: '#D4AF37',
        border: '1px solid #D4AF3730', position: 'relative', zIndex: 10
      }}>
      <TrendingUp size={12} /> Actualizar
    </button>
  )

  return (
    <div className="flex gap-2 items-center">
      <input
        style={inp}
        type="number"
        value={valor}
        onChange={e => setValor(e.target.value)}
        placeholder="Nuevo monto"
        autoFocus
      />
      <button onClick={actualizar} disabled={saving}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #b8922a)', color: '#0f1117', opacity: saving ? 0.7 : 1 }}>
        <Check size={14} />
      </button>
      <button onClick={() => setOpen(false)}
        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
        style={{ color: '#6b7280' }}>
        <X size={14} />
      </button>
    </div>
  )
}