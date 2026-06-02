'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

type AccountType = 'bank' | 'cash' | 'brokerage' | 'crypto' | 'liability' | 'other'
type Currency   = 'COP' | 'USD'

export interface AccountInit {
  id:              string
  name:            string
  type:            AccountType
  currency:        Currency
  current_balance: number | string
}

interface Props {
  open:    boolean
  onClose: () => void
  /** When present → edit mode. When absent → create mode. */
  initial?: AccountInit
}

const TYPE_OPTS: { id: AccountType; label: string }[] = [
  { id: 'bank',      label: 'Banco' },
  { id: 'cash',      label: 'Efectivo' },
  { id: 'brokerage', label: 'Brokerage' },
  { id: 'crypto',    label: 'Cripto' },
  { id: 'liability', label: 'Pasivo' },
  { id: 'other',     label: 'Otro' },
]

export default function AccountEditModal({ open, onClose, initial }: Props) {
  const router  = useRouter()
  const { toast } = useToast()
  const submittingRef = useRef(false)

  const isEdit = !!initial
  const [name, setName]         = useState(initial?.name ?? '')
  const [type, setType]         = useState<AccountType>(initial?.type ?? 'bank')
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'COP')
  const [balance, setBalance]   = useState<string>(initial ? String(initial.current_balance) : '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Reset internal state when modal closes (so the next open starts clean for "Nueva cuenta")
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      if (initial) {
        setName(initial.name); setType(initial.type); setCurrency(initial.currency)
        setBalance(String(initial.current_balance))
      } else {
        setName(''); setType('bank'); setCurrency('COP'); setBalance('')
      }
      setError(null); setSaving(false)
    }, 200)
    return () => clearTimeout(t)
  }, [open, initial])

  // Esc to close + body-scroll-lock
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  async function save() {
    if (submittingRef.current) return
    if (!name.trim()) { setError('El nombre es requerido'); return }
    submittingRef.current = true
    setSaving(true); setError(null)

    try {
      const balanceNum = Number(balance) || 0
      const url    = isEdit ? `/api/accounts/${initial!.id}` : '/api/accounts'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:            name.trim(),
          type,
          currency,
          current_balance: balanceNum,
        }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudo guardar la cuenta')
        return
      }
      toast.success(isEdit ? 'Cuenta actualizada' : 'Cuenta creada', name.trim())
      onClose()
      router.refresh()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
      submittingRef.current = false
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card card-purple rounded-2xl p-6 w-full shadow-2xl"
        style={{ maxWidth: '440px', maxHeight: '92vh', overflow: 'auto', position: 'relative' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: '14px', right: '14px',
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color: '#9ca3af', cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>

        <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '6px' }}>
          {isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
        </p>
        <h3 style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>
          {isEdit ? initial!.name : 'Crear una cuenta'}
        </h3>

        {error && (
          <div
            className="rounded-xl flex items-center gap-2 text-sm mb-4"
            style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
          >
            <span>⚠</span> {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="form-label">Nombre *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Bancolombia Ahorros"
              autoFocus
            />
          </div>

          <div>
            <label className="form-label">Tipo</label>
            <select
              className="form-input"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              {TYPE_OPTS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Moneda</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['COP', 'USD'] as Currency[]).map((c) => {
                const active = currency === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      background: active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                      border:     `1px solid ${active ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.07)'}`,
                      color:      active ? '#a78bfa' : '#9ca3af',
                      fontSize:   '13px', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="form-label">Saldo actual</label>
            <input
              className="form-input"
              type="number"
              step="any"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder={currency === 'USD' ? 'ej. 5000' : 'ej. 5000000'}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
            className="btn-primary inline-flex items-center gap-2"
            style={{ padding: '10px 18px', fontSize: '13px', opacity: (saving || !name.trim()) ? 0.5 : 1, cursor: (saving || !name.trim()) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? (<><Loader2 size={13} className="animate-spin" /> Guardando…</>) : (isEdit ? 'Guardar' : 'Crear cuenta')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
