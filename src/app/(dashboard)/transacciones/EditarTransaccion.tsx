'use client'
import { useState } from 'react'
import { Pencil, X, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

const CATEGORIAS_GASTO   = ['Alimentación','Transporte','Vivienda','Servicios/Suscripciones','Salud','Entretenimiento','Ropa y personal','Educación','Otro']
const CATEGORIAS_INGRESO = ['Salario','Freelance','Inversiones','Arriendo','Otro']
const CATEGORIAS_DEUDA   = ['Crédito hipotecario','Tarjeta crédito','Préstamo','Otro']

const TIPO_LABEL: Record<string, string> = {
  expense:      'Gasto',
  income:       'Ingreso',
  debt_payment: 'Pago deuda',
}

export default function EditarTransaccion({
  id, amount, description, category, date, accounts, accountId, type
}: {
  id: string; amount: number; description: string; category: string
  date: string; accounts: any[]; accountId: string; type: string
}) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [amt, setAmt]       = useState(amount.toString())
  const [desc, setDesc]     = useState(description ?? '')
  const [cat, setCat]       = useState(category)
  const [dt, setDt]         = useState(date)
  const [accId, setAccId]   = useState(accountId)
  const [txType, setTxType] = useState(type)

  const router    = useRouter()
  const { toast } = useToast()

  const cats = txType === 'income'       ? CATEGORIAS_INGRESO
             : txType === 'debt_payment' ? CATEGORIAS_DEUDA
             : CATEGORIAS_GASTO

  async function handleSave() {
    setLoading(true)
    try {
      const supabase = createClient()
      const cleanAmt = Number(amt.toString().replace(/\./g, '').replace(/,/g, ''))
      const { error } = await supabase.from('transactions').update({
        amount:     cleanAmt,
        description: desc,
        category:   cat,
        date:       dt,
        account_id: accId,
        type:       txType,
      }).eq('id', id)

      if (error) throw error
      toast.success('Transacción actualizada', `${TIPO_LABEL[txType]} de $${cleanAmt.toLocaleString('es-CO')} guardado.`)
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al actualizar', 'Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta transacción?')) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
      toast.success('Transacción eliminada', desc || category)
      setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast.error('Error al eliminar', 'Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
    backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#e5e7eb', outline: 'none'
  }
  const lbl = {
    color: '#6b7280', fontSize: '11px', marginBottom: '4px',
    display: 'block' as const, letterSpacing: '0.05em', textTransform: 'uppercase' as const
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
      style={{ color: '#4b5563' }}>
      <Pencil size={13} />
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />
      <div className="fixed z-50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">Editar transacción</h3>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
            style={{ color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2 mb-5">
          {([
            ['expense',      'Gasto',      '#ef4444'],
            ['income',       'Ingreso',    '#10b981'],
            ['debt_payment', 'Pago deuda', '#f59e0b'],
          ] as [string, string, string][]).map(([val, label, color]) => (
            <button key={val}
              onClick={() => {
                setTxType(val)
                setCat(val === 'income' ? 'Salario' : val === 'debt_payment' ? 'Crédito hipotecario' : 'Alimentación')
              }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: txType === val ? color + '25' : '#0f1117',
                color:           txType === val ? color : '#6b7280',
                border:          `1px solid ${txType === val ? color + '60' : '#2a3040'}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Monto (COP)</label>
              <input style={inp} value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              <input type="date" style={{ ...inp, colorScheme: 'dark' }} value={dt} onChange={e => setDt(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <input style={inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>Categoría</label>
              <select style={inp} value={cat} onChange={e => setCat(e.target.value)}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Cuenta</label>
              <select style={inp} value={accId} onChange={e => setAccId(e.target.value)}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={handleDelete} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-900/30"
            style={{ color: '#ef4444', border: '1px solid #ef444430' }}>
            <Trash2 size={13} /> Eliminar
          </button>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#0f1117', color: '#6b7280' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117', opacity: loading ? 0.7 : 1 }}>
              <Check size={14} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}