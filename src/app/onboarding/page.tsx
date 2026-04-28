'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { completeOnboarding } from './actions'
import type { User } from '@supabase/supabase-js'

/* ─── Types ─────────────────────────────────────── */
type Currency = 'COP' | 'USD'
type Step = 1 | 2 | 3 | 'done'

interface WizardData {
  currency:     Currency
  country:      string
  initialBank:  string
  goalName:     string
  goalAmount:   string
  goalIcon:     string
  goalDate:     string
}

const GOAL_PRESETS = [
  { icon: '🏠', label: 'Propiedad' },
  { icon: '🚗', label: 'Vehículo' },
  { icon: '🎓', label: 'Educación' },
  { icon: '✈️', label: 'Viajes' },
  { icon: '💰', label: 'Inversiones' },
  { icon: '🎯', label: 'Personalizado' },
]

const COUNTRY_OPTIONS = [
  { value: 'CO', label: '🇨🇴 Colombia' },
  { value: 'US', label: '🇺🇸 Estados Unidos' },
  { value: 'MX', label: '🇲🇽 México' },
  { value: 'ES', label: '🇪🇸 España' },
  { value: 'AR', label: '🇦🇷 Argentina' },
  { value: 'OTHER', label: '🌍 Otro' },
]

/* ─── Small helpers ──────────────────────────────── */
function fmtCurrency(val: string, currency: Currency) {
  const n = Number(val.replace(/\D/g, ''))
  if (!n) return ''
  return currency === 'COP'
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function StepDots({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: i === current ? '28px' : '8px',
          height: '8px',
          borderRadius: '4px',
          backgroundColor: i === current ? '#D4AF37' : i < current ? '#D4AF3760' : '#2a3040',
          transition: 'all 300ms ease',
        }} />
      ))}
    </div>
  )
}

function ChipBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
        border: active ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
        backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
        color: active ? '#D4AF37' : '#9ca3af',
        cursor: 'pointer', transition: 'all 150ms ease',
      }}
    >
      {children}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>{children}</p>
}

function StyledInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: '10px',
        backgroundColor: '#0d1220', border: '1px solid rgba(255,255,255,0.07)',
        color: '#e5e7eb', fontSize: '14px', outline: 'none',
        boxSizing: 'border-box',
      }}
      onFocus={e => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.07)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

/* ─── Step components ────────────────────────────── */
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

