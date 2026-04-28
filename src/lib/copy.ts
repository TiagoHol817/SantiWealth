// ─────────────────────────────────────────────────────────────────
// WealthHost — Sistema de Copy de Marca
// Voz: aspiracional, sin etiquetas de profesión.
// El usuario no "aspira" a ganar — ya está en proceso.
// ─────────────────────────────────────────────────────────────────

export type CopyModule =
  | 'dashboard'
  | 'transacciones'
  | 'inversiones'
  | 'presupuestos'
  | 'metas'
  | 'costos'
  | 'ingresos'
  | 'reportes'

// ─── Saludos del Dashboard (SmartGreeting) ───────────────────────
export const GREETINGS = {
  morning: [
    'Buenos días. El dinero que mueves hoy, trabaja mañana.',
    'Mañana de los que construyen. ¿Qué mueves hoy?',
    'Cada decisión temprana vale el doble al final del mes.',
  ],
  afternoon: [
    'Tarde productiva. Tu patrimonio no para aunque tú descanses.',
    'Los que van en serio revisan sus números en la tarde.',
    'A mitad del día, a mitad del camino. Tú ya llevas ventaja.',
  ],
  evening: [
    'Cerrando el día con claridad financiera. Eso es poder.',
    'Los que terminan el día con sus cuentas claras duermen mejor.',
    'Un día más construyendo algo que dura. Bien hecho.',
  ],
  night: [
    'Tu dinero no duerme. Tú sí puedes, porque está todo controlado.',
    'Noche de cierre. Los que registran hoy, ganan mañana.',
    'Silencio nocturno, finanzas activas. Así funciona la ventaja.',
  ],
} satisfies Record<string, string[]>

export function getGreeting(name: string): string {
  const h = new Date().getHours()
  let pool: string[]
  if (h >= 5 && h < 12) pool = GREETINGS.morning
  else if (h >= 12 && h < 18) pool = GREETINGS.afternoon
  else if (h >= 18 && h < 22) pool = GREETINGS.evening
  else pool = GREETINGS.night

  const base = pool[Math.floor(Math.random() * pool.length)]
  // Insertar nombre si aplica
  if (name && Math.random() > 0.4) {
    return `${name}, ${base.charAt(0).toLowerCase()}${base.slice(1)}`
  }
  return base
}

// ─── Empty States (cuando no hay datos) ──────────────────────────
export const EMPTY_STATES: Record<CopyModule, { title: string; subtitle: string; cta: string }> = {
  dashboard: {
    title: 'Tu historia financiera empieza aquí',
    subtitle: 'Cada número que registres es un paso que te separa del promedio.',
    cta: 'Agregar primera cuenta',
  },
  transacciones: {
    title: 'Aquí vive el mapa de tu dinero',
    subtitle: 'Los que saben adónde va cada peso, saben cómo multiplicarlo.',
    cta: 'Registrar primer movimiento',
  },
  inversiones: {
    title: 'Tu dinero puede trabajar mientras tú descansas',
    subtitle: 'Quienes multiplican lo registran todo. Empieza con lo que tienes.',
    cta: 'Agregar primera inversión',
  },
  presupuestos: {
    title: 'Un presupuesto no te limita. Te da libertad.',
    subtitle: 'Los que se adelantan a sus gastos nunca quedan cortos.',
    cta: 'Crear mi presupuesto',
  },
  metas: {
    title: 'Los que ganan en grande empezaron con una cifra en mente',
    subtitle: '¿Cuál es la tuya? Ponla aquí y la app trabaja contigo para llegar.',
    cta: 'Definir mi primera meta',
  },
  costos: {
    title: 'Conoce el costo real de tu estilo de vida',
    subtitle: 'Quienes tienen visión saben exactamente qué necesitan para operar.',
    cta: 'Registrar costo fijo',
  },
  ingresos: {
    title: '¿Sabes realmente cuánto generas al mes?',
    subtitle: 'Quienes conocen sus números negocian mejor y viven sin límites.',
    cta: 'Registrar fuente de ingreso',
  },
  reportes: {
    title: 'Tu tablero de control te espera',
    subtitle: 'Cuando hayas movido cifras, aquí verás el patrón. Y el patrón lo es todo.',
    cta: 'Ver mis primeras cifras',
  },
}

// ─── Tooltips de ayuda (HelpModal) ───────────────────────────────
export const HELP_CONTENT: Record<
  CopyModule,
  { icon: string; headline: string; steps: string[]; stat?: string }
