'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { type SavingsPlanRow, type PlanComputed } from '@/lib/savings'

interface Deposit {
  id:           string
  amount:       string | number
  deposit_date: string
  notes:        string | null
  created_at:   string
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmt = (n: number, c: string) => (c === 'USD' ? fmtUSD(n) : fmtCOP(n))
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

export default function AhorroDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id     = params.id
  const { toast } = useToast()

  const [plan, setPlan]         = useState<(SavingsPlanRow & { computed: PlanComputed }) | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [addAmount, setAddAmount] = useState('')
  const [addDate, setAddDate]     = useState(new Date().toISOString().split('T')[0])
  const [addNotes, setAddNotes]   = useState('')
  const [saving, setSaving]       = useState(false)
  const submittingRef             = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/savings/${id}`)
      const data = await res.json() as { plan?: SavingsPlanRow & { computed: PlanComputed }; deposits?: Deposit[]; error?: string }
      if (!res.ok || data.error || !data.plan) {
        toast.error('No se pudo cargar el plan', data.error)
        return
      }
      setPlan(data.plan)
      setDeposits(data.deposits ?? [])
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => { void load() }, [load])

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    const amt = Number(addAmount)
    if (!amt || amt <= 0) return
    submittingRef.current = true
    setSaving(true)
    try {
      const res  = await fetch(`/api/savings/${id}/deposits`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: amt, deposit_date: addDate, notes: addNotes.trim() || undefined }),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        toast.error('No se pudo registrar', data.error)
        return
      }
      toast.success('Depósito registrado', fmt(amt, plan?.currency ?? 'COP'))
      setShowAdd(false); setAddAmount(''); setAddNotes('')
      await load()
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
      submittingRef.current = false
    }
  }

  async function deleteDeposit(depositId: string) {
    const res = await fetch(`/api/savings/${id}/deposits/${depositId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Depósito eliminado')
      await load()
    } else {
      toast.error('No se pudo eliminar')
    }
  }

  async function deletePlan() {
    if (!plan) return
    if (!confirm('¿Eliminar este plan de ahorro? Va a la papelera.')) return
    const res = await fetch(`/api/savings/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Plan eliminado')
      router.push('/ahorros')
      router.refresh()
    } else {
      toast.error('No se pudo eliminar')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Cargando…</div>
    )
  }
  if (!plan) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
        Plan no encontrado.{' '}
        <a href="/ahorros" style={{ color: '#a78bfa' }}>Volver</a>
      </div>
    )
  }

  const c = plan.color ?? '#6366f1'
  const cu = plan.currency
  const totalCount = deposits.length
  const totalAmount = deposits.reduce((s, d) => s + Number(d.amount), 0)
  const avg = totalCount > 0 ? totalAmount / totalCount : 0
  const biggest = deposits.reduce((m, d) => Math.max(m, Number(d.amount)), 0)

  return (
    <div className="space-y-6 pb-8" style={{ maxWidth: '880px', margin: '0 auto' }}>
      <a href="/ahorros" className="inline-flex items-center gap-2" style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Volver a Ahorros
      </a>

      {/* Header */}
      <div className="card card-purple p-6 relative overflow-hidden page-enter">
        <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: c }} />
        <div className="flex items-start justify-between" style={{ flexWrap: 'wrap', gap: '14px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '60px', height: '60px', borderRadius: '16px',
                background: c + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
              }}
            >
              {plan.icon ?? '🐷'}
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl tracking-tight">{plan.name}</h1>
              {plan.description && (
                <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>{plan.description}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="btn-primary inline-flex items-center gap-2"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <Plus size={14} /> Registrar depósito
            </button>
            <button
              type="button"
              onClick={deletePlan}
              style={{
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)',
                color: '#f87171', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Big progress */}
        <div style={{ marginTop: '24px', position: 'relative' }}>
          <div className="flex justify-between" style={{ marginBottom: '8px' }}>
            <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(Number(plan.current_amount), cu)}
            </span>
            <span className="tabular-nums" style={{ color: c, fontWeight: 700, fontSize: '20px' }}>
              {plan.computed.percentComplete.toFixed(1)}%
            </span>
          </div>
          <div className="progress-track" style={{ height: '12px', position: 'relative' }}>
            <div className="progress-fill" style={{ width: `${plan.computed.percentComplete}%`, backgroundColor: c, transition: 'width 600ms cubic-bezier(0.16,1,0.3,1)' }} />
            {plan.computed.percentExpected > 0 && plan.computed.percentExpected < 100 && (
              <span style={{
                position: 'absolute', left: `${plan.computed.percentExpected}%`,
                top: '-3px', bottom: '-3px', width: '2px',
                background: 'rgba(255,255,255,0.45)', borderRadius: '1px',
              }} />
            )}
          </div>
          <div className="flex justify-between" style={{ marginTop: '6px' }}>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Meta: {fmt(Number(plan.target_amount), cu)} · {fmtDate(plan.target_date)}
            </span>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {plan.computed.daysRemaining > 0
                ? `Quedan ${plan.computed.daysRemaining} días`
                : 'Vencido'}
            </span>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4 page-enter page-enter-delay-1">
        {[
          { label: 'Aportes registrados', value: String(totalCount) },
          { label: 'Aporte promedio',     value: avg > 0 ? fmt(avg, cu) : '—' },
          { label: 'Aporte más grande',   value: biggest > 0 ? fmt(biggest, cu) : '—' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              {s.label}
            </p>
            <p className="tabular-nums" style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Deposits timeline */}
      <div className="card overflow-hidden page-enter page-enter-delay-2">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#a78bfa', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Historial de depósitos
          </p>
        </div>
        {deposits.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <TrendingUp size={26} style={{ color: '#4b5563', margin: '0 auto 10px' }} />
            <p style={{ color: '#9ca3af', fontSize: '13px' }}>Aún no has registrado depósitos.</p>
            <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>Pulsa "Registrar depósito" para empezar.</p>
          </div>
        ) : (
          deposits.map((d, i) => (
            <div
              key={d.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 20px',
                borderBottom: i < deposits.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div
                style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: c + '14', color: c,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '14px', fontWeight: 700,
                }}
              >
                +
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px' }}>
                  {fmt(Number(d.amount), cu)}
                </p>
                <p className="text-muted" style={{ fontSize: '11px' }}>
                  {fmtDate(d.deposit_date)}{d.notes ? ` · ${d.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteDeposit(d.id)}
                aria-label="Eliminar depósito"
                style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'transparent', border: 'none',
                  color: '#6b7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 150ms, color 150ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add-deposit modal */}
      {showAdd && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAdd(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)',
          }}
        >
          <form
            onSubmit={submitDeposit}
            style={{
              maxWidth: '420px', width: '100%',
              background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '24px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Nuevo depósito
            </p>
            <h3 style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '17px', marginBottom: '18px' }}>{plan.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Monto ({cu}) *</label>
                <input
                  className="form-input"
                  type="number"
                  step="any"
                  min="0"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder={cu === 'USD' ? 'ej. 100' : 'ej. 200000'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Fecha</label>
                <input
                  className="form-input"
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Notas</label>
                <input
                  className="form-input"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '12px', flex: 1 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !addAmount || Number(addAmount) <= 0}
                className="btn-primary inline-flex items-center justify-center gap-2"
                style={{ padding: '10px 18px', fontSize: '12px', flex: 1, opacity: saving || !addAmount ? 0.5 : 1, cursor: saving || !addAmount ? 'not-allowed' : 'pointer' }}
              >
                {saving ? (<><Loader2 size={13} className="animate-spin" /> Guardando…</>) : ('Registrar')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
