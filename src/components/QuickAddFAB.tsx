'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'

const CATS = [
  'Alimentación','Transporte','Vivienda','Servicios/Suscripciones',
  'Salud','Entretenimiento','Ropa y personal','Educación','Otro',
]

export default function QuickAddFAB() {
  const [open, setOpen]       = useState(false)
  const [hovered, setHovered] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    amount: '', category: 'Alimentación', description: '', account_id: '',
  })
  const router    = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('accounts')
      .select('id, name, type')
      .in('type', ['bank', 'cash'])
      .then(({ data }) => {
        if (data?.length) {
          setAccounts(data)
          setForm(f => ({ ...f, account_id: data[0].id }))
        }
      })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    if (!form.amount) return
    setSaving(true)
    try {
      const res = await fetch('/api/save-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'expense',
          amount:      Number(form.amount),
          category:    form.category,
          description: form.description,
          date:        new Date().toISOString().split('T')[0],
          account_id:  form.account_id,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(
        'Gasto registrado',
        `${form.category} · $${Number(form.amount).toLocaleString('es-CO')}`
      )
      setOpen(false)
      setForm(f => ({ ...f, amount: '', description: '' }))
      router.refresh()
    } catch {
      toast.error('Error al guardar', 'Por favor intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '8px 12px', fontSize: '13px', width: '100%', outline: 'none',
  }
  const lbl = { color: '#6b7280', fontSize: '11px', display: 'block' as const, marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Agregar transacción (Ctrl+N)"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 45,
          width: '52px', height: '52px', borderRadius: '50%',
          backgroundColor: '#00d4aa', color: 'white',
          boxShadow: hovered ? '0 6px 24px rgba(0,212,170,0.6)' : '0 4px 20px rgba(0,212,170,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', cursor: 'pointer',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 200ms, box-shadow 200ms',
        }}
      >
        <Plus size={22} />
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[55]"
            style={{ backgroundColor: '#00000070' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-[60] rounded-2xl p-5 w-full shadow-2xl"
            style={{
              backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
              bottom: '90px', right: '24px', maxWidth: '340px',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Agregar gasto rápido</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                style={{ color: '#6b7280' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label style={lbl}>Monto (COP)</label>
                <input
                  autoFocus
                  style={inp}
                  type="number"
                  placeholder="50000"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar()}
                />
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Descripción</label>
                <input
                  style={inp}
                  placeholder="Ej: Almuerzo restaurante"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar()}
                />
              </div>
              {accounts.length > 1 && (
                <div>
                  <label style={lbl}>Cuenta</label>
                  <select style={inp} value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={guardar}
              disabled={saving || !form.amount}
              className="w-full py-2.5 rounded-xl text-sm font-semibold mt-4 flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: '#00d4aa', color: '#0f1117',
                opacity: (!form.amount || saving) ? 0.5 : 1,
              }}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                : '+ Guardar gasto'}
            </button>

            <p style={{ color: '#4b5563', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
              Enter para guardar · Esc para cerrar · Ctrl+N siempre disponible
            </p>
          </div>
        </>
      )}
    </>
  )
}