> = {
  dashboard: {
    icon: '⚡',
    headline: '¿Ves el panorama completo?',
    steps: [
      'Tu Wealth Score sube silenciosamente cada vez que mejoras una métrica',
      'El patrimonio neto es la única cifra que importa a largo plazo',
      'Los que revisan su dashboard semanalmente toman 3x mejores decisiones',
      'Cada módulo conectado te da una vista que pocos tienen de sus propias finanzas',
    ],
    stat: 'Quienes monitorean su patrimonio mensualmente lo duplican en la mitad del tiempo',
  },
  transacciones: {
    icon: '🎯',
    headline: 'El mapa de tu dinero, en tiempo real',
    steps: [
      'Todo movimiento que registras aparece organizado por categoría automáticamente',
      'Ve exactamente en qué rubros se va más de lo que crees',
      'Importa tu extracto CSV en segundos sin teclear nada',
      'Los patrones invisibles se vuelven obvios cuando los datos están aquí',
    ],
    stat: 'Quienes registran sus gastos ahorran en promedio 18% más sin esfuerzo adicional',
  },
  inversiones: {
    icon: '📈',
    headline: 'Tu dinero trabaja. Tú decides cuánto.',
    steps: [
      'Registra cualquier activo: acciones, fondos, crypto, CDTs, finca raíz',
      'Ve el rendimiento real vs lo que esperabas cuando empezaste',
      'Los que multiplican no improvisan — tienen todo en un solo lugar',
      'Conecta metas de inversión para ver cuándo llegas al número que quieres',
    ],
    stat: 'Quienes tienen visión de su portafolio toman mejores decisiones de entrada y salida',
  },
  presupuestos: {
    icon: '🏆',
    headline: 'Gasta con intención. No con culpa.',
    steps: [
      'Define cuánto va a cada categoría antes de que llegue el mes',
      'El gauge de salud te dice si vas bien o necesitas ajustar',
      'Un presupuesto verde no significa que gastas poco — significa que gastas bien',
      'Los que se adelantan a sus gastos nunca quedan cortos al final del mes',
    ],
    stat: 'Los que presupuestan activamente reducen gastos innecesarios en un 27%',
  },
  metas: {
    icon: '🚀',
    headline: '¿Cuánto necesitas? ¿Para cuándo?',
    steps: [
      'Define la cifra exacta y la fecha límite — la app calcula lo que necesitas mensual',
      'Cada aporte mueve el marcador de la carrera financiera',
      'Las metas con fecha son promesas. Las que no, son sueños.',
      'Los que ganan en grande no improvisan — tienen un número y trabajan hacia él',
    ],
    stat: 'Quienes definen metas financieras escritas las cumplen 42% más que quienes no',
  },
  costos: {
    icon: '💎',
    headline: 'Conoce el costo real de tu nivel de vida',
    steps: [
      'Registra todo lo que pagas periódicamente, pase lo que pase',
      'Ve cuántos días de trabajo necesitas solo para operar',
      'Los que tienen visión saben exactamente su piso financiero mínimo',
      'Optimizar costos fijos es el movimiento más inteligente antes de ganar más',
    ],
    stat: 'Quienes auditan sus costos fijos liberan en promedio 15% de su ingreso mensual',
  },
  ingresos: {
    icon: '💰',
    headline: '¿Sabes realmente cuánto generas al mes?',
    steps: [
      'Todo ingreso registrado en Transacciones aparece aquí organizado por fuente',
      'Ve qué porcentaje viene de tu trabajo, tu negocio, tus inversiones',
      'Proyecta tu ingreso anual y toma decisiones basadas en números reales',
      'Quienes conocen sus números negocian mejor y viven sin el freno del "no sé si me alcanza"',
    ],
    stat: 'Quienes conocen sus números cobran en promedio 23% más en sus próximas negociaciones',
  },
  reportes: {
    icon: '🔮',
    headline: 'El patrón lo es todo',
    steps: [
      'Ve tu flujo de caja real: cuánto entra, cuánto sale, qué queda',
      'Detecta los meses donde siempre gastas más antes de que lleguen',
      'Los insights automáticos te dicen lo que los números no dicen solos',
      'Los que toman decisiones con datos llegan antes que los que improvisan',
    ],
    stat: 'Quienes revisan reportes mensuales detectan oportunidades que el resto no ve',
  },
}

