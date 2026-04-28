'use client'

import { useState, useEffect } from 'react'
import Link    from 'next/link'
import FadeIn  from '@/components/ui/FadeIn'

/* ── Mock UI cards ──────────────────────────────────────────────────── */
const CARD: React.CSSProperties = {
  background: 'rgba(26,31,46,0.92)', backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.09)', borderRadius: '18px',
  boxShadow: '0 28px 56px rgba(0,0,0,0.45)',
}

function MockDashboard() {
  return (
    <div style={{ ...CARD, padding: '24px', width: '310px', transform: 'rotate(-2deg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#6b7280', fontSize: '12px' }}>Patrimonio neto</span>
        <span style={{ color: '#10b98180', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} /> Live
        </span>
      </div>
      <p style={{ color: '#00d4aa', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
        $12,450,000
      </p>
      <p style={{ color: '#4b5563', fontSize: '11px', marginBottom: '16px' }}>COP · TRM $4,180 · ↑ +$520,000 ayer</p>

      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '38px', marginBottom: '14px' }}>
        {[28, 42, 35, 55, 47, 38, 62, 70].map((h, i, arr) => (
          <div key={i} style={{
            flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0',
            backgroundColor: i === arr.length - 1 ? '#00d4aa' : i === arr.length - 2 ? '#00d4aa50' : '#1e2535',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[['#00d4aa', '+12% mes'], ['#6366f1', '+3.2% inv'], ['#f59e0b', '87/100']].map(([c, l]) => (
          <span key={l} style={{
            backgroundColor: c + '22', color: c,
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
          }}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function MockTransactions() {
  const rows = [
    { icon: '🛒', name: 'Mercado', cat: 'Alimentación', val: '-$45,000', neg: true },
    { icon: '💰', name: 'Salario', cat: 'Ingreso',      val: '+$4,500,000', neg: false },
    { icon: '🚗', name: 'Uber',    cat: 'Transporte',   val: '-$18,500', neg: true },
    { icon: '🍕', name: 'Rappi',   cat: 'Alimentación', val: '-$32,000', neg: true },
  ]
  return (
    <div style={{ ...CARD, width: '290px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e2535', display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>Hoy</p>
        <p style={{ color: '#4b5563', fontSize: '11px' }}>4 movimientos</p>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: i < rows.length - 1 ? '1px solid #1e2535' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{r.icon}</span>
            <div>
              <p style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{r.name}</p>
              <p style={{ color: '#4b5563', fontSize: '10px' }}>{r.cat}</p>
            </div>
          </div>
          <p style={{ color: r.neg ? '#ef4444' : '#10b981', fontSize: '13px', fontWeight: 600 }}>{r.val}</p>
        </div>
      ))}
    </div>
  )
}

function MockDonut() {
  return (
    <div style={{ ...CARD, padding: '20px', width: '250px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>Portafolio</p>
        <p style={{ color: '#6366f1', fontSize: '13px', fontWeight: 700 }}>$2,450 USD</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%',
          background: 'conic-gradient(#6366f1 0deg 216deg, #f59e0b 216deg 306deg, #10b981 306deg 360deg)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: '14px', borderRadius: '50%',
            backgroundColor: '#1a1f2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '18px' }}>📈</span>
          </div>
        </div>
      </div>
      {[['#6366f1', 'ETFs', '60%'], ['#f59e0b', 'Cripto', '25%'], ['#10b981', 'CDTs', '15%']].map(([c, l, p]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: c }} />
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>{l}</span>
          </div>
          <span style={{ color: c, fontSize: '12px', fontWeight: 600 }}>{p}</span>
        </div>
      ))}
    </div>
  )
}

function MockGoal() {
  return (
    <div style={{ ...CARD, padding: '20px', width: '280px', border: '1px solid rgba(99,102,241,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🏠</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>Casa propia</p>
          <p style={{ color: '#6b7280', fontSize: '11px' }}>Meta: $100,000,000 COP</p>
        </div>
        <span style={{ backgroundColor: '#6366f120', color: '#6366f1', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>72%</span>
      </div>
      <div style={{ backgroundColor: '#0f1117', borderRadius: '5px', height: '7px', overflow: 'hidden', marginBottom: '8px' }}>
        <div style={{ width: '72%', height: '100%', background: 'linear-gradient(90deg, #6366f160, #6366f1)', borderRadius: '5px' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>$72,000,000</span>
        <span style={{ color: '#4b5563', fontSize: '11px' }}>$28M restante</span>
      </div>
      <div style={{ backgroundColor: '#0f1117', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#4b5563', fontSize: '10px' }}>Ahorra/mes</p>
          <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700 }}>$2,333,333</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#4b5563', fontSize: '10px' }}>Llegas en</p>
          <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 600 }}>Jun 2026</p>
        </div>
      </div>
    </div>
  )
}

function MockScoreGauge() {
  const r = 46, circ = 2 * Math.PI * r, dash = (87 / 100) * circ
  return (
    <svg width={130} height={130} viewBox="0 0 110 110">
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#1e2535" strokeWidth="10" />
      <circle cx="55" cy="55" r={r} fill="none"
        stroke="url(#sg)" strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }}
      />
      <text x="55" y="49" textAnchor="middle" fill="white" fontSize="26" fontWeight="800">87</text>
      <text x="55" y="65" textAnchor="middle" fill="#6b7280" fontSize="10">/100</text>
    </svg>
  )
}

/* ── Navbar ─────────────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const linkStyle: React.CSSProperties = {
    color: '#9ca3af', fontSize: '14px', textDecoration: 'none',
    transition: 'color 0.2s',
  }
  const hover = (e: React.MouseEvent<HTMLAnchorElement>, on: boolean) =>
    (e.currentTarget.style.color = on ? '#fff' : '#9ca3af')

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: scrolled ? 'rgba(15,17,23,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f1117', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>W</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>WealthHost</span>
        </Link>

        {/* Desktop links */}
        <div className="lp-nav-links">
          <a href="#precios" style={linkStyle} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>Precios</a>
          <Link href="/login" style={linkStyle} onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>Iniciar sesión</Link>
          <Link href="/auth/register" style={{
            backgroundColor: '#00d4aa', color: '#0f1117',
            padding: '8px 20px', borderRadius: '10px',
            fontWeight: 700, fontSize: '14px', textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Empezar gratis →
          </Link>
        </div>

        {/* Hamburger */}
        <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '22px', lineHeight: 1 }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ backgroundColor: 'rgba(15,17,23,0.97)', backdropFilter: 'blur(16px)', padding: '16px 24px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <a href="#precios" onClick={() => setMenuOpen(false)} style={{ color: '#9ca3af', fontSize: '15px', textDecoration: 'none' }}>Precios</a>
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{ color: '#9ca3af', fontSize: '15px', textDecoration: 'none' }}>Iniciar sesión</Link>
          <Link href="/auth/register" onClick={() => setMenuOpen(false)} style={{ backgroundColor: '#00d4aa', color: '#0f1117', padding: '13px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', textAlign: 'center' }}>
            Empezar gratis →
          </Link>
        </div>
      )}
    </nav>
  )
}

/* ── Hero ───────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section style={{ position: 'relative', padding: '80px 24px 100px', overflow: 'hidden' }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%', left: '-8%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '45%', left: '42%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="lp-hero-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Left: copy */}
        <div>
          <FadeIn delay={0}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', border: '1px solid rgba(0,212,170,0.35)', backgroundColor: 'rgba(0,212,170,0.06)', padding: '6px 14px', borderRadius: '20px', marginBottom: '28px', boxShadow: '0 0 20px rgba(0,212,170,0.1)' }}>
              <span style={{ color: '#00d4aa', fontSize: '13px', fontWeight: 600 }}>✦ Finanzas personales inteligentes</span>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <h1 style={{
              fontSize: 'clamp(38px, 5.5vw, 66px)', fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-0.03em', marginBottom: '24px',
              background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 35%, #00d4aa 68%, #6366f1 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              Tu patrimonio,<br />bajo control.
            </h1>
          </FadeIn>

          <FadeIn delay={160}>
            <p style={{ color: '#9ca3af', fontSize: '17px', lineHeight: 1.75, marginBottom: '36px', maxWidth: '470px' }}>
              WealthHost consolida tus cuentas, inversiones, presupuestos y metas en un solo lugar.
              Con IA que categoriza, analiza y te dice exactamente qué hacer con tu dinero.
            </p>
          </FadeIn>

          <FadeIn delay={240}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <Link href="/auth/register" style={{
                display: 'inline-flex', alignItems: 'center',
                backgroundColor: '#00d4aa', color: '#0f1117',
                padding: '0 28px', height: '52px', borderRadius: '14px',
                fontWeight: 700, fontSize: '15px', textDecoration: 'none',
                boxShadow: '0 0 36px rgba(0,212,170,0.35)',
              }}>
                Empezar gratis — es gratis
              </Link>
              <a href="#features" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                border: '1px solid rgba(255,255,255,0.14)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: '#e5e7eb', padding: '0 24px', height: '52px', borderRadius: '14px',
                fontWeight: 500, fontSize: '15px', textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}>
                Ver demo →
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={320}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {['Diseñado para Colombia 🇨🇴', 'Sin tarjeta de crédito', 'Cancela cuando quieras'].map((t, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {i > 0 && <span style={{ color: '#2a3040' }}>·</span>}
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>{t}</span>
                </span>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Right: mock card */}
        <div className="lp-hero-visual">
          <FadeIn delay={200}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.2) 0%, transparent 70%)', filter: 'blur(24px)', pointerEvents: 'none' }} />
              <MockDashboard />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

/* ── Stats bar ──────────────────────────────────────────────────────── */
function StatsBar() {
  return (
    <FadeIn>
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="lp-stats-grid" style={{
            background: 'rgba(26,31,46,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px',
          }}>
            {[
              { num: '$0',   label: 'Costo para empezar' },
              { num: '9',    label: 'Módulos financieros' },
              { num: '100%', label: 'Datos en tu control' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '32px 24px',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
                <p style={{
                  fontSize: 'clamp(32px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '8px',
                  background: 'linear-gradient(135deg, #00d4aa, #6366f1)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{s.num}</p>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  )
}

/* ── Features ───────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '💳', tag: 'Transacciones', reverse: false,
    title: 'Cada peso que gastas, registrado en segundos',
    body: 'Importa tu extracto de Bancolombia, Davivienda o Nequi con un clic. O usa el botón + para registrar al instante. La IA categoriza todo automáticamente.',
    Visual: MockTransactions,
  },
  {
    icon: '📈', tag: 'Inversiones', reverse: true,
    title: 'Tu portafolio en tiempo real, en COP y USD',
    body: 'Registra acciones, ETFs, criptomonedas y CDTs. Precios actualizados de Yahoo Finance cada minuto. Ve tu ganancia real descontando la inflación colombiana.',
    Visual: MockDonut,
  },
  {
    icon: '🎯', tag: 'Metas y Presupuestos', reverse: false,
    title: 'Sabe exactamente cuándo alcanzarás tus sueños',
    body: 'Define una meta financiera y WealthHost calcula cuánto ahorrar por mes para lograrlo. Los presupuestos te avisan antes de que te pases del límite.',
    Visual: MockGoal,
  },
]

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '80px 24px', position: 'relative' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
              Todo lo que necesitas para ganar con tu dinero
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Cada módulo está diseñado para que tomes mejores decisiones financieras
            </p>
          </div>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '96px' }}>
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={80}>
              <div className={f.reverse ? 'lp-feature-rev' : 'lp-feature-row'}>
                <div className="lp-feature-col">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      {f.icon}
                    </div>
                    <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(99,102,241,0.1)', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.03em' }}>
                      {f.tag}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '16px' }}>
                    {f.title}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.78 }}>{f.body}</p>
                </div>
                <div className="lp-feature-col" style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', filter: 'blur(16px)', pointerEvents: 'none' }} />
                    <f.Visual />
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Wealth Score ───────────────────────────────────────────────────── */
function WealthScoreSection() {
  const pillars = [
    { icon: '💰', label: 'Tasa de ahorro',       score: 85, color: '#10b981' },
    { icon: '📈', label: 'Activos productivos',   score: 72, color: '#6366f1' },
    { icon: '🛡️', label: 'Fondo de emergencia',  score: 91, color: '#00d4aa' },
    { icon: '📊', label: 'Control de gastos',     score: 88, color: '#f59e0b' },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div className="breathe-purple" style={{
            background: 'rgba(26,31,46,0.7)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: '24px',
            padding: 'clamp(32px,5vw,56px) clamp(24px,5vw,48px)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '360px', height: '360px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', transform: 'translate(30%,-30%)', pointerEvents: 'none' }} />

            <div style={{ textAlign: 'center', marginBottom: '48px', position: 'relative' }}>
              <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
                El Wealth Score: tu calificación financiera
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '16px', maxWidth: '520px', margin: '0 auto' }}>
                Un número del 0 al 100 que refleja qué tan sana está tu vida financiera.
                Sube tu score tomando mejores decisiones.
              </p>
            </div>

            <div className="lp-score-grid" style={{ position: 'relative' }}>
              {/* Left pillars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {pillars.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(15,17,23,0.6)', borderRadius: '14px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{p.icon}</span>
                      <span style={{ color: '#9ca3af', fontSize: '13px', flex: 1 }}>{p.label}</span>
                      <span style={{ color: p.color, fontWeight: 700, fontSize: '13px' }}>{p.score}</span>
                    </div>
                    <div style={{ backgroundColor: '#0f1117', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${p.score}%`, height: '100%', background: `linear-gradient(90deg, ${p.color}60, ${p.color})`, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Center gauge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <MockScoreGauge />
                <p style={{ color: '#10b981', fontWeight: 700, fontSize: '14px', textAlign: 'center' }}>Excelente</p>
                <p style={{ color: '#4b5563', fontSize: '11px', textAlign: 'center' }}>Tu salud financiera</p>
              </div>

              {/* Right pillars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {pillars.slice(2, 4).map((p, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(15,17,23,0.6)', borderRadius: '14px', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{p.icon}</span>
                      <span style={{ color: '#9ca3af', fontSize: '13px', flex: 1 }}>{p.label}</span>
                      <span style={{ color: p.color, fontWeight: 700, fontSize: '13px' }}>{p.score}</span>
                    </div>
                    <div style={{ backgroundColor: '#0f1117', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${p.score}%`, height: '100%', background: `linear-gradient(90deg, ${p.color}60, ${p.color})`, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

/* ── How it works ───────────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { num: '01', icon: '✨', color: '#00d4aa', title: 'Crea tu cuenta gratis',       desc: 'Sin tarjeta de crédito. En menos de 2 minutos estás dentro y listo para empezar.' },
    { num: '02', icon: '🔗', color: '#6366f1', title: 'Conecta tus finanzas',        desc: 'Importa extractos CSV de cualquier banco colombiano o agrega tus cuentas manualmente.' },
    { num: '03', icon: '🎯', color: '#f59e0b', title: 'Toma decisiones que importan', desc: 'Con datos reales, no suposiciones. WealthHost te dice exactamente qué hacer con tu dinero.' },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '14px' }}>
              En 3 pasos, toma el control
            </h2>
          </div>
        </FadeIn>

        <div className="lp-steps-grid" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '38px', left: '18%', right: '18%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3) 30%, rgba(99,102,241,0.3) 70%, transparent)', pointerEvents: 'none' }} />
          {steps.map((s, i) => (
            <FadeIn key={i} delay={i * 120}>
              <div style={{
                background: 'rgba(26,31,46,0.6)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px',
                padding: '32px 28px', textAlign: 'center',
              }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 18px' }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: s.color, marginBottom: '8px', textTransform: 'uppercase' }}>{s.num}</p>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '10px', lineHeight: 1.3 }}>{s.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pricing ────────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Inicio',
    tagline: 'Para los que están empezando a ver el panorama',
    badge: 'Gratis para siempre', price: '$0', priceSub: null,
    accent: '#00d4aa', featured: false,
    features: ['3 cuentas bancarias', 'Entrada manual de datos', 'CSV (5 importaciones/mes)', 'Dashboard básico', '1 meta financiera'],
    cta: 'Empezar gratis',
  },
  {
    name: 'Pro',
    tagline: 'Para los que van en serio con su patrimonio',
    badge: 'Más popular', price: '$19.900 COP/mes', priceSub: '~$5 USD · Menos que un café',
    accent: '#6366f1', featured: true,
    features: ['Cuentas ilimitadas', 'CSV/OFX ilimitado', 'Entrada por voz', 'IA categoriza todo', 'Reportes PDF', 'Inversiones tiempo real', 'Metas ilimitadas'],
    cta: 'Quiero el control total',
  },
  {
    name: 'Premium',
    tagline: 'Para los que multiplican y no dejan nada al azar',
    badge: 'Para los que ganan en grande', price: '$39.900 COP/mes', priceSub: null,
    accent: '#f59e0b', featured: false,
    features: ['Todo de Pro +', 'Email parsing automático', 'Crypto tracking avanzado', 'CDTs y renta fija', 'Alertas inteligentes IA', 'Asistente financiero IA'],
    cta: 'Activar poder máximo',
  },
]

function PricingSection() {
  return (
    <section id="precios" style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '12px' }}>
              Empieza gratis. Escala cuando crezcas.
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Sin sorpresas. Sin letra pequeña.</p>
          </div>
        </FadeIn>

        <div className="lp-plans-grid">
          {PLANS.map((plan, i) => (
            <FadeIn key={i} delay={i * 90}>
              <div
                className={plan.featured ? 'breathe-purple' : ''}
                style={{
                  background: plan.featured ? 'rgba(99,102,241,0.07)' : 'rgba(26,31,46,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${plan.featured ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '20px', padding: '28px',
                }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ backgroundColor: plan.accent + '20', color: plan.accent, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                    {plan.badge}
                  </span>
                </div>
                <p style={{ color: '#fff', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '2px' }}>{plan.name}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px', lineHeight: 1.4 }}>{plan.tagline}</p>
                <p style={{ color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{plan.price}</p>
                <div style={{ height: '20px', marginBottom: '20px' }}>
                  {plan.priceSub && <p style={{ color: '#6b7280', fontSize: '12px' }}>{plan.priceSub}</p>}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: plan.accent, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.4 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" style={{
                  display: 'block', textAlign: 'center',
                  backgroundColor: plan.featured ? plan.accent : 'transparent',
                  color: plan.featured ? '#0f1117' : plan.accent,
                  border: `1px solid ${plan.accent}`,
                  padding: '12px', borderRadius: '12px',
                  fontWeight: 600, fontSize: '14px', textDecoration: 'none',
                }}>
                  {plan.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── FAQ ────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: '¿Es realmente gratis?', a: 'Sí. El plan gratuito incluye 3 cuentas, importación de extractos y dashboard completo. Sin tarjeta de crédito requerida.' },
  { q: '¿Mis datos financieros están seguros?', a: 'Tus datos se almacenan con encriptación de nivel bancario y nunca se venden ni se comparten con terceros. Tú tienes control total.' },
  { q: '¿Funciona con bancos colombianos?', a: 'Sí. Soportamos importación desde Bancolombia, Davivienda, Nequi, Nu, BBVA y más, en formato CSV o XLS.' },
  { q: '¿Necesito saber de finanzas para usar WealthHost?', a: 'No. WealthHost está diseñado para que cualquier persona entienda su situación financiera sin ser experto. La IA te guía paso a paso.' },
  { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí, sin penalizaciones ni trámites. Cancelas en un clic desde tu perfil y tus datos siguen siendo tuyos.' },
]

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <FadeIn>
          <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '48px' }}>
            Preguntas frecuentes
          </h2>
        </FadeIn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FAQS.map((faq, i) => (
            <FadeIn key={i} delay={i * 50}>
              <div style={{ background: 'rgba(26,31,46,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 600, textAlign: 'left', gap: '12px' }}
                >
                  {faq.q}
                  <span style={{ color: '#6b7280', fontSize: '20px', flexShrink: 0, fontWeight: 300, transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }}>+</span>
                </button>
                {open === i && (
                  <div style={{ padding: '0 22px 18px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.72 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── CTA final ──────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(99,102,241,0.1) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: '28px', padding: 'clamp(48px,8vw,80px) clamp(24px,6vw,48px)',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.5vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '16px', position: 'relative' }}>
              Tu mejor decisión financiera empieza hoy
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '17px', maxWidth: '500px', margin: '0 auto 36px', position: 'relative' }}>
              Únete a las personas que ya controlan su patrimonio con WealthHost
            </p>
            <Link href="/auth/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#00d4aa', color: '#0f1117',
              padding: '0 40px', height: '56px', borderRadius: '14px',
              fontWeight: 700, fontSize: '16px', textDecoration: 'none',
              boxShadow: '0 0 44px rgba(0,212,170,0.4)',
              position: 'relative',
            }}>
              Crear cuenta gratis →
            </Link>
            <p style={{ color: '#4b5563', fontSize: '13px', marginTop: '18px', position: 'relative' }}>
              Gratis para siempre · Sin tarjeta · 2 minutos para empezar
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="lp-footer-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f1117', fontWeight: 800, fontSize: '15px' }}>W</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>WealthHost</p>
              <p style={{ color: '#4b5563', fontSize: '11px', margin: 0 }}>Finanzas personales inteligentes</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            {[{ l: 'Precios', h: '#precios' }, { l: 'Privacidad', h: '#' }, { l: 'Términos', h: '#' }, { l: 'Contacto', h: '#' }].map(({ l, h }) => (
              <a key={l} href={h} style={{ color: '#6b7280', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                {l}
              </a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <p style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center' }}>
            © 2026 WealthHost. Hecho con ❤️ en Colombia 🇨🇴
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ── Root ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#0f1117', minHeight: '100vh', color: '#e5e7eb' }}>
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <WealthScoreSection />
        <HowItWorksSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
