'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { completeOnboarding } from './actions'
import type { User } from '@supabase/supabase-js'

/* ─── Types ─────────────────────────────────────── */
type Currency = 'COP' | 'USD'
type Step = 1 | 2 | 3 | 'done'

interface AccountEntry {
  id:       string
  type:     'bank' | 'cash' | 'broker' | 'other'
  name:     string
  balance:  string
  expanded: boolean
}

interface WizardData {
  currency:   Currency
  country:    string
  accounts:   AccountEntry[]
  goalName:   string
  goalAmount: string
  goalIcon:   string
  goalDate:   string
}

const GOAL_PRESETS = [
  { icon: '🏠', label: 'Propiedad' },
  { icon: '🚗', label: 'Vehículo' },
  { icon: '🎓', label: 'Educación' },
  { icon: '✈️', label: 'Viajes' },
  { icon: '💰', label: 'Inversiones' },
  { icon: '💼', label: 'Negocio' },
  { icon: '🏖️', label: 'Retiro' },
  { icon: '🎯', label: 'Otro' },
]

const COUNTRY_OPTIONS = [
  { value: 'CO', label: '🇨🇴 Colombia' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'ES', label: '🇪🇸 España' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'OTHER', label: '🌍 Otro' },
]

const ACCOUNT_TYPES: { type: AccountEntry['type']; icon: string; label: string; placeholder: string; defaultName: string }[] = [
  { type: 'bank',   icon: '🏦', label: 'Banco',     placeholder: 'Bancolombia, Nu, Davivienda...', defaultName: 'Cuenta bancaria' },
  { type: 'cash',   icon: '💵', label: 'Efectivo',  placeholder: 'Billetera, caja...', defaultName: 'Efectivo' },
  { type: 'broker', icon: '📈', label: 'Broker',    placeholder: 'Tyba, Flink, TD Ameritrade...', defaultName: 'Portafolio' },
  { type: 'other',  icon: '📦', label: 'Otro',      placeholder: 'CDTs, fondos, criptos...', defaultName: 'Otro activo' },
]

/* ─── Helpers ────────────────────────────────────── */
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmtAmt = (n: number, c: Currency) => c === 'COP' ? fmtCOP(n) : fmtUSD(n)

function uid() { return Math.random().toString(36).slice(2, 9) }

/* ─── Small UI pieces ────────────────────────────── */
function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: i === current ? '28px' : '8px',
          height: '8px', borderRadius: '4px',
          backgroundColor: i === current ? '#D4AF37' : i < current ? '#D4AF3760' : '#2a3040',
          transition: 'all 300ms ease',
        }} />
      ))}
    </div>
  )
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
      border: active ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
      backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
      color: active ? '#D4AF37' : '#9ca3af', cursor: 'pointer', transition: 'all 150ms ease',
    }}>
      {children}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>{children}</p>
}

function StyledInput({ value, onChange, placeholder, type = 'text', small }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; small?: boolean
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', padding: small ? '8px 10px' : '11px 14px', borderRadius: '8px',
        backgroundColor: '#0d1220', border: '1px solid rgba(255,255,255,0.07)',
        color: '#e5e7eb', fontSize: small ? '13px' : '14px', outline: 'none', boxSizing: 'border-box',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.07)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

/* ─── Confetti ───────────────────────────────────── */
function Confetti() {
  const PIECES = 48
  const colors = ['#D4AF37', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6']
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {Array.from({ length: PIECES }).map((_, i) => {
        const left  = Math.random() * 100
        const delay = Math.random() * 0.8
        const dur   = 1.8 + Math.random() * 1.2
        const size  = 6 + Math.random() * 8
        const color = colors[i % colors.length]
        const rotate= Math.random() * 360
        return (
          <div key={i} style={{
            position: 'absolute',
            left: `${left}%`,
            top: '-10px',
            width: `${size}px`,
            height: `${size * (Math.random() > 0.5 ? 1 : 2.5)}px`,
            backgroundColor: color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            opacity: 0,
            transform: `rotate(${rotate}deg)`,
            animation: `confettiFall ${dur}s ${delay}s ease-in forwards`,
          }} />
        )
      })}
    </div>
  )
}

