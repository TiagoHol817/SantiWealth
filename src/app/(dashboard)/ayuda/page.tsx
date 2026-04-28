import Link from 'next/link'

const STEPS = [
  {
    icon: '🏦',
    title: 'Conecta tus cuentas',
    desc: 'Agrega tus cuentas bancarias e inversiones para ver todo en un solo lugar.',
  },
  {
    icon: '📥',
    title: 'Registra tus movimientos',
    desc: 'Importa tu extracto bancario o agrega transacciones manualmente.',
  },
  {
    icon: '📊',
    title: 'Revisa tu progreso',
    desc: 'Consulta tu dashboard y metas en tiempo real para tomar mejores decisiones.',
  },
]

const FAQ = [
  {
    q: '¿Es gratis?',
    a: 'Sí, el plan gratuito incluye hasta 3 cuentas.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Sí, usamos encriptación bancaria y no compartimos tu información con nadie.',
  },
  {
    q: '¿Puedo importar desde mi banco?',
    a: 'Sí, soportamos CSV y OFX de Bancolombia, Davivienda, Nequi y más.',
  },
  {
    q: '¿Hay app móvil?',
    a: 'La web funciona perfectamente en tu celular. App nativa próximamente.',
  },
  {
    q: '¿Cómo cancelo?',
    a: 'Desde Configuración > Plan en cualquier momento.',
  },
]

export default function AyudaPage() {
  return (
    <div className="space-y-8 pb-12" style={{ color: '#e5e7eb', maxWidth: '720px' }}>

      {/* ── Cómo empezar ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-white font-bold text-2xl mb-1">Centro de ayuda</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Todo lo que necesitas para empezar en menos de 5 minutos.
        </p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
      >
        <h2 className="text-white font-semibold text-base mb-5">¿Cómo empezar?</h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              {/* Step number */}
              <div
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: '#00d4aa', flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{step.icon} {step.title}</p>
                <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
      >
        <h2 className="text-white font-semibold text-base mb-5">Preguntas frecuentes</h2>
        <div className="space-y-0">
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{
                borderTop: i === 0 ? 'none' : '1px solid #1e2535',
                padding: '14px 0',
              }}
            >
              <p className="text-white font-medium text-sm mb-1">{item.q}</p>
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Soporte ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}
      >
        <p className="text-white font-semibold mb-2">¿Necesitas ayuda?</p>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
          Respondemos en menos de 24 horas.
        </p>
        <Link
          href="mailto:soporte@santiwealth.com"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            backgroundColor: 'rgba(0,212,170,0.1)',
            border: '1px solid rgba(0,212,170,0.25)',
            color: '#00d4aa',
            textDecoration: 'none',
          }}
        >
          ✉️ soporte@santiwealth.com
        </Link>
      </div>

    </div>
  )
}
