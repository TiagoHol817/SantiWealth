'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { useAchievementToast } from '@/components/ui/WealthMessage'
import Select from '@/components/ui/Select'

const CATEGORIAS_GASTO   = ['Alimentación','Transporte','Vivienda','Servicios/Suscripciones','Salud','Entretenimiento','Ropa y personal','Educación','Otro']
const CATEGORIAS_INGRESO = ['Salario','Freelance','Inversiones','Arriendo','Otro']
const CATEGORIAS_DEUDA   = ['Crédito hipotecario','Tarjeta crédito','Préstamo','Otro']

const TIPO_LABEL: Record<string, string> = {
  expense:      'Gasto',
  income:       'Ingreso',
  debt_payment: 'Pago de deuda',
}

export default function TransaccionForm({ accounts }: { accounts: any[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    type:        'expense',
    amount:      '',
    category:    'Alimentación',
    description: '',
    date:        new Date().toISOString().split('T')[0],
    account_id:  accounts[0]?.id ?? ''
  })
  const router                        = useRouter()
  const { toast }                     = useToast()
  const { trigger, ToastContainer }   = useAchievementToast()

  const set  = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const cats = form.type === 'income'       ? CATEGORIAS_INGRESO
             : form.type === 'debt_payment' ? CATEGORIAS_DEUDA
             : CATEGORIAS_GASTO

  async function guardar() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.')

      const monto = Number(form.amount.toString().replace(/\./g, ''))
      const cuenta = accounts.find(a => a.id === form.account_id)

      const { error } = await supabase.from('transactions').insert({
        user_id:     session.user.id,
        account_id:  form.account_id,
        type:        form.type,
        amount:      monto,
        category:    form.category,
        description: form.description,
        date:        form.date,
      })

      if (error) throw error

      toast.success(
        `${TIPO_LABEL[form.type]} registrado`,
        `$${monto.toLocaleString('es-CO')} en ${cuenta?.name ?? 'cuenta'}`
      )
      trigger(form.type === 'income' ? 'income_added' : 'transaction_added')

      setOpen(false)
      setForm(f => ({ ...f, amount: '', description: '' }))
      router.refresh()
    } catch (e: any) {
      toast.error(
        'Error al guardar transacción',
        'Ocurrió un problema al guardar. Por favor intenta de nuevo.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
      style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)', color: '#0f1117' }}>
      <Plus size={15} /> Nueva transacción
    </button>
  )

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />
      <div className="card card-purple fixed z-50 p-6 w-full max-w-md shadow-2xl"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-lg">Nueva transacción</h3>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-muted">
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
                set('type', val)
                set('category', val === 'income' ? 'Salario' : val === 'debt_payment' ? 'Crédito hipotecario' : 'Alimentación')
              }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: form.type === val ? color + '25' : 'rgba(255,255,255,0.04)',
                color:           form.type === val ? color : '#6b7280',
                border:          `1px solid ${form.type === val ? color + '60' : 'rgba(255,255,255,0.08)'}`
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Monto (COP)</label>
            <input className="form-input" placeholder="50000" type="number"
              value={form.amount} onChange={e => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Fecha</label>
            <input className="form-input" style={{ colorScheme: 'dark' }} type="date"
              value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <Select
              value={form.category}
              onChange={v => set('category', v)}
              options={cats.map(c => ({ value: c, label: c }))}
            />
          </div>
          <div>
            <label className="form-label">Cuenta</label>
            <Select
              value={form.account_id}
              onChange={v => set('account_id', v)}
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div className="col-span-2">
            <label className="form-label">Descripción (opcional)</label>
            <input className="form-input" placeholder="Ej: Almuerzo en restaurante"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>

        <button onClick={guardar} disabled={saving || !form.amount}
          className="btn-primary w-full mt-5"
          style={{ opacity: (!form.amount || saving) ? 0.5 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar transacción'}
        </button>
      </div>
      <ToastContainer />
    </>
  )
}
