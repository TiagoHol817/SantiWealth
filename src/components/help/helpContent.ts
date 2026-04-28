export interface ModuleHelp {
  id:    string
  icon:  string
  title: string
  steps: string[]
  cta:   string
  color: string
  stat?: string
}

export const HELP_CONTENT: Record<string, ModuleHelp> = {

  dashboard: {
    id:    'dashboard',
    icon:  '⚡',
    title: '¿Ves el panorama completo?',
    color: '#10b981',
    steps: [
      'Tu Wealth Score sube silenciosamente cada vez que mejoras una métrica',
      'El patrimonio neto es la única cifra que importa a largo plazo',
      'Los que revisan su dashboard semanalmente toman 3x mejores decisiones',
      'Cada módulo conectado te da una vista que pocos tienen de sus propias finanzas',
    ],
    stat: 'Quienes monitorean su patrimonio mensualmente lo duplican en la mitad del tiempo',
    cta: 'Entendido, quiero ver mi patrimonio →',
  },

  transacciones: {
    id:    'transacciones',
    icon:  '🎯',
    title: 'El mapa de tu dinero, en tiempo real',
    color: '#6366f1',
    steps: [
      'Todo movimiento que registras aparece organizado por categoría automáticamente',
      'Ve exactamente en qué rubros se va más de lo que crees',
      'Importa tu extracto CSV en segundos sin teclear nada',
      'Los patrones invisibles se vuelven obvios cuando los datos están aquí',
    ],
    stat: 'Quienes registran sus gastos ahorran en promedio 18% más sin esfuerzo adicional',
    cta: 'Registrar mi primera transacción →',
  },

  inversiones: {
    id:    'inversiones',
    icon:  '📈',
    title: 'Tu dinero trabaja. Tú decides cuánto.',
    color: '#6366f1',
    steps: [
      'Registra cualquier activo: acciones, fondos, crypto, CDTs, finca raíz',
      'Ve el rendimiento real vs lo que esperabas cuando empezaste',
      'Los que multiplican no improvisan — tienen todo en un solo lugar',
      'Conecta metas de inversión para ver cuándo llegas al número que quieres',
    ],
    stat: 'Quienes tienen visión de su portafolio toman mejores decisiones de entrada y salida',
    cta: 'Registrar mi primera inversión →',
  },

  presupuestos: {
    id:    'presupuestos',
    icon:  '🏆',
    title: 'Gasta con intención. No con culpa.',
    color: '#6366f1',
    steps: [
      'Define cuánto va a cada categoría antes de que llegue el mes',
      'El gauge de salud te dice si vas bien o necesitas ajustar',
      'Un presupuesto verde no significa que gastas poco — significa que gastas bien',
      'Los que se adelantan a sus gastos nunca quedan cortos al final del mes',
    ],
    stat: 'Los que presupuestan activamente reducen gastos innecesarios en un 27%',
    cta: 'Crear mi primer presupuesto →',
  },

  metas: {
    id:    'metas',
    icon:  '🚀',
    title: '¿Cuánto necesitas? ¿Para cuándo?',
    color: '#10b981',
    steps: [
      'Define la cifra exacta y la fecha límite — la app calcula lo que necesitas mensual',
      'Cada aporte mueve el marcador de la carrera financiera',
      'Las metas con fecha son promesas. Las que no, son sueños.',
      'Los que ganan en grande no improvisan — tienen un número y trabajan hacia él',
    ],
    stat: 'Quienes definen metas financieras escritas las cumplen 42% más que quienes no',
    cta: 'Definir mi primera meta →',
  },

  'costos-op': {
    id:    'costos-op',
    icon:  '💎',
    title: 'Conoce el costo real de tu nivel de vida',
    color: '#ef4444',
    steps: [
      'Registra todo lo que pagas periódicamente, pase lo que pase',
      'Ve cuántos días de trabajo necesitas solo para operar',
      'Los que tienen visión saben exactamente su piso financiero mínimo',
      'Optimizar costos fijos es el movimiento más inteligente antes de ganar más',
    ],
    stat: 'Quienes auditan sus costos fijos liberan en promedio 15% de su ingreso mensual',
    cta: 'Ver mis costos fijos →',
  },

  ingresos: {
    id:    'ingresos',
    icon:  '💰',
    title: '¿Sabes realmente cuánto generas al mes?',
    color: '#10b981',
    steps: [
      'Todo ingreso registrado en Transacciones aparece aquí organizado por fuente',
      'Ve qué porcentaje viene de tu trabajo, tu negocio, tus inversiones',
      'Proyecta tu ingreso anual y toma decisiones basadas en números reales',
      'Quienes conocen sus números negocian mejor y viven sin el freno del "no sé si me alcanza"',
    ],
    stat: 'Quienes conocen sus números cobran en promedio 23% más en sus próximas negociaciones',
    cta: 'Ver mis fuentes de ingreso →',
  },

  reportes: {
    id:    'reportes',
    icon:  '🔮',
    title: 'El patrón lo es todo',
    color: '#f59e0b',
    steps: [
      'Ve tu flujo de caja real: cuánto entra, cuánto sale, qué queda',
      'Detecta los meses donde siempre gastas más antes de que lleguen',
      'Los insights automáticos te dicen lo que los números no dicen solos',
      'Los que toman decisiones con datos llegan antes que los que improvisan',
    ],
    stat: 'Quienes revisan reportes mensuales detectan oportunidades que el resto no ve',
    cta: 'Ver mi reporte financiero →',
  },

}
