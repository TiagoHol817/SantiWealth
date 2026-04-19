export interface WealthScorePillar {
  score: number
  rawValue: number
  label: string
  hint: string
}

export interface WealthScoreResult {
  total: number
  grade: 'Óptimo' | 'Sólido' | 'En desarrollo' | 'Crítico'
  color: string
  trend: string
  pillars: {
    savingsRate:      WealthScorePillar
    investmentRatio:  WealthScorePillar
    burnRateCoverage: WealthScorePillar
  }
}

export function computeWealthScore(params: {
  monthlyIncome:    number
  monthlyExpenses:  number
  totalAssets:      number
  investedAssets:   number  // brokerage + crypto COP value
  liquidAssets:     number  // banks + cash COP value
}): WealthScoreResult {
  const { monthlyIncome, monthlyExpenses, totalAssets, investedAssets, liquidAssets } = params

  // ── Pillar 1: Savings Rate ──────────────────────────────────────────────────
  // 20%+ savings rate = 100. Scale: rawValue% × 5
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0
  const savingsScore = Math.min(100, Math.round(savingsRate * 5))

  // ── Pillar 2: Investment Ratio ──────────────────────────────────────────────
  // 66%+ of net worth in productive assets = 100. Scale: ratio% × 1.5
  const investmentRatio = totalAssets > 0 ? (investedAssets / totalAssets) * 100 : 0
  const investmentScore = Math.min(100, Math.round(investmentRatio * 1.5))

  // ── Pillar 3: Burn Rate Coverage ───────────────────────────────────────────
  // 6+ months emergency fund = 100. Scale: (months / 6) × 100
  const burnRateMonths  = monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 12
  const burnRateScore   = Math.min(100, Math.round((burnRateMonths / 6) * 100))

  // ── Composite (weighted) ───────────────────────────────────────────────────
  const total = Math.round(savingsScore * 0.4 + investmentScore * 0.3 + burnRateScore * 0.3)

  const grade: WealthScoreResult['grade'] =
    total >= 80 ? 'Óptimo'
    : total >= 60 ? 'Sólido'
    : total >= 40 ? 'En desarrollo'
    : 'Crítico'

  const color =
    total >= 80 ? '#10b981'
    : total >= 60 ? '#D4AF37'
    : total >= 40 ? '#f59e0b'
    : '#ef4444'

  const trend =
    total >= 80 ? '🏆 Patrimonio en excelente forma'
    : total >= 60 ? '📈 Buena base — optimiza tus inversiones'
    : total >= 40 ? '💡 Enfócate en aumentar la tasa de ahorro'
    : '⚠️ Revisa tus gastos este mes'

  return {
    total,
    grade,
    color,
    trend,
    pillars: {
      savingsRate: {
        score:    savingsScore,
        rawValue: savingsRate,
        label:    'Tasa de ahorro',
        hint:     savingsRate > 0
          ? `Ahorras el ${savingsRate.toFixed(1)}% de tus ingresos`
          : 'Sin ingresos registrados este mes',
      },
      investmentRatio: {
        score:    investmentScore,
        rawValue: investmentRatio,
        label:    'Activos productivos',
        hint:     `${investmentRatio.toFixed(1)}% del patrimonio está invertido`,
      },
      burnRateCoverage: {
        score:    burnRateScore,
        rawValue: burnRateMonths,
        label:    'Fondo de emergencia',
        hint:     burnRateMonths >= 6
          ? `${burnRateMonths.toFixed(1)} meses cubiertos — ¡óptimo!`
          : `${burnRateMonths.toFixed(1)} de 6 meses ideales`,
      },
    },
  }
}
