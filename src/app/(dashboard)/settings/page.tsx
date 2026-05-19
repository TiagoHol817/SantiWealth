'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, ShieldCheck, Globe, Palette,
  LogOut, CheckCircle2, Mail, ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSettings, type Density } from '@/context/SettingsContext'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/* ─── Types ─────────────────────────────────────── */
type Tab = 'cuenta' | 'seguridad' | 'preferencias' | 'apariencia'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'cuenta',       label: 'Cuenta',       icon: <User size={15} /> },
  { id: 'seguridad',    label: 'Seguridad',    icon: <ShieldCheck size={15} /> },
  { id: 'preferencias', label: 'Preferencias', icon: <Globe size={15} /> },
  { id: 'apariencia',   label: 'Apariencia',   icon: <Palette size={15} /> },
]

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: 'compacta', label: 'Compacta', hint: 'Más contenido por pantalla' },
  { value: 'normal',   label: 'Normal',   hint: 'Espaciado balanceado' },
  { value: 'amplia',   label: 'Amplia',   hint: 'Mayor respiración visual' },
]

/* ─── Helpers ────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <p className="text-muted" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  )
}

function CardRow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding: '16px 20px', ...style }}>
      {children}
    </div>
  )
}

function TogglePill({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={checked ? 'toggle-on' : 'toggle-off'}
      style={{ cursor: 'pointer', width: '42px', height: '24px', borderRadius: '12px', position: 'relative', transition: 'background-color 200ms', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )
}

function ChipGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`chart-tab${value === opt.value ? ' chart-tab-active' : ''}`}
          style={{ padding: '7px 18px' }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Tab content components ─────────────────────── */
function TabCuenta({ user }: { user: SupabaseUser | null }) {
  const meta    = user?.user_metadata ?? {}
  const name    = meta.full_name ?? meta.name ?? user?.email?.split('@')[0] ?? 'Usuario'
  const email   = user?.email ?? '—'
  const avatar  = meta.avatar_url ?? meta.picture ?? null
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      <Section title="Perfil">
        <CardRow>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {avatar ? (
              <img src={avatar} alt={name} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                {initials}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-white" style={{ fontWeight: 700, fontSize: '17px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} className="text-muted" />
                <p className="text-muted" style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            </div>
          </div>
        </CardRow>
      </Section>

      <Section title="Detalles de la cuenta">
        {[
          { label: 'Nombre completo', value: name },
          { label: 'Correo electrónico', value: email },
          { label: 'ID de usuario', value: user?.id ? user.id.slice(0, 8) + '...' : '—' },
          { label: 'Cuenta creada', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
        ].map(row => (
          <CardRow key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
            <p className="text-muted" style={{ fontSize: '13px' }}>{row.label}</p>
            <p className="text-white" style={{ fontSize: '13px', fontWeight: 500 }}>{row.value}</p>
          </CardRow>
        ))}
      </Section>
    </>
  )
}

function TabSeguridad({ user, onSignOut }: { user: SupabaseUser | null; onSignOut: () => void }) {
  const providers: string[] = user?.app_metadata?.providers ?? (user?.app_metadata?.provider ? [user.app_metadata.provider] : [])

  const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
    google: { label: 'Google', color: '#4285F4' },
    apple:  { label: 'Apple',  color: '#e5e7eb' },
    email:  { label: 'Email / Contraseña', color: '#10b981' },
  }

  return (
    <>
      <Section title="Métodos de inicio de sesión">
        {providers.length === 0 && (
          <CardRow><p className="text-muted" style={{ fontSize: '13px' }}>No hay proveedores registrados.</p></CardRow>
        )}
        {providers.map(p => {
          const info = PROVIDER_LABELS[p] ?? { label: p, color: '#6b7280' }
          return (
            <div key={p} className="card card-blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} color={info.color} />
                <p className="text-white" style={{ fontSize: '14px', fontWeight: 500 }}>{info.label}</p>
              </div>
              <span className="badge badge-green">Conectado</span>
            </div>
          )
        })}
      </Section>

      <Section title="Sesión">
        <CardRow style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="text-white" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Cerrar sesión</p>
            <p className="text-muted" style={{ fontSize: '12px' }}>Finaliza tu sesión en este dispositivo</p>
          </div>
          <button
            onClick={onSignOut}
            className="btn-secondary flex items-center gap-2"
            style={{
              padding: '8px 16px',
              border: '1px solid rgba(239,68,68,0.3)',
              backgroundColor: 'rgba(239,68,68,0.06)',
              color: '#ef4444',
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </CardRow>
      </Section>

      <Section title="Información de seguridad">
        <CardRow>
          <p className="text-muted" style={{ fontSize: '13px', lineHeight: 1.7 }}>
            Tu cuenta está protegida con autenticación de Supabase con cifrado TLS 1.3.
            Las contraseñas nunca se almacenan en texto plano. Tu sesión expira automáticamente tras períodos de inactividad.
          </p>
        </CardRow>
      </Section>
    </>
  )
}

function TabPreferencias() {
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP')
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  useEffect(() => {
    try {
      const c = localStorage.getItem('wh_currency') as 'COP' | 'USD' | null
      const l = localStorage.getItem('wh_language') as 'es' | 'en' | null
      if (c) setCurrency(c)
      if (l) setLanguage(l)
    } catch {}
  }, [])

  const saveCurrency = (v: 'COP' | 'USD') => {
    setCurrency(v)
    try { localStorage.setItem('wh_currency', v) } catch {}
  }
  const saveLanguage = (v: 'es' | 'en') => {
    setLanguage(v)
    try { localStorage.setItem('wh_language', v) } catch {}
  }

  return (
    <>
      <Section title="Moneda principal">
        <CardRow>
          <p className="text-white" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Moneda de visualización</p>
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '14px' }}>Define en qué moneda se muestran los totales de patrimonio por defecto</p>
          <ChipGroup
            options={[{ value: 'COP', label: '🇨🇴 Pesos (COP)' }, { value: 'USD', label: '🇺🇸 Dólar (USD)' }]}
            value={currency}
            onChange={saveCurrency}
          />
        </CardRow>
      </Section>

      <Section title="Idioma">
        <CardRow>
          <p className="text-white" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Idioma de la interfaz</p>
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '14px' }}>La app se muestra actualmente en español. El soporte multiidioma está en desarrollo.</p>
          <ChipGroup
            options={[{ value: 'es', label: '🇨🇴 Español' }, { value: 'en', label: '🇺🇸 English' }]}
            value={language}
            onChange={saveLanguage}
          />
          {language === 'en' && (
            <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⚠ Inglés próximamente disponible. Los textos de la app seguirán en español.
            </p>
          )}
        </CardRow>
      </Section>
    </>
  )
}

