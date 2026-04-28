export interface ModuleHelp {
  id:    string
  icon:  string
  title: string
  steps: string[]
  cta:   string
  color: string
}

export const HELP_CONTENT: Record<string, ModuleHelp> = {

  dashboard: {
    id:    'dashboard',
    icon:  '🏠',
    title: 'Tu patrimonio, en tiempo real',
    color: '#10b981',
    steps: [
      'Ve de un vistazo cuánto tienes, cuánto gastas y cómo creces',
      'El Wealth Score te dice honestamente qué tan sana está tu vida financiera',
      'Cada módulo alimenta este dashboard — entre más usas la app, más inteligente se vuelve',
      'El botón + (abajo a la derecha) registra un gasto en segundos',
    ],
    cta: 'Entendido, quiero ver mi patrimonio →',
  },

  transacciones: {
    id:    'transacciones',
    icon:  '💳',
    title: 'Cada peso que registras, trabaja para ti',
    color: '#6366f1',
    steps: [
      'Registra ingresos y gastos manualmente o importa tu extracto bancario completo',
      'La IA categoriza automáticamente cada movimiento — tú solo confirmas',
      'Filtra por categoría, fecha o monto para entender exactamente en qué se va tu dinero',
      'El botón + (abajo a la derecha) o Ctrl+N para registrar al instante',
    ],
    cta: 'Registrar mi primera transacción →',
  },

  inversiones: {
    id:    'inversiones',
    icon:  '📈',
    title: 'El dinero que no inviertes, pierde valor cada día',
    color: '#6366f1',
    steps: [
      'Registra acciones, ETFs, fondos, criptomonedas y CDTs en un solo lugar',
      'Los precios se actualizan en tiempo real — ve tu ganancia o pérdida al instante',
      'La dona muestra exactamente cómo está distribuido tu portafolio',
      'WealthHost calcula tu rendimiento real descontando inflación e impuestos',
    ],
    cta: 'Registrar mi primera inversión →',
  },

  presupuestos: {
    id:    'presupuestos',
    icon:  '🎯',
    title: 'Sin presupuesto, el dinero simplemente desaparece',
    color: '#6366f1',
    steps: [
      'Define cuánto puedes gastar por categoría cada mes y WealthHost hace el control por ti',
      'La barra de salud cambia de verde a rojo cuando te acercas al límite — nunca más sorpresas',
      'Las personas que usan presupuestos ahorran en promedio 3 veces más que las que no',
      'Compara mes a mes tu evolución y ve cómo mejoras con el tiempo',
    ],
    cta: 'Crear mi primer presupuesto →',
  },

  metas: {
    id:    'metas',
    icon:  '🏆',
    title: 'Sin meta clara, no hay llegada',
    color: '#10b981',
    steps: [
      'Define un objetivo financiero con monto y fecha — WealthHost te dice cuánto ahorrar por mes',
      'Cada meta tiene su propia barra de progreso: ves exactamente qué tan lejos estás',
      'La app calcula automáticamente si vas a llegar a tiempo o necesitas ajustar',
      'Desde casa propia hasta retiro anticipado — cada sueño tiene su meta aquí',
    ],
    cta: 'Definir mi primera meta →',
  },

  'costos-op': {
    id:    'costos-op',
    icon:  '🔄',
    title: 'Lo que no controlas, te controla a ti',
    color: '#ef4444',
    steps: [
      'Registra todo lo que sale automáticamente cada mes: arriendo, servicios, suscripciones',
      'WealthHost calcula el impacto anual de cada gasto — muchos se sorprenden con lo que ven',
      'Recibe alertas antes de que llegue un cobro para que nunca quedes en rojo',
      'Identifica qué suscripciones puedes eliminar y cuánto recuperarías al año',
    ],
    cta: 'Ver mis costos fijos →',
  },

  ingresos: {
    id:    'ingresos',
    icon:  '💰',
    title: '¿Sabes realmente cuánto ganas al mes?',
    color: '#10b981',
    steps: [
      'Todo ingreso que registras en Transacciones aparece aquí organizado por fuente',
      'Ve qué porcentaje viene de tu trabajo, tu negocio, tus inversiones',
      'Proyecta tu ingreso anual y toma decisiones basadas en números reales',
      'Los freelancers y emprendedores que trackean sus ingresos cobran en promedio 23% más',
    ],
    cta: 'Ver mis fuentes de ingreso →',
  },

  reportes: {
    id:    'reportes',
    icon:  '📊',
    title: 'Los números que tu contador quería que supieras',
    color: '#f59e0b',
    steps: [
      'Estado de resultados, balance general y flujo de caja — todo actualizado en tiempo real',
      'Detecta patrones: en qué mes gastas más, qué categoría te está hundiendo, cuándo ahorras mejor',
      'Exporta tu reporte completo en PDF con un clic — listo para tu contador o para ti',
      'Activa alertas inteligentes y WealthHost te avisa cuando algo merece tu atención',
    ],
    cta: 'Ver mi reporte financiero →',
  },

}
