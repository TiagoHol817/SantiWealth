/**
 * 6-dimension Wealth Score, 0-100. Every threshold below is a PRODUCT-LEVEL
 * constant — same for every user. User-specific values come from DB queries
 * scoped by user_id. No hardcoded user data.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type DimensionStatus = 'no_data' | 'critical' | 'warning' | 'ok' | 'excellent'

export interface DimensionResult {
  key:         string
  label:       string
  score:       number     // earned
  max:         number     // maximum possible
  status:      DimensionStatus
  detail:      string     // user-facing one-liner with the actual computed value
  /** Optional href so the UI can deep-link to the relevant module for improvement. */
  href?:       string
}

export interface WealthScoreResult {
  score:       number     // 0..100
  label:       string
  color:       string
  breakdown:   DimensionResult[]
}

// ── Product-level grade mapping ─────────────────────────────────────────────
function gradeFor(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excelente',          color: '#10b981' }
  if (score >= 70) return { label: 'Muy bueno',          color: '#22d3ee' }
  if (score >= 55) return { label: 'Bueno',              color: '#6366f1' }
  if (score >= 40) return { label: 'En desarrollo',      color: '#a78bfa' }
  if (score >= 25) return { label: 'Necesita atención',  color: '#f59e0b' }
  return                   { label: 'Empezando',         color: '#ef4444' }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function statusFromRatio(score: number, max: number): DimensionStatus {
  if (max === 0) return 'no_data'
  const r = score / max
  if (r >= 0.85) return 'excellent'
  if (r >= 0.55) return 'ok'
  if (r >= 0.25) return 'warning'
  return 'critical'
}

// ── Main entrypoint ─────────────────────────────────────────────────────────
export async function computeWealthScore(
  userId:   string,
  supabase: SupabaseClient,
): Promise<WealthScoreResult> {
  const dims: DimensionResult[] = []

  // ── 1. SAVINGS RATE (max 25) ─────────────────────────────────────────────
  const since30 = daysAgoISO(30)
  const { data: tx30 } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', since30)

  const income30  = (tx30 ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense30 = (tx30 ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const rate      = income30 > 0 ? ((income30 - expense30) / income30) * 100 : 0
  let savingsScore = 0
  if      (income30 === 0) savingsScore = 0
  else if (rate >= 30)     savingsScore = 25
  else if (rate >= 20)     savingsScore = 20
  else if (rate >= 10)     savingsScore = 15
  else if (rate >= 5)      savingsScore = 10
  else if (rate >= 0)      savingsScore = 5
  dims.push({
    key:    'savings_rate',
    label:  'Tasa de ahorro',
    score:  savingsScore,
    max:    25,
    status: income30 === 0 ? 'no_data' : statusFromRatio(savingsScore, 25),
    detail: income30 === 0
      ? 'Registra ingresos del último mes para calcular tu tasa de ahorro.'
      : `Ahorras el ${rate.toFixed(1)}% de tus ingresos.`,
    href:   '/transacciones',
  })

  // ── 2. EMERGENCY FUND (max 20) ───────────────────────────────────────────
  const { data: accountsList } = await supabase
    .from('accounts')
    .select('current_balance, currency, type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('type', ['bank', 'cash'])

  const liquidCash = (accountsList ?? []).reduce((s, a) => s + (Number(a.current_balance) || 0), 0)

  const since90 = daysAgoISO(90)
  const { data: tx90 } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', since90)
  const expense90 = (tx90 ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const avgMonthlyExpense = expense90 / 3

  const months = avgMonthlyExpense > 0 ? liquidCash / avgMonthlyExpense : 0
  let emergencyScore = 0
  if      (months >= 6) emergencyScore = 20
  else if (months >= 4) emergencyScore = 15
  else if (months >= 2) emergencyScore = 10
  else if (months >= 1) emergencyScore = 5
  dims.push({
    key:    'emergency_fund',
    label:  'Fondo de emergencia',
    score:  emergencyScore,
    max:    20,
    status: avgMonthlyExpense === 0 ? 'no_data' : statusFromRatio(emergencyScore, 20),
    detail: avgMonthlyExpense === 0
      ? 'Sin gastos registrados — agrega transacciones para evaluar tu fondo.'
      : `Cubres ${months.toFixed(1)} meses de gastos con tu efectivo líquido.`,
    href:   '/configuracion/cuentas',
  })

  // ── 3. DIVERSIFICATION (max 20) ──────────────────────────────────────────
  // We compute totals per asset class and count classes with >=10% of total.
  const [{ data: assetsList }, { data: txInv }, { data: cdtsList }] = await Promise.all([
    supabase.from('investment_assets')
      .select('id, asset_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase.from('investment_transactions')
      .select('asset_id, type, shares, price_usd, fee_usd, total_usd')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('cdts')
      .select('capital')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  const sumByClass: Record<string, number> = { liquid: 0, stocks: 0, etf: 0, crypto: 0, fund: 0, real_estate: 0, cdt: 0 }
  sumByClass.liquid = liquidCash
  for (const c of cdtsList ?? []) sumByClass.cdt += Number(c.capital) || 0

  const assetById = new Map<string, string>()
  for (const a of assetsList ?? []) assetById.set(a.id, String(a.asset_type ?? 'other'))
  for (const t of txInv ?? []) {
    const cls   = assetById.get(String(t.asset_id))
    if (!cls) continue
    const shares = Number(t.shares) || 0
    const total  = Number(t.total_usd) || (Number(t.price_usd) * shares + (Number(t.fee_usd) || 0))
    const sign   = t.type === 'buy' || t.type === 'transfer_in' ? 1 : -1
    if (cls in sumByClass) sumByClass[cls] += sign * total
  }
  const totalAssets    = Object.values(sumByClass).reduce((s, n) => s + Math.max(0, n), 0)
  const classesAbove10 = totalAssets > 0
    ? Object.values(sumByClass).filter((v) => v > 0 && (v / totalAssets) >= 0.10).length
    : 0
  let diversificationScore = 0
  if      (classesAbove10 >= 5) diversificationScore = 20
  else if (classesAbove10 >= 4) diversificationScore = 18
  else if (classesAbove10 >= 3) diversificationScore = 15
  else if (classesAbove10 >= 2) diversificationScore = 10
  else if (classesAbove10 >= 1) diversificationScore = 5
  dims.push({
    key:    'diversification',
    label:  'Diversificación',
    score:  diversificationScore,
    max:    20,
    status: totalAssets === 0 ? 'no_data' : statusFromRatio(diversificationScore, 20),
    detail: totalAssets === 0
      ? 'Agrega activos para evaluar la diversificación.'
      : `${classesAbove10} clase${classesAbove10 === 1 ? '' : 's'} de activos con al menos 10% del total.`,
    href:   '/inversiones',
  })

  // ── 4. INVESTMENT RATIO (max 15) ─────────────────────────────────────────
  const invested     = sumByClass.stocks + sumByClass.etf + sumByClass.fund + sumByClass.crypto + sumByClass.cdt
  const ratio        = totalAssets > 0 ? (invested / totalAssets) * 100 : 0
  let investmentScore = 0
  if      (ratio >= 60 && ratio <= 80) investmentScore = 15
  else if (ratio >= 40 && ratio < 60)  investmentScore = 12
  else if (ratio >= 80 && ratio <= 90) investmentScore = 12
  else if (ratio >= 20 && ratio < 40)  investmentScore = 8
  else if (ratio > 90)                 investmentScore = 6
  else if (ratio >= 5)                 investmentScore = 4
  dims.push({
    key:    'investment_ratio',
    label:  'Ratio de inversión',
    score:  investmentScore,
    max:    15,
    status: totalAssets === 0 ? 'no_data' : statusFromRatio(investmentScore, 15),
    detail: totalAssets === 0
      ? 'Agrega activos para evaluar tu ratio de inversión.'
      : `${ratio.toFixed(0)}% de tu patrimonio está invertido.`,
    href:   '/inversiones',
  })

  // ── 5. GOALS PROGRESS (max 10) ───────────────────────────────────────────
  const { data: goalsList } = await supabase
    .from('investment_goals')
    .select('current_amount, target_amount')
    .eq('user_id', userId)

  let avgProgress = 0
  const validGoals = (goalsList ?? []).filter((g) => Number(g.target_amount) > 0)
  if (validGoals.length > 0) {
    avgProgress = validGoals.reduce((s, g) => s + Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100), 0) / validGoals.length
  }
  let goalsScore = 0
  if      (avgProgress >= 80) goalsScore = 10
  else if (avgProgress >= 60) goalsScore = 8
  else if (avgProgress >= 40) goalsScore = 6
  else if (avgProgress >= 20) goalsScore = 4
  else if (avgProgress >= 5)  goalsScore = 2
  dims.push({
    key:    'goals_progress',
    label:  'Progreso de metas',
    score:  goalsScore,
    max:    10,
    status: validGoals.length === 0 ? 'no_data' : statusFromRatio(goalsScore, 10),
    detail: validGoals.length === 0
      ? 'Define al menos una meta para ganar puntos aquí.'
      : `Progreso promedio de ${avgProgress.toFixed(0)}% en tus metas.`,
    href:   '/metas',
  })

  // ── 6. CONSTANCY (max 10) ────────────────────────────────────────────────
  const days = new Set<string>()
  for (const t of tx90 ?? []) {
    // tx90 was selected with only type/amount — need a separate query for dates.
  }
  // Pull tx dates from last 90d for the constancy signal.
  const { data: tx90Dates } = await supabase
    .from('transactions')
    .select('date')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', since90)
  for (const t of tx90Dates ?? []) days.add(String(t.date))

  let constancyScore = 0
  if      (days.size >= 60) constancyScore = 10
  else if (days.size >= 40) constancyScore = 8
  else if (days.size >= 25) constancyScore = 6
  else if (days.size >= 12) constancyScore = 4
  else if (days.size >= 4)  constancyScore = 2
  dims.push({
    key:    'constancy',
    label:  'Constancia',
    score:  constancyScore,
    max:    10,
    status: days.size === 0 ? 'no_data' : statusFromRatio(constancyScore, 10),
    detail: days.size === 0
      ? 'Sin actividad registrada en los últimos 90 días.'
      : `Registraste actividad en ${days.size} días distintos (90 d).`,
    href:   '/transacciones',
  })

  const total       = dims.reduce((s, d) => s + d.score, 0)
  const grade       = gradeFor(total)

  return {
    score:     total,
    label:     grade.label,
    color:     grade.color,
    breakdown: dims,
  }
}
