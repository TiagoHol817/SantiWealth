/**
 * Servicio de conversión de moneda COP <-> USD.
 * Consume la API pública de datos.gov.co para la TRM oficial del Banco de la República.
 * Fallback: tasa fija de 4.200 COP/USD si la API no responde.
 */

export interface TRMResult {
  rate: number
  source: 'api' | 'fallback'
  date: string
}

const TRM_FALLBACK = 4200
const TRM_API_URL =
  'https://www.datos.gov.co/resource/mcec-87by.json?$limit=1&$order=vigenciadesde DESC'

/**
 * Obtiene la TRM vigente desde la API del gobierno colombiano.
 * Cachea la respuesta por 1 hora (Next.js ISR revalidation).
 */
export async function getTRM(): Promise<TRMResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await fetch(TRM_API_URL, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate = parseFloat(data[0]?.valor)
    if (!rate || isNaN(rate)) throw new Error('Invalid rate value')
    return { rate, source: 'api', date: data[0]?.vigenciadesde?.slice(0, 10) ?? today }
  } catch {
    return { rate: TRM_FALLBACK, source: 'fallback', date: today }
  }
}

/** Convierte un monto COP a USD usando la TRM dada. */
export function copToUsd(amountCOP: number, trm: number): number {
  return trm > 0 ? amountCOP / trm : 0
}

/** Convierte un monto USD a COP usando la TRM dada. */
export function usdToCop(amountUSD: number, trm: number): number {
  return amountUSD * trm
}

/**
 * Normaliza cualquier monto a COP según su moneda original.
 * Soporta 'COP' y 'USD'.
 */
export function normalizeToCOP(
  amount: number | string | null | undefined,
  currency: string,
  trm: number
): number {
  const n = Number(amount) || 0
  return currency === 'USD' ? usdToCop(n, trm) : n
}

/** Formatea un número como moneda COP. */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Formatea un número como moneda USD. */
export function formatUSD(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Formatea según la moneda indicada. */
export function formatByCurrency(
  value: number | string | null | undefined,
  currency: string
): string {
  const n = Number(value) || 0
  return currency === 'USD' ? formatUSD(n) : formatCOP(n)
}
