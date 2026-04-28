import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos de Servicio — WealtHost',
  description: 'Términos y condiciones de uso de la plataforma WealtHost.',
}

const LAST_UPDATED = '19 de abril de 2026'

export default function TermsPage() {
  return (
    <article>
      <header style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D4AF37', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Documento Legal
        </p>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
          Términos de Servicio
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>Última actualización: {LAST_UPDATED}</p>
      </header>

      <LegalSection title="1. Aceptación de los términos">
        <p>Al acceder o utilizar WealtHost (en adelante, la "Plataforma"), usted acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo con alguno de los términos aquí establecidos, le pedimos que no utilice la Plataforma.</p>
        <p>WealtHost es una herramienta de gestión financiera personal de uso privado. No constituye asesoría financiera, legal ni fiscal. Las decisiones de inversión o gestión patrimonial son de exclusiva responsabilidad del usuario.</p>
      </LegalSection>

      <LegalSection title="2. Descripción del servicio">
        <p>WealtHost ofrece las siguientes funcionalidades:</p>
        <ul>
          <li>Seguimiento y visualización de activos y pasivos en tiempo real.</li>
          <li>Registro de transacciones de ingresos y gastos.</li>
          <li>Gestión de inversiones en renta variable, criptoactivos y CDTs.</li>
          <li>Análisis de presupuestos y proyección de metas financieras.</li>
          <li>Generación de reportes patrimoniales en formato PDF.</li>
          <li>Indicadores de progreso hacia el patrimonio neto objetivo.</li>
        </ul>
        <p>El acceso a la Plataforma está restringido a usuarios autorizados. Nos reservamos el derecho de modificar, suspender o discontinuar cualquier funcionalidad sin previo aviso.</p>
      </LegalSection>

      <LegalSection title="3. Cuenta de usuario y seguridad">
        <p>Usted es responsable de mantener la confidencialidad de sus credenciales de acceso. Debe notificarnos inmediatamente en caso de uso no autorizado de su cuenta.</p>
        <p>La Plataforma utiliza autenticación segura a través de Supabase Auth con cifrado de extremo a extremo. No almacenamos contraseñas en texto plano. Las sesiones expiran automáticamente tras períodos de inactividad.</p>
        <p>Está estrictamente prohibido compartir credenciales de acceso con terceros o intentar acceder a cuentas ajenas.</p>
      </LegalSection>

      <LegalSection title="4. Datos financieros y precisión">
        <p>Los datos financieros ingresados en la Plataforma son proporcionados por el usuario. WealtHost no verifica la exactitud de los saldos, valoraciones ni cualquier otra información financiera introducida.</p>
        <p>Las cotizaciones de activos financieros mostradas (acciones, criptomonedas, TRM) provienen de fuentes externas de terceros y pueden presentar retrasos o imprecisiones. Estas no deben usarse como base única para decisiones de inversión.</p>
        <p>WealtHost no asume responsabilidad por pérdidas derivadas del uso de la información contenida en la Plataforma.</p>
      </LegalSection>

      <LegalSection title="5. Propiedad intelectual">
        <p>Todos los elementos de la Plataforma — incluyendo diseño, código fuente, logotipos, textos y funcionalidades — son propiedad exclusiva de WealtHost y están protegidos por las leyes de propiedad intelectual aplicables.</p>
        <p>Se prohíbe reproducir, distribuir, modificar o crear obras derivadas de cualquier componente de la Plataforma sin autorización previa y expresa por escrito.</p>
      </LegalSection>

      <LegalSection title="6. Limitación de responsabilidad">
        <p>En la máxima medida permitida por la ley aplicable, WealtHost no será responsable por daños directos, indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de uso de la Plataforma.</p>
        <p>La Plataforma se proporciona "tal cual" y "según disponibilidad", sin garantías de ningún tipo, expresas o implícitas, incluyendo, sin limitación, garantías de comerciabilidad o idoneidad para un propósito particular.</p>
      </LegalSection>

      <LegalSection title="7. Modificaciones a los términos">
        <p>Nos reservamos el derecho de actualizar estos Términos en cualquier momento. Los cambios entrarán en vigencia al ser publicados en la Plataforma. El uso continuado de WealtHost tras la publicación de cambios constituye aceptación de los nuevos términos.</p>
      </LegalSection>

      <LegalSection title="8. Ley aplicable y jurisdicción">
        <p>Estos Términos se rigen e interpretan conforme a las leyes de la República de Colombia. Cualquier disputa derivada de estos Términos se someterá a la jurisdicción exclusiva de los tribunales competentes de la ciudad de Bogotá D.C., Colombia.</p>
      </LegalSection>

      <div style={{ marginTop: '48px', padding: '20px 24px', borderRadius: '12px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>
          ¿Tienes preguntas sobre estos términos? Accede a la sección de{' '}
          <a href="/ayuda" style={{ color: '#D4AF37', textDecoration: 'none' }}>Ayuda</a>{' '}
          dentro de la Plataforma para contactarnos.
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
