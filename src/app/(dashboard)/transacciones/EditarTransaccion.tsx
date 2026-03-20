'use client'
import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// --- INICIO CÓDIGO ACTUALIZADO ---
const CATEGORIAS = [
  'Alimentación','Transporte','Vivienda','Servicios/Suscripciones',
  'Salud','Entretenimiento','Ropa y personal','Educación',
  'Salario','Freelance','Inversiones','Arriendo',
  'Apartamento Flandes','Tarjeta crédito','Préstamo','Otro'
]
// --- FIN CÓDIGO ACTUALIZADO ---

export default function EditarTransaccion({
  id, amount, description, category, date, accounts, accountId, type
}: {
  id: string; amount: number; description: string; category: string
  date: string; accounts: any[]; accountId: string; type: string
}) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [amt, setAmt]                 = useState(amount.toString())
  const [desc, setDesc]               = useState(description)
  const [cat, setCat]                 = useState(category)
  const [dt, setDt]                   = useState(date)
  const [accId, setAccId]             = useState(accountId)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const cleanAmt = Number(amt.replace(/\./g,'').replace(/,/g,''))
    await supabase.from('transactions').update({
      amount: cleanAmt, description: desc, category: cat, date: dt, account_id: accId
    }).eq('id', id)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta transacción?')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', id)
    setLoading(false)
    router.refresh()
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
    backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#e5e7eb', outline: 'none'
  }
  const labelStyle = { color: '#6b7280', fontSize: '11px', marginBottom: '4px', display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase' as const }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
      style={{ color: '#4b5563' }}>
      <Pencil size={13} />
    </button>
  )

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />

      {/* Modal */}
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

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Monto (COP)</label>
            <input style={inputStyle} value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input style={inputStyle} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción" />
          </div>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={cat} onChange={e => setCat(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Cuenta</label>
            <select style={inputStyle} value={accId} onChange={e => setAccId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={dt} onChange={e => setDt(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={handleDelete} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-red-900/30"
            style={{ color: '#ef4444', border: '1px solid #ef444430' }}>
            Eliminar
          </button>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#0f1117', color: '#6b7280' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: '#00d4aa', color: '#000' }}>
              <Check size={14} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}