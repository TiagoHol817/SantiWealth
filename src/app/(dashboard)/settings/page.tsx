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
      <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: '#1a1f2e',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '16px 20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function TogglePill({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ cursor: 'pointer', width: '42px', height: '24px', borderRadius: '12px', backgroundColor: checked ? '#D4AF37' : '#374151', position: 'relative', transition: 'background-color 200ms', flexShrink: 0 }}>
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
          style={{
            padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            border: value === opt.value ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
            backgroundColor: value === opt.value ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
            color: value === opt.value ? '#D4AF37' : '#6b7280',
            cursor: 'pointer', transition: 'all 150ms ease',
          }}
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
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {avatar ? (
              <img src={avatar} alt={name} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(212,175,55,0.3)', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37, #b8922a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f1117', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                {initials}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '17px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} color="#6b7280" />
                <p style={{ color: '#6b7280', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="Detalles de la cuenta">
        {[
          { label: 'Nombre completo', value: name },
          { label: 'Correo electrónico', value: email },
          { label: 'ID de usuario', value: user?.id ? user.id.slice(0, 8) + '...' : '—' },
          { label: 'Cuenta creada', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
        ].map(row => (
          <Card key={row.label} style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>{row.label}</p>
            <p style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{row.value}</p>
          </Card>
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
          <Card><p style={{ color: '#6b7280', fontSize: '13px' }}>No hay proveedores registrados.</p></Card>
        )}
        {providers.map(p => {
          const info = PROVIDER_LABELS[p] ?? { label: p, color: '#6b7280' }
          return (
            <Card key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} color={info.color} />
                <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500 }}>{info.label}</p>
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '5px', fontWeight: 600 }}>
                Conectado
              </span>
            </Card>
          )
        })}
      </Section>

      <Section title="Sesión">
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Cerrar sesión</p>
            <p style={{ color: '#6b7280', fontSize: '12px' }}>Finaliza tu sesión en este dispositivo</p>
          </div>
          <button
            onClick={onSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '9px',
              border: '1px solid rgba(239,68,68,0.3)',
              backgroundColor: 'rgba(239,68,68,0.06)',
              color: '#ef4444', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </Card>
      </Section>

      <Section title="Información de seguridad">
        <Card>
          <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.7 }}>
            Tu cuenta está protegida con autenticación de Supabase con cifrado TLS 1.3.
            Las contraseñas nunca se almacenan en texto plano. Tu sesión expira automáticamente tras períodos de inactividad.
          </p>
        </Card>
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
        <Card>
          <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Moneda de visualización</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>Define en qué moneda se muestran los totales de patrimonio por defecto</p>
          <ChipGroup
            options={[{ value: 'COP', label: '🇨🇴 Pesos (COP)' }, { value: 'USD', label: '🇺🇸 Dólar (USD)' }]}
            value={currency}
            onChange={saveCurrency}
          />
        </Card>
      </Section>

      <Section title="Idioma">
        <Card>
          <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Idioma de la interfaz</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>La app se muestra actualmente en español. El soporte multiidioma está en desarrollo.</p>
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
        </Card>
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
          {DENSITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update({ ui_density: opt.value })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: '10px', textAlign: 'left',
                border: settings.ui_density === opt.value ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.06)',
                backgroundColor: settings.ui_density === opt.value ? 'rgba(212,175,55,0.07)' : '#1a1f2e',
                cursor: 'pointer', transition: 'all 150ms ease',
              }}
            >
              <div>
                <p style={{ color: settings.ui_density === opt.value ? '#D4AF37' : '#e5e7eb', fontWeight: 600, fontSize: '14px', margin: 0 }}>{opt.label}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>{opt.hint}</p>
              </div>
              {settings.ui_density === opt.value && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4AF37' }} />
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Panel de balance">
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>Variación diaria</p>
            <p style={{ color: '#6b7280', fontSize: '12px' }}>Muestra el cambio patrimonial vs ayer en el dashboard</p>
          </div>
          <TogglePill
            checked={settings.show_daily_gains}
            onChange={() => update({ show_daily_gains: !settings.show_daily_gains })}
          />
        </Card>
      </Section>

      <Section title="Acento de color">
        <Card>
          <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Color de marca</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '14px' }}>Define el color de énfasis de la interfaz</p>
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
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '10px' }}>Más opciones de acento disponibles próximamente.</p>
        </Card>
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
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Configuración
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Gestiona tu cuenta, seguridad y preferencias de la plataforma</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Tab list — left sidebar */}
        <nav style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '10px', padding: '10px 14px', borderRadius: '10px', width: '100%',
                border: 'none', textAlign: 'left', cursor: 'pointer', transition: 'all 150ms ease',
                backgroundColor: activeTab === tab.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#D4AF37' : '#6b7280',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
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
