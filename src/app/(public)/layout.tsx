import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1117', color: '#e5e7eb' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'rgba(15,17,23,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #D4AF37, #b8922a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '14px', color: '#000',
            }}>W</div>
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              <span style={{ color: '#D4AF37' }}>Wealth</span>
              <span style={{ color: '#fff' }}>Host</span>
            </span>
          </div>
          <Link
            href="/login"
            style={{
              fontSize: '13px', color: '#D4AF37', textDecoration: 'none',
              border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px',
              padding: '6px 14px', transition: 'all 150ms ease',
            }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {[{ href: '/cookies', label: 'Cookies' }, { href: '/terms', label: 'Términos' }, { href: '/privacy', label: 'Privacidad' }].map((l, i) => (
            <>
              {i > 0 && <span key={`s${i}`} style={{ color: '#374151', fontSize: '11px' }}>·</span>}
              <Link key={l.href} href={l.href} style={{ color: '#6b7280', fontSize: '12px', textDecoration: 'none' }}>{l.label}</Link>
            </>
          ))}
        </div>
        <p style={{ color: '#374151', fontSize: '11px' }}>© {new Date().getFullYear()} WealtHost. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