function Step2({
  data, set, zeroSelected, setZeroSelected,
}: {
  data: WizardData
  set: (p: Partial<WizardData>) => void
  zeroSelected: boolean
  setZeroSelected: (v: boolean) => void
}) {
  return (
    <div>
      <h2 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        Tu punto de partida
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
        ¿Cuánto tienes en cuentas bancarias y efectivo hoy? Esto define tu línea de partida.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <Label>Saldo inicial en bancos / efectivo ({data.currency})</Label>
        <StyledInput
          value={data.initialBank}
          onChange={v => {
            const cleaned = v.replace(/[^0-9.]/g, '')
            set({ initialBank: cleaned })
            if (cleaned) setZeroSelected(false)
          }}
          placeholder={data.currency === 'COP' ? '5,000,000' : '2,000'}
          type="text"
        />
        {data.initialBank && Number(data.initialBank) > 0 && (
          <p style={{ color: '#D4AF37', fontSize: '12px', marginTop: '6px' }}>
            ≈ {fmtCurrency(data.initialBank, data.currency)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => { set({ initialBank: '0' }); setZeroSelected(true) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: zeroSelected ? '#D4AF37' : '#6b7280', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '6px', padding: 0,
          transition: 'color 150ms ease',
        }}
      >
        <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${zeroSelected ? '#D4AF37' : '#4b5563'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {zeroSelected && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4AF37', display: 'block' }} />}
        </span>
        Prefiero empezar desde cero
      </button>
    </div>
  )
}

function Step3({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <h2 style={{ color: '#e5e7eb', fontSize: '22px', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.02em' }}>
        Tu primera meta
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
        Define un objetivo financiero para empezar a medir tu progreso. Puedes saltarlo si prefieres.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <Label>¿Qué quieres lograr?</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {GOAL_PRESETS.map(p => (
            <button
              key={p.icon}
              type="button"
              onClick={() => set({ goalIcon: p.icon, goalName: data.goalName || p.label })}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '13px',
                border: data.goalIcon === p.icon ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.07)',
                backgroundColor: data.goalIcon === p.icon ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                color: data.goalIcon === p.icon ? '#D4AF37' : '#9ca3af',
                cursor: 'pointer', transition: 'all 150ms ease',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {p.icon} {p.label}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <Label>Monto objetivo ({data.currency})</Label>
          <StyledInput
            value={data.goalAmount}
            onChange={v => set({ goalAmount: v.replace(/[^0-9.]/g, '') })}
            placeholder={data.currency === 'COP' ? '50,000,000' : '10,000'}
          />
          {data.goalAmount && Number(data.goalAmount) > 0 && (
            <p style={{ color: '#D4AF37', fontSize: '12px', marginTop: '6px' }}>
              ≈ {fmtCurrency(data.goalAmount, data.currency)}
            </p>
          )}
        </div>
        <div>
          <Label>Fecha objetivo (opcional)</Label>
          <StyledInput
            type="date"
            value={data.goalDate}
            onChange={v => set({ goalDate: v })}
          />
        </div>
      </div>
    </div>
  )
}

function StepDone({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '56px', marginBottom: '20px', animation: 'pop 0.4s ease-out' }}>🎉</div>
      <h2 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>
        ¡Todo listo, <span style={{ color: '#D4AF37' }}>{name}</span>!
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>
        Tu plataforma de patrimonio está configurada.<br />
        Redirigiendo al Dashboard...
      </p>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.2)',
          borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    </div>
  )
}

/* ─── Main wizard ────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser]         = useState<User | null>(null)
  const [step, setStep]         = useState<Step>(1)
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [zeroSelected, setZeroSelected] = useState(false)
  const [data, setData]       = useState<WizardData>({
    currency:    'COP',
    country:     'CO',
    initialBank: '',
    goalName:    '',
    goalAmount:  '',
    goalIcon:    '',
    goalDate:    '',
  })

  const set = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }))

  const name = user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? user?.email?.split('@')[0]
    ?? 'Usuario'

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUser(data.user)
    })
  }, [router])

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setSaveError(false)

    // 1 — Mark onboarding done — CRITICAL: must succeed before redirect
    try {
      await completeOnboarding({ base_currency: data.currency, country: data.country })
    } catch (err) {
      console.error('[onboarding] completeOnboarding failed:', err)
      setSaving(false)
      setSaveError(true)
      return // Do NOT redirect — loop prevention
    }

    // 2 — Non-critical inserts: account + goal. Failures here don't block the user.
    try {
      const supabase = createClient()
      const initialBalance = Number(data.initialBank)
      if (initialBalance > 0) {
        await supabase.from('accounts').insert({
          name:            'Cuenta principal',
          type:            'bank',
          currency:        data.currency,
          current_balance: initialBalance,
        })
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
      console.error('[onboarding] Non-critical save failed (account/goal):', err)
      // Intentional: don't block — user can add accounts and goals later
    }

    // 3 — Success: show done screen then hard-navigate (forces layout server re-run)
    setStep('done')
    setTimeout(() => { window.location.href = '/dashboard' }, 2200)
  }

  const canContinueStep1 = !!data.currency && !!data.country
  const canContinueStep2 = true // always (balance is optional)
  const canFinish = true // goal is optional

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '14px' }}>
        Cargando...
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
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
        backgroundColor: '#13182a',
        border: '1px solid rgba(212,175,55,0.1)',
        borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {step !== 'done' && <StepDots current={step as number} />}

        {/* Step content */}
        <div>
          {step === 1 && <Step1 data={data} set={set} name={name} />}
          {step === 2 && <Step2 data={data} set={set} zeroSelected={zeroSelected} setZeroSelected={setZeroSelected} />}
          {step === 3 && <Step3 data={data} set={set} />}
          {step === 'done' && <StepDone name={name} />}
        </div>

        {/* Navigation */}
        {step !== 'done' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s as number) - 1 as Step)}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', padding: '8px 0' }}
              >
                ← Anterior
              </button>
            ) : <span />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s as number) + 1 as Step)}
                disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
                style={{
                  padding: '11px 28px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                  border: 'none', color: '#0f1117', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                  opacity: (step === 1 && !canContinueStep1) ? 0.5 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                Continuar →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
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

        {/* Save error */}
        {saveError && (
          <p style={{ textAlign: 'center', marginTop: '12px', color: '#ef4444', fontSize: '13px' }}>
            No se pudo guardar. Por favor intenta de nuevo.
          </p>
        )}

        {/* Skip link for step 3 */}
        {step === 3 && !saving && (
          <p style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleFinish}
              style={{ background: 'none', border: 'none', color: '#4b5563', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Saltar por ahora
            </button>
          </p>
        )}
      </div>

      {/* Step label */}
      {step !== 'done' && (
        <p style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '16px' }}>
          Paso {step as number} de 3
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  )
}
