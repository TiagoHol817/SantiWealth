'use client'

import { X } from 'lucide-react'
import { useSettings, type Density } from '@/context/SettingsContext'

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: 'compacta', label: 'Compacta', hint: 'Más contenido visible' },
  { value: 'normal',   label: 'Normal',   hint: 'Espaciado balanceado' },
  { value: 'amplia',   label: 'Amplia',   hint: 'Mayor respiración' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TweaksPanel({ isOpen, onClose }: Props) {
  const { settings, update } = useSettings()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '300px',
          zIndex: 50,
          backgroundColor: '#1a1f2e',
          borderLeft: '1px solid var(--wh-border, #2a3040)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--wh-border, #2a3040)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '15px', margin: 0 }}>Tweaks</p>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>Personaliza tu experiencia</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* Densidad UI */}
          <section>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Densidad de UI
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DENSITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ ui_density: opt.value })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: settings.ui_density === opt.value
                      ? '1px solid #D4AF37'
                      : '1px solid var(--wh-border, #2a3040)',
                    background: settings.ui_density === opt.value
                      ? 'rgba(212, 175, 55, 0.08)'
                      : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div>
                    <p style={{ color: settings.ui_density === opt.value ? '#D4AF37' : '#e5e7eb', fontWeight: 500, fontSize: '13px', margin: 0 }}>
                      {opt.label}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '11px', margin: '2px 0 0' }}>{opt.hint}</p>
                  </div>
                  {settings.ui_density === opt.value && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4AF37', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Ganancia Diaria */}
          <section>
            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
              Panel de Balance
            </p>
            <button
              onClick={() => update({ show_daily_gains: !settings.show_daily_gains })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--wh-border, #2a3040)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                width: '100%',
                transition: 'border-color 150ms ease',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: '#e5e7eb', fontWeight: 500, fontSize: '13px', margin: 0 }}>Variación diaria</p>
                <p style={{ color: '#6b7280', fontSize: '11px', margin: '2px 0 0' }}>Muestra cambio vs ayer</p>
              </div>
              {/* Toggle pill */}
              <div
                style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: settings.show_daily_gains ? '#D4AF37' : '#374151',
                  position: 'relative',
                  transition: 'background-color 200ms ease',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: settings.show_daily_gains ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    transition: 'left 200ms ease',
                  }}
                />
              </div>
            </button>
          </section>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--wh-border, #2a3040)' }}>
          <p style={{ color: '#4b5563', fontSize: '11px', textAlign: 'center', margin: 0 }}>
            Los cambios se guardan automáticamente
          </p>
        </div>
      </div>
    </>
  )
}