// ─── Toasts de logro (al crear / completar algo) ─────────────────
export const ACHIEVEMENT_TOASTS: Record<string, string[]> = {
  transaction_added: [
    'Un registro más. El mapa se hace más claro.',
    'Eso es control. Cada movimiento cuenta.',
    'Registrado. Los que saben adónde va, saben cómo crecer.',
  ],
  goal_created: [
    'Meta creada. Los que escriben sus metas las cumplen.',
    'Ahora la app trabaja contigo para llegar a esa cifra.',
    'Un número con fecha es una promesa. Esta es la tuya.',
  ],
  goal_milestone: [
    '¡Hito alcanzado! Así es como se construye patrimonio.',
    'Milestone completado. Sigue — ya tienes el ritmo.',
    'Paso cumplido. Los que no paran, llegan.',
  ],
  budget_created: [
    'Presupuesto listo. Ahora gastas con intención.',
    'Los que planean su mes lo terminan con más.',
    'Control activado. El mes ya no te sorprende.',
  ],
  investment_added: [
    'Inversión registrada. Tu dinero ya trabaja por ti.',
    'Nuevo activo. Así se construye portafolio.',
    'Los que multiplican lo registran todo. Buen movimiento.',
  ],
  income_added: [
    'Fuente de ingreso agregada. Claridad total.',
    'Los que conocen sus números nunca negocian a ciegas.',
    'Ingreso registrado. El panorama se hace más poderoso.',
  ],
  account_created: [
    'Cuenta creada. El tablero de control toma forma.',
    'Primera cuenta lista. Esto apenas empieza.',
    'Cada cuenta conectada es un punto de poder más.',
  ],
  csv_imported: [
    'Importación lista. Meses de historial en segundos.',
    'Datos cargados. Ahora los patrones son visibles.',
    'Eso es eficiencia. Los que se mueven rápido, llegan primero.',
  ],
  onboarding_complete: [
    'Configuración lista. Tu tablero de poder está activo.',
    'Todo en su lugar. A partir de aquí, solo hacia adelante.',
    'WealthHost listo. Los que empiezan bien, terminan mejor.',
  ],
}

export function getAchievementToast(event: keyof typeof ACHIEVEMENT_TOASTS): string {
  const pool = ACHIEVEMENT_TOASTS[event] ?? ['Bien hecho. Sigue construyendo.']
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Mensajes de Wealth Score ─────────────────────────────────────
export const WEALTH_SCORE_MESSAGES: Record<string, { label: string; message: string }> = {
  starting: {
    label: 'Arrancando',
    message: 'Todo patrimonio sólido empezó en cero. Este es tu punto de partida.',
  },
  building: {
    label: 'Construyendo',
    message: 'Ya estás en movimiento. Los que no paran, llegan.',
  },
  growing: {
    label: 'Creciendo',
    message: 'Momentum activo. Sigue — la diferencia entre tú y el promedio ya es visible.',
  },
  advancing: {
    label: 'Avanzando',
    message: 'Control financiero real. No muchos llegan aquí. Tú ya estás.',
  },
  winning: {
    label: 'Ganando',
    message: 'Nivel de los que van en serio. Tu dinero trabaja, tú decides.',
  },
  mastery: {
    label: 'Maestría',
    message: 'Patrimonio sólido, visión clara, movimientos con intención. Esto es poder.',
  },
}

export function getWealthScoreMessage(score: number): { label: string; message: string } {
  if (score < 10) return WEALTH_SCORE_MESSAGES.starting
  if (score < 30) return WEALTH_SCORE_MESSAGES.building
  if (score < 50) return WEALTH_SCORE_MESSAGES.growing
  if (score < 70) return WEALTH_SCORE_MESSAGES.advancing
  if (score < 90) return WEALTH_SCORE_MESSAGES.winning
  return WEALTH_SCORE_MESSAGES.mastery
}

// ─── Copy de la landing page / precios ────────────────────────────
export const PRICING_COPY = {
  free: {
    name: 'Inicio',
    tagline: 'Para los que están empezando a ver el panorama',
    cta: 'Empezar gratis',
  },
  pro: {
    name: 'Pro',
    tagline: 'Para los que van en serio con su patrimonio',
    cta: 'Quiero el control total',
    badge: 'Más popular',
  },
  premium: {
    name: 'Premium',
    tagline: 'Para los que multiplican y no dejan nada al azar',
    cta: 'Activar poder máximo',
    badge: 'Para los que ganan en grande',
  },
}