/* ─── Step 1 — Profile ───────────────────────────── */
function Step1({ data, set, name }: { data: WizardData; set: (p: Partial<WizardData>) => void; name: string }) {
  return (
    <div>
      <h2 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        Bienvenido, <span style={{ color: '#D4AF37' }}>{name}</span>
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
        Vamos a configurar tu base financiera. Solo tarda 2 minutos.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <Label>¿En qué moneda llevas tus finanzas?</Label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <ChipBtn active={data.currency === 'COP'} onClick={() => set({ currency: 'COP' })}>🇨🇴 Pesos (COP)</ChipBtn>
          <ChipBtn active={data.currency === 'USD'} onClick={() => set({ currency: 'USD' })}>🇺🇸 Dólar (USD)</ChipBtn>
        </div>
      </div>

      <div>
        <Label>¿Desde dónde gestionas tu patrimonio?</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {COUNTRY_OPTIONS.map(opt => (
            <ChipBtn key={opt.value} active={data.country === opt.value} onClick={() => set({ country: opt.value })}>
              {opt.label}
            </ChipBtn>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Step 2 — Accounts ──────────────────────────── */
function Step2({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  function addAccount(type: AccountEntry['type']) {
    const def = ACCOUNT_TYPES.find(t => t.type === type)!
    const exists = data.accounts.filter(a => a.type === type)
    const newAcc: AccountEntry = {
      id:       uid(),
      type,
      name:     exists.length ? `${def.defaultName} ${exists.length + 1}` : def.defaultName,
      balance:  '',
      expanded: true,
    }
    // Collapse any open ones of same type first
    const updated = data.accounts.map(a =>
      a.type === type && a.expanded ? { ...a, expanded: false } : a
    )
    set({ accounts: [...updated, newAcc] })
  }

  function updateAccount(id: string, patch: Partial<AccountEntry>) {
    set({ accounts: data.accounts.map(a => a.id === id ? { ...a, ...patch } : a) })
  }

  function removeAccount(id: string) {
    set({ accounts: data.accounts.filter(a => a.id !== id) })
  }

  const total = data.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)

  return (
    <div>
      <h2 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        Tu punto de partida
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
        Agrega tus cuentas y saldos actuales. Esto define tu patrimonio inicial.
      </p>

      {/* Account type buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {ACCOUNT_TYPES.map(at => (
          <button
            key={at.type}
            type="button"
            onClick={() => addAccount(at.type)}
            style={{
              padding: '10px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 500,
              border: '1px dashed rgba(255,255,255,0.1)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              color: '#9ca3af', cursor: 'pointer', transition: 'all 150ms ease',
              display: 'flex', alignItems: 'center', gap: '8px',
              textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'; (e.currentTarget as HTMLElement).style.color = '#e5e7eb' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af' }}
          >
            <span style={{ fontSize: '18px' }}>{at.icon}</span>
            <span>+ {at.label}</span>
          </button>
        ))}
      </div>

      {/* Account list */}
      {data.accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {data.accounts.map(acc => {
            const at = ACCOUNT_TYPES.find(t => t.type === acc.type)!
            return (
              <div key={acc.id} style={{
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)',
                backgroundColor: '#0d1220', overflow: 'hidden',
              }}>
                {/* Account header */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer' }}
                  onClick={() => updateAccount(acc.id, { expanded: !acc.expanded })}
                >
                  <span style={{ fontSize: '16px' }}>{at.icon}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '13px', flex: 1, fontWeight: 500 }}>{acc.name}</span>
                  {acc.balance && Number(acc.balance) > 0 && (
                    <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                      {fmtAmt(Number(acc.balance), data.currency)}
                    </span>
                  )}
                  <span style={{ color: '#4b5563', fontSize: '12px' }}>{acc.expanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded form */}
                {acc.expanded && (
                  <div style={{ padding: '0 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Nombre</p>
                      <StyledInput
                        small value={acc.name}
                        onChange={v => updateAccount(acc.id, { name: v })}
                        placeholder={at.placeholder}
                      />
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '4px' }}>Saldo ({data.currency})</p>
                      <StyledInput
                        small value={acc.balance}
                        onChange={v => updateAccount(acc.id, { balance: v.replace(/[^0-9.]/g, '') })}
                        placeholder={data.currency === 'COP' ? '5000000' : '2000'}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => removeAccount(acc.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', opacity: 0.7 }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Running total */}
      {total > 0 ? (
        <div style={{
          padding: '12px 16px', borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))',
          border: '1px solid rgba(212,175,55,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#9ca3af', fontSize: '13px' }}>Patrimonio inicial</span>
          <span style={{ color: '#D4AF37', fontSize: '16px', fontWeight: 700 }}>
            {fmtAmt(total, data.currency)}
          </span>
        </div>
      ) : (
        <p style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center' }}>
          Puedes saltar este paso y agregar cuentas después
        </p>
      )}
    </div>
  )
}

/* ─── Step 3 — Goal ──────────────────────────────── */
function Step3({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  const total = data.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const goal  = Number(data.goalAmount) || 0
  const pct   = goal > 0 ? Math.min(100, (total / goal) * 100) : 0

  return (
    <div>
      <h2 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        Tu primera meta
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
        Define un objetivo financiero para medir tu progreso. Puedes saltarlo si prefieres.
      </p>

      {/* Goal icon grid — larger */}
      <div style={{ marginBottom: '20px' }}>
        <Label>¿Qué quieres lograr?</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {GOAL_PRESETS.map(p => (
            <button
              key={p.icon}
              type="button"
              onClick={() => set({ goalIcon: p.icon, goalName: data.goalName || p.label })}
              style={{
                padding: '12px 8px', borderRadius: '12px', fontSize: '12px',
                border: data.goalIcon === p.icon ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.07)',
                backgroundColor: data.goalIcon === p.icon ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                color: data.goalIcon === p.icon ? '#D4AF37' : '#9ca3af',
                cursor: 'pointer', transition: 'all 150ms ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}
            >
              <span style={{ fontSize: '26px' }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <Label>Nombre de la meta</Label>
        <StyledInput
          value={data.goalName}
          onChange={v => set({ goalName: v })}
          placeholder="Ej: Fondo de emergencia"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div>
          <Label>Monto objetivo ({data.currency})</Label>
          <StyledInput
            value={data.goalAmount}
            onChange={v => set({ goalAmount: v.replace(/[^0-9.]/g, '') })}
            placeholder={data.currency === 'COP' ? '50000000' : '10000'}
          />
        </div>
        <div>
          <Label>Fecha objetivo (opcional)</Label>
          <StyledInput
            type="date" value={data.goalDate}
            onChange={v => set({ goalDate: v })}
          />
        </div>
      </div>

      {/* Progress preview */}
      {goal > 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: '12px',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Progreso actual</span>
            <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{pct.toFixed(1)}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#1e2535', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              width: `${pct}%`, transition: 'width 600ms ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>
              {total > 0 ? fmtAmt(total, data.currency) : 'Sin saldo inicial'}
            </span>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>{fmtAmt(goal, data.currency)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Done screen ────────────────────────────────── */
function StepDone({ name, data, countdown }: { name: string; data: WizardData; countdown: number }) {
  const total    = data.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
  const hasGoal  = data.goalName.trim() && Number(data.goalAmount) > 0
  const accCount = data.accounts.length
  const [extractoChoice, setExtractoChoice] = useState<'now' | 'later' | null>(null)

  function handleSubirAhora() {
    try { localStorage.setItem('statement_imported', 'false') } catch {}
    setExtractoChoice('now')
    window.location.href = '/transacciones/importar'
  }

  function handleRecordarDespues() {
    try { localStorage.setItem('remind_statement_upload', 'true') } catch {}
    setExtractoChoice('later')
  }

  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: '52px', marginBottom: '16px', animation: 'pop 0.4s ease-out' }}>🎉</div>
      <h2 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
        ¡Todo listo, <span style={{ color: '#D4AF37' }}>{name}</span>!
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
        Tu plataforma de patrimonio está configurada.
      </p>

      {/* Summary chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
        <div style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span style={{ color: '#10b981', fontSize: '13px' }}>
            {data.currency === 'COP' ? '🇨🇴' : '🇺🇸'} {data.currency}
          </span>
        </div>
        {accCount > 0 && (
          <div style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <span style={{ color: '#818cf8', fontSize: '13px' }}>
              🏦 {accCount} cuenta{accCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {total > 0 && (
          <div style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <span style={{ color: '#D4AF37', fontSize: '13px' }}>
              💰 {fmtAmt(total, data.currency)}
            </span>
          </div>
        )}
        {hasGoal && (
          <div style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span style={{ color: '#f59e0b', fontSize: '13px' }}>
              {data.goalIcon || '🎯'} {data.goalName}
            </span>
          </div>
        )}
      </div>

      {/* ── Extracto prompt ─────────────────────── */}
      {extractoChoice === null && (
        <div style={{
          backgroundColor: '#0d1220', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '14px', padding: '18px 20px', marginBottom: '20px', textAlign: 'left',
        }}>
          <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
            📄 ¿Tienes tu extracto bancario a mano?
          </p>
          <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.65, marginBottom: '14px' }}>
            Sube tu PDF de Bancolombia y WealthHost detectará automáticamente tus gastos,
            ingresos y costos recurrentes.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSubirAhora}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                backgroundColor: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              Subir extracto ahora
            </button>
            <button
              type="button"
              onClick={handleRecordarDespues}
              style={{
                padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                backgroundColor: 'transparent', color: '#6b7280',
                border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
              }}
            >
              Recordarme después
            </button>
          </div>
        </div>
      )}

      {extractoChoice === 'later' && (
        <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '20px' }}>
          👍 Te recordaremos en el dashboard. Puedes importarlo cuando quieras desde{' '}
          <span style={{ color: '#6366f1' }}>Transacciones → Importar</span>.
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#4b5563', fontSize: '13px' }}>
        <div style={{
          width: '32px', height: '32px', border: '2px solid rgba(212,175,55,0.2)',
          borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
        }} />
        Redirigiendo al Dashboard en {countdown}s...
      </div>
    </div>
  )
}

/* ─── Main wizard ────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser]           = useState<User | null>(null)
  const [step, setStep]           = useState<Step>(1)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [data, setData]           = useState<WizardData>({
    currency:   'COP',
    country:    'CO',
    accounts:   [],
    goalName:   '',
    goalAmount: '',
    goalIcon:   '',
    goalDate:   '',
  })

  const set = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }))
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Usuario'

  useEffect(() => {
    createClient().auth.getUser().then(({ data: d }) => {
      if (!d.user) { router.replace('/login'); return }
      setUser(d.user)
    })
  }, [router])

  useEffect(() => {
    if (step !== 'done') return
    if (countdown <= 0) { window.location.href = '/dashboard'; return }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [step, countdown])

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setSaveError(false)

    try {
      await completeOnboarding({ base_currency: data.currency, country: data.country })
    } catch (err) {
      console.error('[onboarding] completeOnboarding failed:', err)
      setSaving(false)
      setSaveError(true)
      return
    }

    try {
      const supabase = createClient()
      for (const acc of data.accounts) {
        const balance = Number(acc.balance)
        if (balance > 0 || acc.name.trim()) {
          await supabase.from('accounts').insert({
            name:            acc.name.trim() || 'Cuenta',
            type:            acc.type === 'broker' ? 'investment' : acc.type === 'other' ? 'other' : acc.type,
            currency:        data.currency,
            current_balance: balance,
          })
        }
      }

      const goalAmount = Number(data.goalAmount)
      if (data.goalName.trim() && goalAmount > 0) {
        await supabase.from('investment_goals').insert({
          name:           data.goalName.trim(),
          target_amount:  goalAmount,
          current_amount: 0,
          icon:           data.goalIcon || '🎯',
          color:          '#D4AF37',
          currency:       data.currency,
          is_featured:    true,
          ...(data.goalDate ? { target_date: data.goalDate } : {}),
        })
      }
    } catch (err) {
      console.error('[onboarding] Non-critical save failed:', err)
    }

    setStep('done')
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '14px' }}>
        Cargando...
      </div>
    )
  }

  return (
    <>
      {step === 'done' && <Confetti />}

      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37, #b8922a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px', color: '#000', boxShadow: '0 4px 16px rgba(212,175,55,0.25)' }}>
            W
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em' }}>
            <span style={{ color: '#D4AF37' }}>Wealth</span>
            <span style={{ color: '#fff' }}>Host</span>
          </span>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#13182a', border: '1px solid rgba(212,175,55,0.1)',
          borderRadius: '20px', padding: '36px 32px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>
          {step !== 'done' && <StepDots current={step as number} />}

          {step === 1     && <Step1 data={data} set={set} name={name} />}
          {step === 2     && <Step2 data={data} set={set} />}
          {step === 3     && <Step3 data={data} set={set} />}
          {step === 'done' && <StepDone name={name} data={data} countdown={countdown} />}

          {/* Navigation */}
          {step !== 'done' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
              {(step as number) > 1 ? (
                <button type="button" onClick={() => setStep(s => (s as number) - 1 as Step)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', padding: '8px 0' }}>
                  ← Anterior
                </button>
              ) : <span />}

              {(step as number) < 3 ? (
                <button type="button" onClick={() => setStep(s => (s as number) + 1 as Step)}
                  disabled={step === 1 && (!data.currency || !data.country)}
                  style={{
                    padding: '11px 28px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                    border: 'none', color: '#0f1117', fontSize: '14px', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                    opacity: (step === 1 && (!data.currency || !data.country)) ? 0.5 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  Continuar →
                </button>
              ) : (
                <button type="button" onClick={handleFinish} disabled={saving}
                  style={{
                    padding: '11px 28px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                    border: 'none', color: '#0f1117', fontSize: '14px', fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Guardando...' : '✓ Comenzar'}
                </button>
              )}
            </div>
          )}

          {saveError && (
            <p style={{ textAlign: 'center', marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>
              No se pudo guardar. Por favor intenta de nuevo.
            </p>
          )}

          {step === 3 && !saving && (
            <p style={{ textAlign: 'center', marginTop: '14px' }}>
              <button type="button" onClick={handleFinish}
                style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                Saltar por ahora
              </button>
            </p>
          )}
        </div>

        {step !== 'done' && (
          <p style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '16px' }}>
            Paso {step as number} de 3
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
      `}</style>
    </>
  )
}
