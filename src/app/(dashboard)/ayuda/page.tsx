import Link from 'next/link'
import { HELP_CONTENT } from '@/components/help/helpContent'

export default function AyudaPage() {
  const modules = Object.values(HELP_CONTENT)

  return (
    <div className="space-y-8 pb-12" style={{ color: '#e5e7eb' }}>

      {/* Hero */}
      <div
        className="rounded-2xl p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)', border: '1px solid #2a3040' }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-5 blur-3xl"
          style={{ background: '#10b981', transform: 'translate(20%,-20%)' }} />
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: '#10b98120', flexShrink: 0 }}>
            📚
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Centro de ayuda</h1>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.7', maxWidth: '560px' }}>
              Todo lo que necesitas saber para sacarle el máximo provecho a WealtHost.
              Cada módulo tiene su propia guía con el flujo de datos, pasos y tips.
            </p>
          </div>
        </div>

        {/* Flujo general */}
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid #2a3040' }}>
          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
            Flujo general de la app
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Registra transacciones', icon: '💳', color: '#6366f1', href: '/transacciones' },
              { arrow: true },
              { label: 'Configura presupuestos', icon: '🎯', color: '#f59e0b', href: '/presupuestos'  },
              { arrow: true },
              { label: 'Guarda snapshots diarios', icon: '📸', color: '#10b981', href: '/dashboard' },
              { arrow: true },
              { label: 'Revisa reportes', icon: '📊', color: '#ef4444', href: '/reportes' },
            ].map((item, i) => (
              'arrow' in item ? (
                <span key={i} style={{ color: '#4b5563', fontSize: '18px' }}>→</span>
              ) : (
                <Link key={i} href={item.href ?? '#'}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:opacity-80"
                  style={{ backgroundColor: item.color + '15', border: `1px solid ${item.color}30` }}>
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  <span style={{ color: item.color, fontSize: '12px', fontWeight: '600' }}>{item.label}</span>
                </Link>
              )
            ))}
          </div>
        </div>
      </div>

      {/* Módulos */}
      <div>
        <h2 className="text-white font-semibold text-xl mb-5">Guías por módulo</h2>
        <div className="grid grid-cols-2 gap-4">
          {modules.map(mod => (
            <div key={mod.id}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl"
                style={{ background: mod.color, transform: 'translate(30%,-30%)' }} />

              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: mod.color + '20' }}>
                  {mod.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{mod.title}</h3>
                  <p style={{ color: mod.color, fontSize: '11px' }}>{mod.subtitle}</p>
                </div>
              </div>

              <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.6', marginBottom: '14px' }}>
                {mod.description}
              </p>

              {/* Pasos resumidos */}
              <div className="space-y-2 mb-4">
                {mod.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ fontSize: '13px', flexShrink: 0 }}>{step.icon}</span>
                    <p style={{ color: '#6b7280', fontSize: '11px' }}>
                      <strong style={{ color: '#9ca3af' }}>{step.title}:</strong> {step.desc.slice(0, 60)}
                      {step.desc.length > 60 ? '...' : ''}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tips preview */}
              {mod.tips.length > 0 && (
                <div className="rounded-xl p-3 mb-4"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                  <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    💡 Tip destacado
                  </p>
                  <p style={{ color: '#d1d5db', fontSize: '11px', lineHeight: '1.5' }}>
                    {mod.tips[0].text}
                  </p>
                </div>
              )}

              <Link href={`/${mod.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: mod.color + '15', color: mod.color, border: `1px solid ${mod.color}30` }}>
                Ir a {mod.title} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-white font-semibold text-xl mb-5">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {[
            {
              q: '¿Por qué el gráfico de evolución muestra pocos datos?',
              a: 'El gráfico se construye con snapshots diarios. Ve al Dashboard y guarda un snapshot cada día con el botón al fondo de la página.',
            },
            {
              q: '¿Por qué el Estado de Resultados muestra $0?',
              a: 'Asegúrate de tener transacciones registradas en el período seleccionado. El Estado de Resultados solo lee transacciones de Ingresos y Gastos — no calcula desde los saldos de cuentas.',
            },
            {
              q: '¿Cómo aparecen mis plataformas en el tracker de Ingresos?',
              a: 'Al registrar una transacción de tipo Ingreso, el campo "¿De dónde provienen tus ingresos?" guarda la categoría. Esa categoría es la fuente que aparece en Ingresos. Puedes escribir cualquier nombre personalizado.',
            },
            {
              q: '¿Qué pasa con los CDTs?',
              a: 'Los CDTs están dentro de Inversiones en el tab "Renta Fija". Desde allí puedes ver el progreso, rendimiento y días restantes de cada uno.',
            },
            {
              q: '¿Por qué una inversión muestra $0 en precio?',
              a: 'El ticker en Supabase debe coincidir exactamente con el de Yahoo Finance. Por ejemplo: BTC-USD, ETH-USD, JEPI, VOO. Revisa el campo ticker en tu tabla de investments.',
            },
            {
              q: '¿Los saldos de cuentas bancarias se actualizan automáticamente?',
              a: 'No. Los saldos de cuentas bancarias y efectivo se actualizan manualmente desde la tabla accounts en Supabase. Solo las inversiones y cripto tienen precio en tiempo real.',
            },
          ].map((item, i) => (
            <details key={i}
              className="rounded-xl overflow-hidden group"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <summary
                className="px-5 py-4 cursor-pointer text-sm font-medium text-white flex items-center justify-between"
                style={{ listStyle: 'none' }}>
                {item.q}
                <span style={{ color: '#6b7280', fontSize: '18px', flexShrink: 0, marginLeft: '12px' }}>+</span>
              </summary>
              <div className="px-5 pb-4" style={{ borderTop: '1px solid #1e2535' }}>
                <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.7', paddingTop: '12px' }}>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-2xl p-6 text-center"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
        <p className="text-white font-semibold mb-2">¿Algo más que necesitas saber?</p>
        <p style={{ color: '#6b7280', fontSize: '13px' }}>
          Cada módulo tiene su propio botón <strong style={{ color: '#10b981' }}>"? Cómo funciona"</strong> en el header
          que abre la guía contextual específica.
        </p>
      </div>
    </div>
  )
}