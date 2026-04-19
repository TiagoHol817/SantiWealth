import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — WealtHost',
  description: 'Cómo WealtHost recopila, usa y protege tu información personal.',
}

const LAST_UPDATED = '19 de abril de 2026'

export default function PrivacyPage() {
  return (
    <article>
      <header style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#D4AF37', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Documento Legal
        </p>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>
          Política de Privacidad
        </h1>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>Última actualización: {LAST_UPDATED}</p>
      </header>

      <LegalSection title="1. Responsable del tratamiento">
        <p>WealtHost (en adelante, "nosotros", "nuestro" o la "Plataforma") actúa como responsable del tratamiento de los datos personales recabados a través de esta aplicación, de conformidad con la Ley 1581 de 2012 de Protección de Datos Personales de Colombia y sus decretos reglamentarios.</p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <p>Recopilamos los siguientes tipos de información:</p>
        <ul>
          <li><strong style={{ color: '#e5e7eb' }}>Datos de identificación:</strong> Nombre completo, dirección de correo electrónico, proporcionados al crear la cuenta.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Datos financieros:</strong> Saldos de cuentas, registros de transacciones, portafolios de inversión y deudas que usted ingresa manualmente en la Plataforma.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Datos de uso:</strong> Información sobre cómo interactúa con la Plataforma, incluyendo páginas visitadas y funcionalidades utilizadas.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Datos técnicos:</strong> Dirección IP, tipo de navegador, sistema operativo y datos de sesión, recopilados automáticamente.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Preferencias:</strong> Configuraciones de interfaz, densidad de UI y preferencias de visualización almacenadas en la base de datos.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades del tratamiento">
        <p>Utilizamos sus datos para las siguientes finalidades:</p>
        <ul>
          <li>Proveer, mantener y mejorar las funcionalidades de la Plataforma.</li>
          <li>Autenticar su identidad y gestionar su sesión de forma segura.</li>
          <li>Almacenar y mostrar su información financiera personal según sus instrucciones.</li>
          <li>Generar reportes patrimoniales y análisis financieros personalizados.</li>
          <li>Enviar notificaciones relevantes sobre sus activos, metas y presupuestos.</li>
          <li>Mejorar la experiencia de usuario mediante el análisis de patrones de uso agregados y anonimizados.</li>
          <li>Cumplir con obligaciones legales aplicables.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal del tratamiento">
        <p>El tratamiento de sus datos se fundamenta en:</p>
        <ul>
          <li><strong style={{ color: '#e5e7eb' }}>Consentimiento:</strong> Otorgado al registrarse y aceptar esta Política y los Términos de Servicio.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Ejecución contractual:</strong> Necesario para la prestación del servicio contratado.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Interés legítimo:</strong> Para mejorar la seguridad y la funcionalidad de la Plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Almacenamiento y seguridad">
        <p>Sus datos se almacenan en servidores seguros operados por Supabase, proveedor de infraestructura en la nube que cumple con estándares internacionales de seguridad (SOC 2 Type II). Todas las comunicaciones entre su dispositivo y nuestros servidores están cifradas mediante TLS 1.3.</p>
        <p>Los datos financieros se almacenan en bases de datos PostgreSQL con Row Level Security (RLS) habilitado, garantizando que solo usted pueda acceder a su propia información. Las contraseñas nunca se almacenan en texto plano.</p>
        <p>Conservamos sus datos mientras su cuenta permanezca activa. Usted puede solicitar la eliminación completa de su cuenta y datos en cualquier momento.</p>
      </LegalSection>

      <LegalSection title="6. Compartición con terceros">
        <p>No vendemos, arrendamos ni compartimos sus datos personales con terceros con fines comerciales. Podemos compartir información únicamente en los siguientes supuestos:</p>
        <ul>
          <li><strong style={{ color: '#e5e7eb' }}>Proveedores de servicios:</strong> Supabase (infraestructura de base de datos y autenticación), Vercel (alojamiento web). Estos proveedores actúan como encargados del tratamiento bajo acuerdos de confidencialidad.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Fuentes de datos de mercado:</strong> La Plataforma consulta precios de activos a través de APIs públicas (Yahoo Finance). No se transmiten datos personales en estas consultas.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Obligación legal:</strong> Cuando sea requerido por autoridades competentes conforme a la ley colombiana.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Sus derechos (Habeas Data)">
        <p>De acuerdo con la Ley 1581 de 2012, usted tiene derecho a:</p>
        <ul>
          <li><strong style={{ color: '#e5e7eb' }}>Acceso:</strong> Conocer qué datos personales suyos tratamos.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Rectificación:</strong> Actualizar o corregir datos inexactos o incompletos.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Cancelación:</strong> Solicitar la eliminación de sus datos cuando ya no sean necesarios.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Oposición:</strong> Oponerse al tratamiento de sus datos para determinadas finalidades.</li>
          <li><strong style={{ color: '#e5e7eb' }}>Portabilidad:</strong> Exportar sus datos en un formato legible y estructurado.</li>
        </ul>
        <p>Para ejercer cualquiera de estos derechos, acceda a la sección de Ayuda dentro de la Plataforma.</p>
      </LegalSection>

      <LegalSection title="8. Transferencias internacionales">
        <p>Sus datos pueden ser procesados en servidores ubicados fuera de Colombia (principalmente en Estados Unidos y la Unión Europea), a través de nuestros proveedores de infraestructura. Estas transferencias se realizan con las garantías adecuadas conforme a los estándares de la Superintendencia de Industria y Comercio de Colombia.</p>
      </LegalSection>

      <LegalSection title="9. Menores de edad">
        <p>WealtHost no está dirigido a personas menores de 18 años. No recopilamos intencionalmente datos personales de menores. Si tenemos conocimiento de que hemos recabado datos de un menor, los eliminaremos de inmediato.</p>
      </LegalSection>

      <LegalSection title="10. Cambios a esta política">
        <p>Nos reservamos el derecho de actualizar esta Política en cualquier momento. Le notificaremos sobre cambios materiales a través de un aviso visible en la Plataforma. El uso continuado de WealtHost tras la notificación constituye aceptación de la Política actualizada.</p>
      </LegalSection>

      <div style={{ marginTop: '48px', padding: '20px 24px', borderRadius: '12px', backgroundColor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
        <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>
          ¿Tienes preguntas sobre el manejo de tus datos? Consulta nuestra sección de{' '}
          <a href="/ayuda" style={{ color: '#D4AF37', textDecoration: 'none' }}>Ayuda</a>{' '}
          o escríbenos directamente desde la Plataforma.
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
