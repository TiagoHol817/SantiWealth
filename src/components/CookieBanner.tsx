'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Cookie, Settings2 } from 'lucide-react'

const CONSENT_KEY = 'wh_cookie_consent'

type ConsentValue = 'accepted' | 'essential'

interface ConsentState {
  functional: boolean
}

export default function CookieBanner() {
  const [visible, setVisible]   = useState(false)
  const [animate, setAnimate]   = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [prefs, setPrefs]       = useState<ConsentState>({ functional: true })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (!stored) {
        // Slight delay so banner doesn't flash on hydration
        setTimeout(() => { setVisible(true); setTimeout(() => setAnimate(true), 50) }, 600)
      }
    } catch {}
  }, [])

  function dismiss(value: ConsentValue) {
    try { localStorage.setItem(CONSENT_KEY, value) } catch {}
    setAnimate(false)
    setTimeout(() => setVisible(false), 350)
  }

  function acceptAll() { dismiss('accepted') }

  function saveConfig() {
    dismiss(prefs.functional ? 'accepted' : 'essential')
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        padding: '16px',
        transform: animate ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '780px',
          margin: '0 auto',
          backgroundColor: '#13182a',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '16px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Main row */}
        <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Icon */}
          <div style={{
            flexShrink: 0, width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.06) 100%)',
            border: '1px solid rgba(212,175,55,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cookie size={17} color="#D4AF37" />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
              Tu privacidad, tu control
            </p>
            <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6 }}>
              Utilizamos cookies esenciales para el funcionamiento de la app y cookies funcionales para recordar tus preferencias.{' '}
              <Link href="/cookies" style={{ color: '#D4AF37', textDecoration: 'none' }}>
                Política de cookies
              </Link>
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setShowConfig(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '8px 14px', borderRadius: '9px',
                border: '1px solid rgba(212,175,55,0.2)',
                backgroundColor: 'transparent',
                color: '#9ca3af', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 150ms ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'; (e.currentTarget as HTMLElement).style.color = '#D4AF37' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.2)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af' }}
            >
              <Settings2 size={13} />
              Configurar
            </button>
            <button
              onClick={acceptAll}
              style={{
                padding: '8px 18px', borderRadius: '9px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                border: 'none',
                color: '#0f1117', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', transition: 'box-shadow 150ms ease',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 12px rgba(212,175,55,0.2)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(212,175,55,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(212,175,55,0.2)' }}
            >
              Aceptar todo
            </button>
            <button
              onClick={() => dismiss('essential')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Solo esenciales"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px 20px' }}>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '14px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
              Gestión de preferencias
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Essential — always on */}
              <ConsentRow
                label="Cookies esenciales"
                description="Necesarias para la autenticación y seguridad de la sesión. No se pueden desactivar."
                checked={true}
                locked={true}
                onChange={() => {}}
              />
              {/* Functional */}
              <ConsentRow
                label="Cookies funcionales"
                description="Recuerdan tus preferencias de interfaz (menú, densidad, tema). Mejoran tu experiencia."
                checked={prefs.functional}
                locked={false}
                onChange={v => setPrefs(p => ({ ...p, functional: v }))}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={saveConfig}
                style={{
                  padding: '9px 22px', borderRadius: '9px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                  border: 'none', color: '#0f1117',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(212,175,55,0.2)',
                }}
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConsentRow({
  label, description, checked, locked, onChange,
}: {
  label: string
  description: string
  checked: boolean
  locked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      padding: '12px 16px', borderRadius: '10px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{label}</p>
        <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.5 }}>{description}</p>
      </div>
      <div
        onClick={() => { if (!locked) onChange(!checked) }}
        style={{
          flexShrink: 0, width: '42px', height: '24px', borderRadius: '12px',
          backgroundColor: checked ? '#D4AF37' : '#374151',
          position: 'relative',
          transition: 'background-color 200ms ease',
          cursor: locked ? 'not-allowed' : 'pointer',
          opacity: locked ? 0.6 : 1,
          marginTop: '2px',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px',
          left: checked ? '21px' : '3px',
          width: '18px', height: '18px', borderRadius: '50%',
          backgroundColor: '#fff',
          transition: 'left 200ms ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )
}
