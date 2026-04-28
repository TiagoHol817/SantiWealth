/* ── Recurring Cost Detector ─────────────────────────────────────────────
   Pure client-safe utility — no server or DB imports.
   Groups transactions by normalized description and surfaces patterns
   that look like monthly recurring charges.
   ─────────────────────────────────────────────────────────────────────── */

export type RecurringSuggestion = {
  description:   string      // Most recent (human-readable) description
  normalizedKey: string      // Normalized key used for grouping
  amount:        number      // Average amount (rounded to nearest peso)
  frequency:     'monthly'
  category:      string      // Best-guess category
  confidence:    number      // 0..1
  occurrences:   number
}

/* ── Known subscription/service keywords → category ─────────────────── */
const KEYWORD_CATEGORIES: Array<{ kws: string[]; cat: string }> = [
  { kws: ['NETFLIX', 'SPOTIFY', 'AMAZON', 'PRIME', 'APPLE', 'GOOGLE', 'DISNEY', 'HBO', 'PARAMOUNT', 'YOUTUBE', 'DEEZER'], cat: 'Entretenimiento' },
  { kws: ['INTERNET', 'CLARO', 'MOVISTAR', 'TIGO', 'ETB', 'COLTEL', 'WOM'], cat: 'Internet/Celular' },
  { kws: ['GAS', 'NATURGAS', 'VANTI', 'GASES DE OCCIDENTE'], cat: 'Servicios públicos' },
  { kws: ['ACUEDUCTO', 'EAAB', 'EMCALI', 'AGUAS'], cat: 'Servicios públicos' },
  { kws: ['ELECTRICIDAD', 'ENERGIA', 'ENEL', 'EPM', 'CODENSA'], cat: 'Servicios públicos' },
  { kws: ['ARRIENDO', 'ALQUILER', 'RENT'], cat: 'Arriendo' },
  { kws: ['ADMINISTRACION', 'CONJUNTO', 'COPROPIEDAD'], cat: 'Administración' },
  { kws: ['GYM', 'GIMNASIO', 'BODYTECH', 'SMARTFIT'], cat: 'Suscripciones' },
  { kws: ['PSE', 'PAGO PSE'], cat: 'Servicios' },
]

/* ── Well-known one-word services for keyword-only detection ─────────── */
const KNOWN_SUBSCRIPTIONS: Record<string, string> = {
  NETFLIX:   'Entretenimiento',
  SPOTIFY:   'Entretenimiento',
  AMAZON:    'Entretenimiento',
  'AMAZON PRIME': 'Entretenimiento',
  APPLE:     'Entretenimiento',
  GOOGLE:    'Servicios',
  DISNEY:    'Entretenimiento',
  HBO:       'Entretenimiento',
  YOUTUBE:   'Entretenimiento',
  CLARO:     'Internet/Celular',
  MOVISTAR:  'Internet/Celular',
  TIGO:      'Internet/Celular',
  ETB:       'Internet/Celular',
  WOM:       'Internet/Celular',
  BODYTECH:  'Suscripciones',
  SMARTFIT:  'Suscripciones',
  ARRIENDO:  'Arriendo',
}

function guessCategory(normalized: string): string {
  for (const { kws, cat } of KEYWORD_CATEGORIES) {
    if (kws.some(k => normalized.includes(k))) return cat
  }
  return 'Costos fijos'
}

/* ── Normalize description for grouping ─────────────────────────────── */
function normalize(desc: string): string {
  return desc
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')          // strip accents
    .replace(/[^A-Z0-9\s]/g, '')              // keep alphanumeric
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30)
}

/* ── Input type ──────────────────────────────────────────────────────── */
export type TxInput = {
  description: string
  amount: number
  date: string             // YYYY-MM-DD
}

/* ── Main detection function ─────────────────────────────────────────── */
export function detectRecurringCosts(transactions: TxInput[]): RecurringSuggestion[] {
  if (!transactions.length) return []

  // Filter out zero-amount or blank rows
  const valid = transactions.filter(t => t.amount > 0 && t.description?.trim())

  /* Step 1 — group by normalized key */
  const groups: Record<string, TxInput[]> = {}
  for (const tx of valid) {
    const key = normalize(tx.description)
    if (key.length < 3) continue
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }

  const suggestions: RecurringSuggestion[] = []

  for (const [key, txs] of Object.entries(groups)) {
    const sorted  = [...txs].sort((a, b) => a.date.localeCompare(b.date))
    const amounts = sorted.map(t => t.amount)
    const avg     = amounts.reduce((s, a) => s + a, 0) / amounts.length

    /* Step 2 — amount variance ≤ 10 % */
    const amountOk = amounts.every(a => Math.abs(a - avg) / avg <= 0.10)

    /* Step 3 — at least 2 occurrences OR well-known subscription keyword */
    const isKnownSub = Object.keys(KNOWN_SUBSCRIPTIONS).some(k => key.includes(k))

    if (!amountOk && !isKnownSub) continue

    let confidence = 0
    let isMonthly  = false

    if (sorted.length >= 2) {
      const dates = sorted.map(t => new Date(t.date).getTime())
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i] - dates[i - 1]) / 86_400_000
        if (diffDays >= 20 && diffDays <= 45) {
          isMonthly = true
          break
        }
      }
      if (isMonthly && amountOk) {
        confidence = Math.min(0.95, 0.55 + (sorted.length - 2) * 0.15)
      } else if (isKnownSub && amountOk) {
        confidence = 0.70
      } else if (isKnownSub) {
        confidence = 0.50
      }
    } else if (sorted.length === 1 && isKnownSub) {
      // Single occurrence but known subscription name
      isMonthly  = true
      confidence = 0.45
    }

    if (confidence < 0.40) continue

    // Find the category from well-known subscriptions first, else keyword map
    let category = guessCategory(key)
    for (const [kw, cat] of Object.entries(KNOWN_SUBSCRIPTIONS)) {
      if (key.includes(kw)) { category = cat; break }
    }

    suggestions.push({
      description:   sorted[sorted.length - 1].description,
      normalizedKey: key,
      amount:        Math.round(avg),
      frequency:     'monthly',
      category,
      confidence,
      occurrences:   sorted.length,
    })
  }

  /* Sort by confidence desc, cap at 12 suggestions */
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12)
}
