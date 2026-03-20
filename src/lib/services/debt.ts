/**
 * Servicio de análisis y proyección de deuda inmobiliaria.
 * Cubre específicamente el Apartamento Flandes y cualquier deuda con pagos históricos.
 */

export interface DebtSnapshot {
  /** Valor original de la deuda al tomar el crédito (COP) */
  originalDebt: number
  /** Saldo actual pendiente (COP, valor positivo) */
  currentBalance: number
  /** Cuota o abono promedio mensual histórico (COP) */
  avgMonthlyPayment: number
}

export interface DebtProjection {
  /** Monto ya pagado (COP) */
  amountPaid: number
  /** Porcentaje completado (0–100) */
  progressPct: number
  /** Meses restantes estimados hasta saldar la deuda */
  monthsRemaining: number
  /** Fecha estimada de liquidación total */
  estimatedPayoffDate: Date
  /** Monto de intereses estimados restantes (simplificado, sin tasa compuesta) */
  remainingBalance: number
}

/**
 * Constantes de la deuda del Apartamento Flandes.
 * Fuente: datos ingresados manualmente por el usuario.
 */
export const FLANDES_DEBT: DebtSnapshot = {
  originalDebt: 280_000_000,
  currentBalance: 239_000_000,
  avgMonthlyPayment: 1_400_000, // abono a capital mensual promedio (ajustable)
}

/**
 * Calcula la proyección de pago de una deuda a capital fijo.
 * Modelo simplificado lineal (sin interés compuesto) para estimación visual.
 * Para un modelo real, usar la fórmula de amortización francesa.
 *
 * @param snapshot - Estado actual de la deuda
 * @param referenceDate - Fecha de referencia para el cálculo (default: hoy)
 */
export function projectDebtPayoff(
  snapshot: DebtSnapshot,
  referenceDate: Date = new Date()
): DebtProjection {
  const { originalDebt, currentBalance, avgMonthlyPayment } = snapshot
  const amountPaid = originalDebt - currentBalance
  const progressPct = originalDebt > 0 ? Math.round((amountPaid / originalDebt) * 100) : 0

  // Evitar división por cero
  const monthsRemaining =
    avgMonthlyPayment > 0 ? Math.ceil(currentBalance / avgMonthlyPayment) : Infinity

  const estimatedPayoffDate = new Date(referenceDate)
  if (isFinite(monthsRemaining)) {
    estimatedPayoffDate.setMonth(estimatedPayoffDate.getMonth() + monthsRemaining)
  }

  return {
    amountPaid,
    progressPct,
    monthsRemaining,
    estimatedPayoffDate,
    remainingBalance: currentBalance,
  }
}

/**
 * Devuelve una descripción legible de la fecha estimada de pago.
 * Ejemplo: "Dic 2043"
 */
export function formatPayoffDate(date: Date): string {
  if (!isFinite(date.getTime())) return 'Indeterminado'
  return date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
}

/**
 * Genera una tabla de amortización simplificada (capital fijo) para los próximos N meses.
 * Útil para gráficos de proyección futura.
 */
export function generateAmortizationSchedule(
  snapshot: DebtSnapshot,
  months: number = 24
): Array<{ month: number; label: string; balance: number; payment: number }> {
  const { currentBalance, avgMonthlyPayment } = snapshot
  const schedule: Array<{ month: number; label: string; balance: number; payment: number }> = []
  let balance = currentBalance
  const start = new Date()

  for (let i = 0; i < months && balance > 0; i++) {
    const payment = Math.min(avgMonthlyPayment, balance)
    balance = Math.max(0, balance - payment)
    const date = new Date(start)
    date.setMonth(date.getMonth() + i + 1)
    const label = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
    schedule.push({ month: i + 1, label, balance, payment })
  }

  return schedule
}
