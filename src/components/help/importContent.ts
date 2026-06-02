/**
 * Tutorial content for the screenshot-import modals. Pure product strings —
 * same for every user. No user-specific data here.
 */

export type ImportType = 'investments' | 'transactions'

export interface ImportStep {
  icon:  string
  title: string
  body:  string
}

export interface ImportTutorial {
  title:       string
  accentColor: 'green' | 'red'
  steps:       ImportStep[]
}

export const importContent: Record<ImportType, ImportTutorial> = {
  investments: {
    title:       'Cómo importar tu portafolio',
    accentColor: 'green',
    steps: [
      {
        icon:  '📸',
        title: 'La captura correcta',
        body:  'Toma una captura de la pantalla de detalle de UN activo en tu broker. Debe mostrar: ticker (ej: MSFT), cantidad de unidades y costo promedio.',
      },
      {
        icon:  '🏦',
        title: 'Brokers soportados',
        body:  'Funciona con Hapi, Toro Trading, Trii, Robinhood, Binance, Coinbase y más. Si tu broker no aparece, la app intentará leerlo igualmente con detección genérica.',
      },
      {
        icon:  '✂️',
        title: 'Recorta para mayor precisión',
        body:  'Si capturas pantalla completa, el OCR puede leer pestañas del navegador o notificaciones. Usa "Recortar primero" para marcar solo el área de tu activo y obtener resultados más precisos.',
      },
      {
        icon:  '🔒',
        title: 'Privacidad total',
        body:  'La imagen se procesa 100% en tu navegador con OCR local. Nunca sale de tu dispositivo. Sin servidores, sin nube, sin riesgo de filtración.',
      },
      {
        icon:  '✓',
        title: 'Revisa antes de guardar',
        body:  'Después del análisis, podrás editar cualquier dato antes de guardar. Si el OCR leyó mal algo, lo corriges con un click.',
      },
    ],
  },

  transactions: {
    title:       'Cómo importar tus movimientos',
    accentColor: 'red',
    steps: [
      {
        icon:  '📸',
        title: 'La captura correcta',
        body:  'Toma una captura de la pantalla de movimientos de tu app bancaria. Debe mostrar fecha, descripción y monto de cada transacción.',
      },
      {
        icon:  '🏛️',
        title: 'Bancos soportados',
        body:  'Funciona con Bancolombia, Nequi, Daviplata, BBVA, Davivienda y más. Si tu banco no aparece, la app intentará leerlo igualmente con detección genérica.',
      },
      {
        icon:  '✂️',
        title: 'Recorta para mayor precisión',
        body:  'Si capturas pantalla completa, recorta solo el área del historial de movimientos. Excluye encabezados de saldo, sidebar y barras de navegación.',
      },
      {
        icon:  '🔒',
        title: 'Privacidad total',
        body:  'La imagen se procesa 100% en tu navegador con OCR local. Nunca sale de tu dispositivo. Sin servidores, sin nube, sin riesgo de filtración.',
      },
      {
        icon:  '✓',
        title: 'Revisa antes de guardar',
        body:  'Después del análisis verás una tabla editable. Puedes deseleccionar movimientos, corregir montos o cambiar categorías antes de confirmar.',
      },
    ],
  },
}
