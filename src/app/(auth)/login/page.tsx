'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WealtHostBrand from '@/components/WealtHostBrand'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M14.045 9.578c-.02-2.055 1.677-3.047 1.753-3.094--.955-1.397-2.44-1.588-2.97-1.61-1.264-.128-2.47.748-3.11.748-.637 0-1.617-.731-2.663-.712-1.369.02-2.633.8-3.337 2.031-1.42 2.47-.364 6.133 1.022 8.141.675.979 1.478 2.077 2.534 2.037 1.019-.041 1.404-.658 2.637-.658 1.233 0 1.578.658 2.663.637 1.095-.02 1.786-.993 2.453-1.977a9.7 9.7 0 0 0 1.117-2.285c-.025-.011-2.136-.82-2.158-3.258h.059zM11.957 3.44C12.497 2.779 12.86 1.865 12.76.93c-.795.033-1.755.53-2.323 1.19-.51.585-.958 1.525-.838 2.42.886.068 1.793-.45 2.358-1.1z"/>
    </svg>
  )
}

const LANG_OPTIONS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [lang, setLang]             = useState<'es' | 'en'>('es')
  const [showLang, setShowLang]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isValidEmail(email)) {
      setEmailError('Ingresa un correo electrónico válido')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const msg = authError.message.includes('Invalid login credentials')
        ? 'Correo o contraseña incorrectos. Verifica tus datos.'
        : authError.message
      setError(msg)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleOAuth(provider: 'google' | 'apple') {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-4 py-8"
      style={{
        backgroundColor: '#0f1117',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 75% 5%, rgba(212,175,55,0.07) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 50% at 20% 90%, rgba(99,102,241,0.04) 0%, transparent 55%)',
          'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 28px 28px',
      }}
    >
      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
        <div
          className="w-full"
          style={{
            backgroundColor: '#13182a',
            border: '1px solid rgba(212,175,55,0.1)',
            borderRadius: '20px',
            padding: '40px 36px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(212,175,55,0.04)',
          }}
        >
          {/* Branding */}
          <div className="text-center" style={{ marginBottom: '32px' }}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div
                className="flex items-center justify-center font-black text-xl"
                style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                  color: '#000', flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(212,175,55,0.25)',
                }}
              >
                W
              </div>
              <WealtHostBrand size="xl" />
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', letterSpacing: '0.01em' }}>
              Plataforma de gestión de patrimonio
            </p>
          </div>

          {/* Server error banner */}
          {error && (
            <div
              className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
            >
              <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '7px' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(null) }}
                onBlur={() => { if (email && !isValidEmail(email)) setEmailError('Ingresa un correo electrónico válido') }}
                placeholder="tu@correo.com"
                className="w-full text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-200"
                style={{
                  backgroundColor: '#0d1220',
                  border: `1px solid ${emailError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '10px',
                  padding: '11px 14px',
                  boxShadow: emailError ? '0 0 0 3px rgba(239,68,68,0.08)' : undefined,
                }}
                onFocus={e => { if (!emailError) e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.07)' }}
                onBlurCapture={e => { if (!emailError) { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' } }}
              />
              {emailError && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '7px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-200"
                  style={{
                    backgroundColor: '#0d1220',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    padding: '11px 42px 11px 14px',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.07)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[#D4AF37]"
                  style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Link
                href="/login/reset"
                className="text-xs transition-colors hover:text-[#e5c84d]"
                style={{ color: '#D4AF37', textDecoration: 'none' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-semibold transition-all duration-200 disabled:opacity-60"
              style={{
                background: loading ? '#b8922a' : 'linear-gradient(135deg, #D4AF37 0%, #c49b28 50%, #b8922a 100%)',
                color: '#0f1117',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(212,175,55,0.2)',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(212,175,55,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(212,175,55,0.2)' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.2)',
                      borderTopColor: '#000', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Ingresando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>o continúa con</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Social buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200"
              style={{
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid rgba(212,175,55,0.2)',
                backgroundColor: 'transparent',
                color: '#D4AF37',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212,175,55,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.2)' }}
            >
              <GoogleIcon />
              Continuar con Google
            </button>
            <button
              onClick={() => handleOAuth('apple')}
              className="w-full flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200"
              style={{
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid rgba(212,175,55,0.2)',
                backgroundColor: 'transparent',
                color: '#D4AF37',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212,175,55,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.2)' }}
            >
              <AppleIcon />
              Continuar con Apple
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ width: '100%', maxWidth: '440px', marginTop: '24px' }}>
        {/* Language selector */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLang(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', padding: '6px 12px',
                color: '#6b7280', fontSize: '12px', cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'; (e.currentTarget as HTMLElement).style.color = '#D4AF37' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#6b7280' }}
            >
              <Globe size={13} />
              {lang === 'es' ? 'Español' : 'English'}
              <span style={{ fontSize: '9px' }}>▼</span>
            </button>
            {showLang && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLang(false)} />
                <div
                  style={{
                    position: 'absolute', bottom: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginBottom: '6px',
                    backgroundColor: '#1a1f2e', border: '1px solid rgba(212,175,55,0.15)',
                    borderRadius: '10px', overflow: 'hidden', zIndex: 20,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    minWidth: '120px',
                  }}
                >
                  {LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => { setLang(opt.code as 'es' | 'en'); setShowLang(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none', border: 'none',
                        color: lang === opt.code ? '#D4AF37' : '#9ca3af',
                        fontSize: '13px', cursor: 'pointer',
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(212,175,55,0.06)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legal links */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { href: '/cookies', label: 'Cookies' },
            { href: '/terms', label: 'Términos de servicio' },
            { href: '/privacy', label: 'Política de privacidad' },
          ].map((link, i) => (
            <React.Fragment key={link.href}>
              {i > 0 && <span style={{ color: '#2a3040', fontSize: '11px' }}>·</span>}
              <Link
                href={link.href}
                className="text-xs transition-colors"
                style={{ color: '#4b5563', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#D4AF37' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4b5563' }}
              >
                {link.label}
              </Link>
            </React.Fragment>
          ))}
        </div>
        <p style={{ color: '#1f2937', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
          © {new Date().getFullYear()} WealtHost. Todos los derechos reservados.
        </p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
