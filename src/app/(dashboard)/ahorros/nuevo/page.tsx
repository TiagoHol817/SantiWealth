'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, PiggyBank, Calendar, Target } from 'lucide-react'

const ICONS = ['🐷', '✈️', '🏠', '🚗', '🎓', '💍', '🏖️', '📱'] as const
const FREQ_OPTS = [
  { id: 'weekly',   label: 'Semanal',     days: 7  },
  { id: 'biweekly', label: 'Quincenal',   days: 15 },
  { id: 'monthly',  label: 'Mensual',     days: 30 },
  { id: 'custom',   label: 'Personalizado', days: 30 },
] as const

type Frequency = typeof FREQ_OPTS[number]['id']
type Currency  = 'COP' | 'USD'

interface AccountOption {
  id:   string
  name: string
}

interface GoalOption {
  id:   string
  name: string
}

const today = new Date().toISOString().split('T')[0]
function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmt = (n: number, c: Currency) => (c === 'USD' ? fmtUSD(n) : fmtCOP(n))
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

export default function NuevoAhorroPage() {
  const router = useRouter()
  const submittingRef = useRef(false)

  // Form state
  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon]           = useState<string>('🐷')
  const [targetAmount, setTargetAmount] = useState('')
  const [currency, setCurrency]   = useState<Currency>('COP')
  const [targetDate, setTargetDate] = useState(addMonths(today, 6))
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [sourceAccount, setSourceAccount] = useState('')
  const [destinationAccount, setDestinationAccount] = useState('')
  const [linkedGoal, setLinkedGoal] = useState('')

  const [accounts, setAccounts]   = useState<AccountOption[]>([])
  const [goals, setGoals]         = useState<GoalOption[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Load accounts + goals in parallel. Goals are user-specific (RLS-scoped
  // through the supabase client → only this user's goals are returned).
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/accounts').then((r) => r.json()).catch(() => ({ accounts: [] })),
      fetch('/api/goals/list').then((r) => r.json()).catch(() => ({ goals: [] })),
    ]).then(([accData, goalData]: [{ accounts?: AccountOption[] }, { goals?: GoalOption[] }]) => {
      if (cancelled) return
      setAccounts(accData.accounts ?? [])
      setGoals(goalData.goals ?? [])
    })
    return () => { cancelled = true }
  }, [])

  // ── Live preview ────────────────────────────────────────────────────────
  const targetNum    = Number(targetAmount) || 0
  const startISO     = today
  const periodDays   = FREQ_OPTS.find((f) => f.id === frequency)!.days
  const totalDays    = Math.max(
    1,
    Math.round((new Date(targetDate + 'T00:00:00').getTime() - new Date(startISO + 'T00:00:00').getTime()) / 86_400_000),
  )
  const periodsCount = Math.max(1, Math.ceil(totalDays / periodDays))
  const perDeposit   = targetNum > 0 ? targetNum / periodsCount : 0
  const freqLabel    = FREQ_OPTS.find((f) => f.id === frequency)!.label.toLowerCase()

  const canSubmit = name.trim().length > 0 && targetNum > 0 && targetDate > startISO && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch('/api/savings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:                   name.trim(),
          description:            description.trim() || null,
          target_amount:          targetNum,
          currency,
          start_date:             startISO,
          target_date:            targetDate,
          frequency,
          source_account_id:      sourceAccount      || null,
          destination_account_id: destinationAccount || null,
          linked_goal_id:         linkedGoal         || null,
          icon,
          color: '#6366f1',
        }),
      })
      const data = await res.json() as { success?: boolean; id?: string; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudo crear el plan')
        return
      }
      router.push('/ahorros')
      router.refresh()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <div className="space-y-6 pb-8" style={{ maxWidth: '920px', margin: '0 auto' }}>
      <a href="/ahorros" className="inline-flex items-center gap-2 transition-colors" style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Volver a Ahorros
      </a>

      <div className="page-enter">
        <h1 className="page-title">Nuevo plan de ahorro</h1>
        <p className="page-subtitle">Define el objetivo, la fecha y la frecuencia</p>
      </div>

      <div className="ahorros-new-layout">
        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {error && (
            <div className="rounded-xl flex items-center gap-2 text-sm" style={{ padding: '11px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <div>
            <label className="form-label">Nombre del plan *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Vacaciones a Cartagena"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="form-label">Ícono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ICONS.map((emoji) => {
                const active = icon === emoji
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    style={{
                      width:        '44px',
                      height:       '44px',
                      borderRadius: '12px',
                      background:   active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                      border:       `1px solid ${active ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.08)'}`,
                      fontSize:     '20px',
                      cursor:       'pointer',
                      transition:   'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="form-label">Descripción</label>
            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional — para qué es este plan"
              rows={2}
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          <div className="agregar-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Meta *</label>
              <input
                className="form-input"
                type="number"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder={currency === 'USD' ? 'ej. 3000' : 'ej. 5000000'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                required
              />
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
                        flex:         1,
                        padding:      '10px',
                        borderRadius: '10px',
                        background:   active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                        border:       `1px solid ${active ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.07)'}`,
                        color:        active ? '#a78bfa' : '#9ca3af',
                        fontSize:     '13px',
                        fontWeight:   600,
                        cursor:       'pointer',
                        transition:   'all 150ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Fecha objetivo *</label>
            <input
              className="form-input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={startISO}
              required
            />
          </div>

          <div>
            <label className="form-label">Frecuencia de aporte</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {FREQ_OPTS.map((f) => {
                const active = frequency === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    style={{
                      padding:      '8px 14px',
                      borderRadius: '999px',
                      background:   active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.03)',
                      border:       `1px solid ${active ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.07)'}`,
                      color:        active ? '#a78bfa' : '#9ca3af',
                      fontSize:     '12px',
                      fontWeight:   600,
                      cursor:       'pointer',
                      transition:   'all 150ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="agregar-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="form-label">Cuenta origen (opcional)</label>
              <select
                className="form-input"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— Ninguna —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '5px' }}>
                Si la seleccionas, cada aporte se registra como gasto en esta cuenta.
              </p>
            </div>
            <div>
              <label className="form-label">Cuenta destino (opcional)</label>
              <select
                className="form-input"
                value={destinationAccount}
                onChange={(e) => setDestinationAccount(e.target.value)}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— Ninguna —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional: connect this plan to one of the user's existing goals.
              Renders only if the user has at least one goal — no specific
              goal name is hardcoded; the list is loaded from the API.
              Styled with an explicit purple/white palette because the default
              form-input theme was rendering purple-on-purple in some browsers
              and the option list inherited unreadable colors. */}
          {goals.length > 0 && (
            <div>
              <label className="form-label">¿Conectar a una meta? (opcional)</label>
              <select
                value={linkedGoal}
                onChange={(e) => setLinkedGoal(e.target.value)}
                style={{
                  width:          '100%',
                  appearance:     'none',
                  cursor:         'pointer',
                  padding:        '11px 14px',
                  borderRadius:   '10px',
                  fontSize:       '14px',
                  fontWeight:     500,
                  // Explicit purple-on-white so contrast is guaranteed regardless
                  // of browser default option-list styling.
                  background:     '#6366f1',
                  color:          '#ffffff',
                  border:         '1px solid rgba(255,255,255,0.16)',
                  outline:        'none',
                  // Arrow indicator via background-image, since we removed the
                  // native one with appearance:none.
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                  backgroundRepeat:   'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight:       '36px',
                  transition:     'background 150ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLSelectElement).style.background = '#7c83f4 url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") right 14px center / 12px no-repeat' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLSelectElement).style.background = '#6366f1 url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") right 14px center / 12px no-repeat' }}
              >
                {/* Native <option> elements inherit OS styling, but in modern
                    browsers we can force them dark/white for parity. */}
                <option value="" style={{ background: '#1a1f2e', color: '#ffffff' }}>No vincular</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id} style={{ background: '#1a1f2e', color: '#ffffff' }}>{g.name}</option>
                ))}
              </select>
              <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '6px' }}>
                Los depósitos de este plan aparecerán en el detalle de la meta seleccionada.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
              style={{ padding: '12px 20px', fontSize: '14px', opacity: !canSubmit ? 0.5 : 1, cursor: !canSubmit ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (<><Loader2 size={15} className="animate-spin" /> Creando…</>) : ('Crear plan →')}
            </button>
            <a
              href="/ahorros"
              className="flex items-center justify-center rounded-xl text-sm font-medium transition-all"
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', textDecoration: 'none' }}
            >
              Cancelar
            </a>
          </div>
        </form>

        {/* Live preview */}
        <div className="card card-purple p-6 ahorros-preview" style={{ alignSelf: 'flex-start', position: 'sticky', top: '24px' }}>
          <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PiggyBank size={13} /> Vista previa
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(99,102,241,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '15px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || 'Nuevo plan'}
              </p>
              <p className="text-muted" style={{ fontSize: '12px' }}>
                {currency} · {freqLabel}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.18)', borderRadius: '10px' }}>
              <Target size={14} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <p className="text-muted" style={{ fontSize: '11px', marginBottom: '3px' }}>Deberás aportar</p>
                <p style={{ color: '#e5e7eb', fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {targetNum > 0 ? fmt(perDeposit, currency) : '—'}
                </p>
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>cada {freqLabel}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: 'rgba(0,0,0,0.18)', borderRadius: '10px' }}>
              <Calendar size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <p className="text-muted" style={{ fontSize: '11px', marginBottom: '3px' }}>Llegarás a la meta</p>
                <p style={{ color: '#10b981', fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {targetNum > 0 ? fmt(targetNum, currency) : '—'}
                </p>
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                  el {fmtDate(targetDate)}
                </p>
              </div>
            </div>

            <p className="text-muted" style={{ fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
              ≈ {periodsCount} aporte{periodsCount === 1 ? '' : 's'} · {totalDays} {totalDays === 1 ? 'día' : 'días'} hasta el objetivo
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .ahorros-new-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
        }
        @media (max-width: 880px) {
          .ahorros-new-layout { grid-template-columns: 1fr }
          .ahorros-preview    { position: static !important }
        }
      `}</style>
    </div>
  )
}
