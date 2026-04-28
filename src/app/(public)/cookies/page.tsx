import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Cookies — WealtHost',
  description: 'Información sobre el uso de cookies y tecnologías de seguimiento en WealtHost.',
}

const LAST_UPDATED = '19 de abril de 2026'

const COOKIE_TABLE = [
  { nombre: 'sb-*-auth-token', tipo: 'Esencial', proveedor: 'Supabase', duración: 'Sesión / 1 año', propósito: 'Gestión de sesión de autenticación segura.' },
  { nombre: 'wh_sidebar_collapsed', tipo: 'Funcional', proveedor: 'WealtHost', duración: 'Persistente (localStorage)', propósito: 'Recuerda el estado del menú lateral (expandido/colapsado).' },
  { nombre: 'wh_cookie_consent', tipo: 'Funcional', proveedor: 'WealtHost', duración: '1 año (localStorage)', propósito: 'Almacena la preferencia de consentimiento de cookies del usuario.' },
  { nombre: '__vercel_*', tipo: 'Técnico', proveedor: 'Vercel', duración: 'Sesión', propósito: 'Enrutamiento y optimización de red de entrega de contenido (CDN).' },
]

export default function CookiesPage() {
  return (
    <article>
      <header style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D4AF37', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Documento Legal
        </p>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
          Política de Cookies
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>Última actualización: {LAST_UPDATED}</p>
      </header>

      <LegalSection title="1. ¿Qué son las cookies?">
        <p>Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo para recordar información sobre sus preferencias y sesión. WealtHost también utiliza tecnologías similares como <strong style={{ color: '#e5e7eb' }}>localStorage</strong> del navegador para almacenar preferencias de interfaz.</p>
      </LegalSection>

      <LegalSection title="2. Categorías de cookies que utilizamos">
        <p><strong style={{ color: '#e5e7eb' }}>Cookies esenciales (necesarias):</strong> Imprescindibles para el funcionamiento de la Plataforma. Sin ellas, no es posible autenticar sesiones ni garantizar la seguridad de su cuenta. No requieren su consentimiento previo.</p>
        <p><strong style={{ color: '#e5e7eb' }}>Cookies funcionales:</strong> Permiten recordar sus preferencias (estado del menú, densidad de interfaz) para ofrecerle una experiencia personalizada. Requieren su consentimiento.</p>
        <p><strong style={{ color: '#e5e7eb' }}>Cookies técnicas de terceros:</strong> Utilizadas por nuestros proveedores de infraestructura (Vercel, Supabase) para el correcto funcionamiento del servicio de alojamiento y base de datos.</p>
      </LegalSection>

      <LegalSection title="3. Detalle de las cookies utilizadas">
        <p>A continuación se detalla cada cookie o almacenamiento local que WealtHost utiliza actualmente:</p>
      </LegalSection>

      {/* Cookie table */}
      <div style={{ overflowX: 'auto', marginBottom: '36px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(212,175,55,0.2)' }}>
              {['Nombre', 'Tipo', 'Proveedor', 'Duración', 'Propósito'].map(h => (
                <th key={h} style={{ color: '#D4AF37', fontWeight: 600, textAlign: 'left', padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COOKIE_TABLE.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '12px 14px', color: '#e5e7eb', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'nowrap' }}>{row.nombre}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: row.tipo === 'Esencial' ? 'rgba(16,185,129,0.1)' : row.tipo === 'Funcional' ? 'rgba(212,175,55,0.1)' : 'rgba(99,102,241,0.1)',
                    color: row.tipo === 'Esencial' ? '#10b981' : row.tipo === 'Funcional' ? '#D4AF37' : '#818cf8',
                  }}>{row.tipo}</span>
                </td>
                <td style={{ padding: '12px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{row.proveedor}</td>
                <td style={{ padding: '12px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{row.duración}</td>
                <td style={{ padding: '12px 14px', color: '#6b7280', lineHeight: 1.5 }}>{row.propósito}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LegalSection title="4. Cookies de análisis y publicidad">
        <p>WealtHost <strong style={{ color: '#e5e7eb' }}>no utiliza cookies de análisis de comportamiento (analytics), publicidad comportamental ni rastreo cross-site</strong> de ningún tipo. No integramos herramientas como Google Analytics, Meta Pixel, Hotjar u otras tecnologías de seguimiento de terceros.</p>
      </LegalSection>

      <LegalSection title="5. Gestión de su consentimiento">
        <p>Al ingresar por primera vez a la Plataforma, se le presentará un banner de consentimiento de cookies que le permitirá:</p>
        <ul>
          <li><strong style={{ color: '#e5e7eb' }}>Aceptar todas:</strong> Activa las cookies esenciales y funcionales.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Configurar:</strong> Le permite seleccionar qué categorías de cookies desea habilitar.</li>
        </ul>
        <p>Su preferencia se almacena en <code style={{ color: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)', padding: '1px 5px', borderRadius: '4px' }}>localStorage</code> bajo la clave <code style={{ color: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.08)', padding: '1px 5px', borderRadius: '4px' }}>wh_cookie_consent</code> por un período de 12 meses.</p>
        <p>Puede retirar o modificar su consentimiento en cualquier momento limpiando el almacenamiento local de su navegador o mediante las herramientas de gestión de privacidad de su navegador.</p>
      </LegalSection>

      <LegalSection title="6. Control desde el navegador">
        <p>Todos los navegadores modernos ofrecen la posibilidad de gestionar las cookies de forma manual. Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que bloquear las cookies esenciales afectará el correcto funcionamiento de la autenticación y la sesión en WealtHost.</p>
        <p>Para más información sobre la gestión de cookies en su navegador, consulte la documentación oficial de Chrome, Firefox, Safari o Edge.</p>
      </LegalSection>

      <LegalSection title="7. Actualizaciones de esta política">
        <p>Esta Política de Cookies puede actualizarse periódicamente. Cualquier cambio será publicado en esta página con la fecha de actualización correspondiente. Si los cambios son significativos, se lo notificaremos mediante un aviso en la Plataforma.</p>
      </LegalSection>

      <div style={{ marginTop: '48px', padding: '20px 24px', borderRadius: '12px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>
          ¿Tienes preguntas sobre nuestra política de cookies? Accede a la sección de{' '}
          <a href="/ayuda" style={{ color: '#D4AF37', textDecoration: 'none' }}>Ayuda</a>{' '}
          dentro de la Plataforma.
        </p>
      </div>
    </article>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '36px' }}>
      <h2 style={{ color: '#e5e7eb', fontSize: '17px', fontWeight: 700, marginBottom: '14px', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </section>
  )
}
