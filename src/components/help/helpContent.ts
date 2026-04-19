export interface HelpStep {
  icon:  string
  title: string
  desc:  string
}

export interface HelpTip {
  type: 'tip' | 'warning' | 'info'
  text: string
}

export interface ModuleHelp {
  id:          string
  title:       string
  subtitle:    string
  icon:        string
  color:       string
  description: string
  steps:       HelpStep[]
  tips:        HelpTip[]
  flow?:       { label: string; icon: string; color: string }[]
}

export const HELP_CONTENT: Record<string, ModuleHelp> = {

  dashboard: {
    id:          'dashboard',
    title:       'Dashboard',
    subtitle:    'Tu centro de control financiero',
    icon:        '🏦',
    color:       '#10b981',
    description: 'El Dashboard es tu resumen financiero personal. Muestra en un solo vistazo tu patrimonio neto, la evolución de tus activos y el progreso hacia tus compromisos más importantes.',
    steps: [
      { icon: '💰', title: 'Patrimonio neto',       desc: 'Es la suma de todo lo que tienes (cuentas, inversiones, criptomonedas) menos lo que debes. Se actualiza automáticamente con cada movimiento que registres.' },
      { icon: '📈', title: 'Variación diaria',      desc: 'Compara tu patrimonio de hoy con el del día anterior. El color verde indica crecimiento; el rojo, una disminución.' },
      { icon: '📌', title: 'Compromiso destacado',  desc: 'Muestra el progreso de la meta que hayas fijado como recordatorio principal. Puedes configurar cuál aparece aquí desde el módulo de Metas.' },
      { icon: '📊', title: 'Gráfico de evolución',  desc: 'Visualiza cómo ha cambiado tu patrimonio a lo largo del tiempo. Usa los botones 7D, 30D y 90D para cambiar el rango de fechas.' },
    ],
    tips: [
      { type: 'tip',  text: 'Para que el gráfico de evolución muestre tu historial, guarda un resumen diario con el botón que aparece al fondo de esta página.' },
      { type: 'info', text: 'Los precios de tus inversiones y criptomonedas se actualizan automáticamente en tiempo real.' },
      { type: 'info', text: 'Si el valor de la tasa de cambio aparece marcado como "Tasa estimada", significa que se está usando un valor de referencia mientras el sistema actualiza el dato oficial.' },
    ],
    flow: [
      { label: 'Transacciones', icon: '💳', color: '#6366f1' },
      { label: 'Inversiones',   icon: '📈', color: '#10b981' },
      { label: 'Dashboard',     icon: '🏦', color: '#f59e0b' },
    ],
  },

  transacciones: {
    id:          'transacciones',
    title:       'Transacciones',
    subtitle:    'Registro completo de tu flujo de dinero',
    icon:        '💳',
    color:       '#6366f1',
    description: 'Aquí registras cada movimiento de dinero: ingresos, gastos y pagos de compromisos financieros. Estos datos alimentan automáticamente el Dashboard, los Reportes, el módulo de Ingresos y los Presupuestos.',
    steps: [
      { icon: '➕', title: 'Nueva transacción',  desc: 'Toca el botón verde y elige el tipo: Gasto, Ingreso o Pago de deuda. Completa el monto, la categoría y la fecha. La descripción es opcional.' },
      { icon: '🔍', title: 'Buscar y filtrar',   desc: 'Escribe en la barra de búsqueda para encontrar cualquier movimiento por descripción, categoría o monto. Los botones de tipo te permiten ver solo ingresos, gastos o deudas.' },
      { icon: '✏️', title: 'Editar movimiento',  desc: 'Pasa el cursor sobre cualquier transacción para que aparezca el ícono de edición. Desde allí puedes corregir cualquier dato.' },
      { icon: '📊', title: 'Resumen del período', desc: 'Los cuatro indicadores en la parte superior muestran el total de ingresos, gastos, pagos de compromisos y el balance del período que estás viendo.' },
    ],
    tips: [
      { type: 'tip',     text: 'Cuando registres un ingreso, elige bien la fuente en el campo de categoría. Así el módulo de Ingresos podrá mostrarte el desglose por origen de dinero.' },
      { type: 'tip',     text: 'Los pagos de compromisos financieros (como abonos a créditos o apartamentos) son diferentes a los gastos del día a día. Regístralos con el tipo "Pago de deuda" para que aparezcan correctamente en tus reportes.' },
      { type: 'warning', text: 'Eliminar una transacción es permanente. Si cometiste un error, usa la opción de editar en lugar de eliminar.' },
    ],
  },

  inversiones: {
    id:          'inversiones',
    title:       'Inversiones',
    subtitle:    'Portafolio en tiempo real',
    icon:        '📈',
    color:       '#6366f1',
    description: 'Monitorea el desempeño de tu portafolio de acciones, ETFs, criptomonedas y certificados de depósito. Todos los precios se actualizan automáticamente.',
    steps: [
      { icon: '📊', title: 'Portafolio',         desc: 'Muestra cada uno de tus activos con su precio actual, el cambio del día, y si estás en ganancia o pérdida frente a lo que pagaste originalmente.' },
      { icon: '📄', title: 'Renta Fija',          desc: 'Aquí aparecen tus certificados de depósito (CDTs) con la tasa de rendimiento, el dinero proyectado al vencimiento y los días que faltan.' },
      { icon: '🍩', title: 'Distribución visual', desc: 'El gráfico circular muestra cómo está repartido tu portafolio. Pasa el cursor sobre cada sección para ver los detalles. Puedes cambiar entre pesos colombianos y dólares.' },
      { icon: '📏', title: 'Rango del día',       desc: 'La barra bajo cada activo te indica si el precio actual está cerca del mínimo o del máximo que ha tenido hoy.' },
    ],
    tips: [
      { type: 'info', text: 'Los precios de tus activos se actualizan automáticamente. Si necesitas ver el dato más reciente, usa el botón ↻ Actualizar.' },
      { type: 'tip',  text: 'El costo promedio de compra (DCA) te ayuda a entender si tu inversión está generando ganancias o pérdidas respecto a lo que pagaste.' },
      { type: 'tip',  text: 'Si un activo muestra $0, verifica que el nombre del activo esté escrito correctamente en tu perfil de inversiones.' },
    ],
  },

  presupuestos: {
    id:          'presupuestos',
    title:       'Presupuestos',
    subtitle:    'Control de límites de gasto',
    icon:        '🎯',
    color:       '#6366f1',
    description: 'Define cuánto quieres gastar por categoría cada mes. La app hace el seguimiento automático y te alerta cuando te estás acercando o superando tus límites.',
    steps: [
      { icon: '⚙️', title: 'Configurar límites',   desc: 'Toca "Configurar presupuesto" y asigna un monto máximo a cada categoría de gasto para el mes. Solo necesitas hacerlo una vez.' },
      { icon: '📋', title: 'Copiar mes anterior',   desc: 'Si ya configuraste un presupuesto antes, el botón "Copiar mes anterior" trae todos tus límites con un solo toque. No tienes que empezar desde cero.' },
      { icon: '🔴', title: 'Alertas de color',      desc: 'Rojo significa que superaste el límite de esa categoría. Amarillo significa que ya usaste más del 80%. Verde indica que estás dentro del presupuesto.' },
      { icon: '💯', title: 'Puntuación de salud',   desc: 'Un número de 0 a 100 que resume qué tan bien estás controlando tus gastos este mes. Entre más alto, mejor.' },
    ],
    tips: [
      { type: 'tip',  text: 'No necesitas ingresar nada manualmente. El sistema toma los gastos que ya registraste en Transacciones y los compara con tus límites.' },
      { type: 'tip',  text: 'Usa las flechas ← y → para revisar cómo te fue en meses anteriores y comparar tu evolución.' },
      { type: 'info', text: 'La tabla comparativa con el mes anterior aparece automáticamente cuando tienes datos de al menos dos meses consecutivos.' },
    ],
  },

  metas: {
    id:          'metas',
    title:       'Metas Financieras',
    subtitle:    'Seguimiento de tus objetivos',
    icon:        '🏆',
    color:       '#10b981',
    description: 'Define los objetivos financieros que quieres alcanzar: una casa, un viaje, un fondo de emergencia, lo que sea. La app proyecta automáticamente cuándo podrías lograrlo según tus hábitos de ahorro.',
    steps: [
      { icon: '➕', title: 'Crear una meta',        desc: 'Dale un nombre, un ícono y un monto objetivo. Puedes agregar una fecha límite y configurar con cuánta frecuencia planeas aportar dinero.' },
      { icon: '🔄', title: 'Actualizar el progreso', desc: 'Cada vez que aportes dinero hacia una meta, actualiza el saldo con el botón correspondiente para ver el avance en tiempo real.' },
      { icon: '🏅', title: 'Hitos de progreso',     desc: 'Al alcanzar el 25%, 50%, 75% y 100% de una meta, los indicadores se iluminan automáticamente para celebrar tu avance.' },
      { icon: '📅', title: 'Plan de aportes',        desc: 'Configura cuánto dinero planeas aportar y con qué frecuencia (semanal, quincenal o mensual). La app calculará cuándo llegarías a tu objetivo.' },
    ],
    tips: [
      { type: 'tip',  text: 'Activa la opción "Mostrar en Dashboard" en la meta más importante. Aparecerá como recordatorio cada vez que abras la app.' },
      { type: 'tip',  text: 'La fecha estimada se recalcula automáticamente cada mes según tus ingresos y gastos reales. Entre más ahorres, más cercana será la fecha.' },
      { type: 'info', text: 'Puedes tener varias metas activas al mismo tiempo. Solo una puede mostrarse como recordatorio principal en el Dashboard.' },
    ],
  },

  'costos-op': {
    id:          'costos-op',
    title:       'Costos Fijos',
    subtitle:    'Gastos recurrentes bajo control',
    icon:        '💸',
    color:       '#ef4444',
    description: 'Lleva un registro de todos tus gastos fijos mensuales: arriendo, servicios, suscripciones. Así siempre sabes cuánto dinero "sale solo" cada mes antes de cualquier gasto variable.',
    steps: [
      { icon: '➕', title: 'Agregar un costo',     desc: 'Registra el nombre, la categoría y el monto. Si un costo es temporal, puedes marcarlo como inactivo en lugar de eliminarlo.' },
      { icon: '📊', title: 'Tendencia mensual',    desc: 'El gráfico muestra cómo han variado tus gastos fijos mes a mes. La línea punteada representa tu promedio histórico.' },
      { icon: '⚠️', title: 'Alertas automáticas',  desc: 'Si alguna categoría de gasto sube significativamente respecto a meses anteriores, recibirás una alerta para que lo revises.' },
      { icon: '📈', title: 'Impacto anual',        desc: 'El indicador "Total anual" te muestra cuánto representan tus costos fijos a lo largo de un año completo.' },
    ],
    tips: [
      { type: 'tip',     text: 'Cuando canceles una suscripción o servicio, márcalo como "inactivo" en lugar de eliminarlo. Así conservas el historial para comparaciones futuras.' },
      { type: 'warning', text: 'Este módulo es un registro de referencia. Para que tus costos fijos aparezcan en los Reportes financieros, recuerda también registrarlos como transacciones de gasto.' },
      { type: 'info',    text: 'La comparativa con el mes anterior se calcula automáticamente desde tus transacciones registradas.' },
    ],
  },

  ingresos: {
    id:          'ingresos',
    title:       'Ingresos',
    subtitle:    'Conoce de dónde viene tu dinero',
    icon:        '💰',
    color:       '#10b981',
    description: 'Visualiza y analiza todas tus fuentes de ingreso. Entiende de dónde viene tu dinero, qué tan diversificadas están tus fuentes y cómo ha evolucionado tu capacidad de generar ingresos.',
    steps: [
      { icon: '📝', title: 'Cómo registrar ingresos', desc: 'Ve a Transacciones, crea una nueva entrada con tipo "Ingreso" y elige la fuente en el campo correspondiente. Así aparecerá clasificado aquí automáticamente.' },
      { icon: '📊', title: 'Distribución por fuente',  desc: 'La barra de colores muestra qué porcentaje de tus ingresos viene de cada fuente. Cuanto más diversificada, más estable es tu situación financiera.' },
      { icon: '⚠️', title: 'Alerta de dependencia',   desc: 'Si más del 70% de tus ingresos proviene de una sola fuente, aparece una alerta. Depender de una sola fuente es un riesgo financiero.' },
      { icon: '📈', title: 'Historial',                desc: 'El tab "Historial" muestra cómo han evolucionado tus ingresos por fuente durante los últimos meses.' },
    ],
    tips: [
      { type: 'tip',  text: 'Usa un nombre consistente para cada fuente de ingreso. Si cambias el nombre entre meses, la app lo tratará como una fuente diferente.' },
      { type: 'info', text: 'Los datos de este módulo alimentan directamente la sección de ingresos de tus Reportes financieros.' },
      { type: 'tip',  text: 'Puedes usar nombres tan específicos como quieras para tus fuentes. La información es completamente privada y solo la ves tú.' },
    ],
    flow: [
      { label: 'Transacciones', icon: '💳', color: '#6366f1' },
      { label: 'Ingresos',      icon: '💰', color: '#10b981' },
      { label: 'Reportes',      icon: '📊', color: '#f59e0b' },
    ],
  },

  reportes: {
    id:          'reportes',
    title:       'Reportes Financieros',
    subtitle:    'Tu situación financiera en números reales',
    icon:        '📊',
    color:       '#f59e0b',
    description: 'Genera automáticamente informes financieros profesionales basados en tus datos reales. Sin trabajo manual: la app organiza todo lo que has registrado en formatos claros y accionables.',
    steps: [
      { icon: '📋', title: 'Estado de Resultados', desc: 'Muestra cuánto ganaste, cuánto gastaste y cuánto te quedó en un período. El margen neto te indica qué porcentaje de tus ingresos lograste conservar.' },
      { icon: '⚖️', title: 'Balance General',      desc: 'Compara lo que tienes (cuentas, inversiones) contra lo que debes. La diferencia es tu patrimonio neto real.' },
      { icon: '🌊', title: 'Flujo de Caja',        desc: 'Una tabla que muestra mes a mes tus ingresos, gastos y balance. Te ayuda a identificar los meses donde gastas más o generas más.' },
      { icon: '📅', title: 'Períodos de análisis', desc: 'Cambia entre Semana, Quincenal, Mes o Año para analizar cualquier período. El selector de mes te permite revisar meses anteriores.' },
    ],
    tips: [
      { type: 'tip',     text: 'Entre más completo sea tu registro de transacciones, más precisos serán tus reportes. Trata de registrar todos tus movimientos, no solo algunos.' },
      { type: 'info',    text: 'El Balance General siempre refleja tu situación actual, sin importar el período que hayas seleccionado para el Estado de Resultados.' },
      { type: 'warning', text: 'Si los reportes muestran cifras en cero, asegúrate de haber registrado transacciones en el período que estás consultando.' },
    ],
    flow: [
      { label: 'Transacciones', icon: '💳', color: '#6366f1' },
      { label: 'Ingresos',      icon: '💰', color: '#10b981' },
      { label: 'Reportes',      icon: '📊', color: '#f59e0b' },
    ],
  },

}