function TabApariencia() {
  const { settings, update } = useSettings()

  return (
    <>
      <Section title="Densidad de interfaz">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DENSITY_OPTIONS.map(opt => {
            const isActive = settings.ui_density === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => update({ ui_density: opt.value })}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px', textAlign: 'left',
                  border: isActive ? '1px solid rgba(99,102,241,0.35)' : undefined,
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                <div>
                  <p className={isActive ? 'accent-primary' : 'text-white'} style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{opt.label}</p>
                  <p className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>{opt.hint}</p>
                </div>
                {isActive && (
                  <div className="toggle-on" style={{ width: '8px', height: '8px', borderRadius: '50%' }} />
                )}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Panel de balance">
        <CardRow style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="text-white" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Variación diaria</p>
            <p className="text-muted" style={{ fontSize: '12px' }}>Muestra el cambio patrimonial vs ayer en el dashboard</p>
          </div>
          <TogglePill
            checked={settings.show_daily_gains}
            onChange={() => update({ show_daily_gains: !settings.show_daily_gains })}
          />
        </CardRow>
      </Section>

      <Section title="Acento de color">
        <CardRow>
          <p className="text-white" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Color de marca</p>
          <p className="text-muted" style={{ fontSize: '12px', marginBottom: '14px' }}>Define el color de énfasis de la interfaz</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div
              title="Luxury Gold"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #D4AF37, #b8922a)',
                border: '3px solid #D4AF37',
                boxShadow: '0 0 0 3px rgba(212,175,55,0.3)',
                cursor: 'pointer',
              }}
            />
          </div>
          <p className="text-muted" style={{ fontSize: '11px', marginTop: '10px' }}>Más opciones de acento disponibles próximamente.</p>
        </CardRow>
      </Section>
    </>
  )
}

/* ─── Main page ──────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('cuenta')
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const handleSignOut = useCallback(async () => {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }, [router])

  const TAB_CONTENT: Record<Tab, React.ReactNode> = {
    cuenta:       <TabCuenta user={user} />,
    seguridad:    <TabSeguridad user={user} onSignOut={handleSignOut} />,
    preferencias: <TabPreferencias />,
    apariencia:   <TabApariencia />,
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }} className="pb-8">
      {/* Page header */}
      <div className="page-enter" style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Gestiona tu cuenta, seguridad y preferencias de la plataforma</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Tab list — left sidebar */}
        <nav style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'chart-tab chart-tab-active' : 'chart-tab'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '10px', width: '100%', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {tab.icon}
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{tab.label}</span>
              </div>
              {activeTab === tab.id && <ChevronRight size={13} />}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  )
}
