'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WealtHostBrand from '@/components/WealtHostBrand'
import { sanitizeText } from '@/lib/sanitize'

// ── Icons ────────────────────────────────────────────────────────────────────
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

// ── Password strength ────────────────────────────────────────────────────────
interface PasswordRule {
  label: string
  test: (v: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
  { label: 'Al menos 1 mayúscula', test: v => /[A-Z]/.test(v) },
  { label: 'Al menos 1 número',    test: v => /[0-9]/.test(v) },
]

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  const colors = ['#ef4444', '#f59e0b', '#00d4aa']
  const color  = colors[Math.min(passed - 1, 2)] ?? '#ef4444'

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: '3px', borderRadius: '2px',
              backgroundColor: i < passed ? color : 'rgba(255,255,255,0.08)',
              transition: 'background-color 250ms ease',
            }}
          />
        ))}
      </div>
      {/* Rules */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {PASSWORD_RULES.map(rule => {
          const ok = rule.test(password)
          return (
            <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: ok ? '#00d4aa' : '#4b5563', lineHeight: 1 }}>
                {ok ? '✓' : '○'}
              </span>
              <span style={{ fontSize: '11px', color: ok ? '#9ca3af' : '#4b5563' }}>
                {rule.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isStrongPassword(v: string) {
  return PASSWORD_RULES.every(r => r.test(v))
}

// ── Component ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [emailError, setEmailError]     = useState<string | null>(null)
  const [passError, setPassError]       = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [serverError, setServerError]   = useState<string | null>(null)

  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  // ── Validate on blur ───────────────────────────────────────────────────────
  function validateEmail() {
    if (email && !isValidEmail(email)) {
      setEmailError('Ingresa un correo electrónico válido')
    } else {
      setEmailError(null)
    }
  }

  function validatePassword() {
    if (password && !isStrongPassword(password)) {
      setPassError('La contraseña no cumple los requisitos')
    } else {
      setPassError(null)
    }
  }

  function validateConfirm() {
    if (confirm && confirm !== password) {
      setConfirmError('Las contraseñas no coinciden')
    } else {
      setConfirmError(null)
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    // Full validation pass
    const emailOk   = isValidEmail(email)
    const passOk    = isStrongPassword(password)
    const confirmOk = password === confirm

    if (!emailOk)   { setEmailError('Ingresa un correo electrónico válido'); return }
    if (!passOk)    { setPassError('La contraseña no cumple los requisitos'); return }
    if (!confirmOk) { setConfirmError('Las contraseñas no coinciden'); return }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email:    sanitizeText(email, 200),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setServerError('Ya existe una cuenta con ese correo. ¿Olvidaste tu contraseña?')
      } else {
        setServerError('No se pudo crear la cuenta. Intenta de nuevo.')
      }
      return
    }

    setSuccess(true)
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  async function handleGoogle() {
    const supabase = createClient()
    const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  // ── Input focus style helpers ──────────────────────────────────────────────
  const onFocus = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) {
      e.target.style.borderColor = 'rgba(212,175,55,0.5)'
      e.target.style.boxShadow   = '0 0 0 3px rgba(212,175,55,0.07)'
    }
  }
  const onBlurStyle = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) {
      e.target.style.borderColor = 'rgba(255,255,255,0.07)'
      e.target.style.boxShadow   = 'none'
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-between px-4 py-8 overflow-hidden"
      style={{
        backgroundColor: '#0f1117',
        backgroundImage: [
          'radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '28px 28px',
      }}
    >
      {/* Atmospheric blobs */}
      <div className="blob-green" style={{ top: '-100px', left: '-100px', opacity: 0.6 }} />
      <div className="blob-gold" style={{ bottom: '-80px', right: '-60px', opacity: 0.7 }} />
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
          <div className="text-center" style={{ marginBottom: '28px' }}>
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
            <p style={{ color: '#e5e7eb', fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>
              Empieza a construir tu patrimonio
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', letterSpacing: '0.01em' }}>
              Los que empiezan hoy, ganan mañana. Sin tarjeta de crédito.
            </p>
          </div>

          {/* ── Success state ─────────────────────────────────────────────── */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: '28px',
                }}
              >
                ✉️
              </div>
              <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
                ¡Ya casi estás!
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>
                Revisa tu correo — te enviamos un link para activar tu cuenta a
              </p>
              <p style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                {email}
              </p>
              <div
                style={{
                  backgroundColor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
                  borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
                }}
              >
                <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.7 }}>
                  💡 Si no ves el correo en 2 minutos, revisa tu carpeta de <strong style={{ color: '#e5e7eb' }}>spam</strong> o correo no deseado.
                </p>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Link
                  href="/login"
                  style={{
                    color: '#D4AF37', fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                  }}
                >
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ── Server error ───────────────────────────────────────────── */}
              {serverError && (
                <div
                  className="flex items-start gap-2.5 mb-5 px-4 py-3 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠</span>
                  <span>{serverError}</span>
                </div>
              )}

              {/* ── Google OAuth ───────────────────────────────────────────── */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid rgba(212,175,55,0.2)',
                  backgroundColor: 'transparent',
                  color: '#D4AF37',
                  cursor: 'pointer',
                  marginBottom: '20px',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = 'rgba(212,175,55,0.05)'
                  el.style.borderColor = 'rgba(212,175,55,0.4)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.backgroundColor = 'transparent'
                  el.style.borderColor = 'rgba(212,175,55,0.2)'
                }}
              >
                <GoogleIcon />
                Continuar con Google
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
                <span style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  o con correo
                </span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* ── Form ──────────────────────────────────────────────────── */}
              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '7px' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(null); if (serverError) setServerError(null) }}
                    onBlur={validateEmail}
                    placeholder="tu@correo.com"
                    className="w-full text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-200"
                    style={{
                      backgroundColor: '#0d1220',
                      border: `1px solid ${emailError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '10px',
                      padding: '11px 14px',
                      boxShadow: emailError ? '0 0 0 3px rgba(239,68,68,0.08)' : undefined,
                    }}
                    onFocus={e => onFocus(e, !!emailError)}
                    onBlurCapture={e => onBlurStyle(e, !!emailError)}
                  />
                  {emailError && (
                    <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠</span> {emailError}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '7px' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => { setPassword(e.target.value); if (passError) setPassError(null) }}
                      onBlur={validatePassword}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-200"
                      style={{
                        backgroundColor: '#0d1220',
                        border: `1px solid ${passError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: '10px',
                        padding: '11px 42px 11px 14px',
                        boxShadow: passError ? '0 0 0 3px rgba(239,68,68,0.08)' : undefined,
                      }}
                      onFocus={e => onFocus(e, !!passError)}
                      onBlurCapture={e => onBlurStyle(e, !!passError)}
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
                  <PasswordStrengthMeter password={password} />
                  {passError && (
                    <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠</span> {passError}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', color: '#9ca3af', fontSize: '13px', fontWeight: 500, marginBottom: '7px' }}>
                    Confirmar contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); if (confirmError) setConfirmError(null) }}
                      onBlur={validateConfirm}
                      placeholder="Repite tu contraseña"
                      className="w-full text-sm text-white placeholder-gray-600 focus:outline-none transition-all duration-200"
                      style={{
                        backgroundColor: '#0d1220',
                        border: `1px solid ${
                          confirmError ? 'rgba(239,68,68,0.5)'
                          : confirm && confirm === password ? 'rgba(0,212,170,0.4)'
                          : 'rgba(255,255,255,0.07)'
                        }`,
                        borderRadius: '10px',
                        padding: '11px 42px 11px 14px',
                        boxShadow: confirmError ? '0 0 0 3px rgba(239,68,68,0.08)' : undefined,
                      }}
                      onFocus={e => onFocus(e, !!confirmError)}
                      onBlurCapture={e => onBlurStyle(e, !!confirmError)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[#D4AF37]"
                      style={{ color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmError && (
                    <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>⚠</span> {confirmError}
                    </p>
                  )}
                  {!confirmError && confirm && confirm === password && (
                    <p style={{ color: '#00d4aa', fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> Las contraseñas coinciden
                    </p>
                  )}
                </div>

                {/* Submit */}
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
                      Creando cuenta...
                    </span>
                  ) : 'Crear cuenta'}
                </button>
              </form>

              {/* Link to login */}
              <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '13px' }}>
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  style={{ color: '#D4AF37', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e5c84d' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#D4AF37' }}
                >
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ width: '100%', maxWidth: '440px', marginTop: '24px' }}>
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
