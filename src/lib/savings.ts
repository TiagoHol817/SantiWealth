/**
 * Shared shapes + computed-field helpers for the Ahorro Programado module.
 * Used by both API routes and server-rendered pages.
 */

export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'custom'
export type Currency  = 'COP' | 'USD'
export type PlanStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type Pace       = 'ahead' | 'on_track' | 'behind' | 'completed'

export interface SavingsPlanRow {
  id:                     string
  user_id:                string
  name:                   string
  description:            string | null
  target_amount:          string | number
  current_amount:         string | number
  currency:               Currency
  start_date:             string  // YYYY-MM-DD
  target_date:            string  // YYYY-MM-DD
  frequency:              Frequency
  source_account_id:      string | null
  destination_account_id: string | null
  icon:                   string | null
  color:                  string | null
  status:                 PlanStatus
  is_active:              boolean
  deleted_at:             string | null
  created_at:             string
  updated_at:             string
}

export interface PlanComputed {
  daysRemaining:     number
  daysTotal:         number
  daysElapsed:       number
  percentComplete:   number   // current / target  (0..100)
  percentExpected:   number   // ideal pace (0..100)
  idealAmount:       number
  pace:              Pace
  nextDepositAmount: number
  nextDepositDate:   string   // YYYY-MM-DD
  periodsRemaining:  number
}

const FREQ_DAYS: Record<Frequency, number> = {
  weekly:   7,
  biweekly: 15,
  monthly:  30,
  custom:   30,           // fallback
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime())
  out.setDate(out.getDate() + n)
  return out
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Compute the live, derived fields of a savings plan. Pure function over the
 * raw row + "today" — easy to test, deterministic.
 */
export function computePlan(row: SavingsPlanRow, todayISO?: string): PlanComputed {
  const today        = todayISO ? new Date(`${todayISO}T00:00:00`) : new Date()
  const start        = new Date(`${row.start_date}T00:00:00`)
  const target       = new Date(`${row.target_date}T00:00:00`)
  const daysTotal    = Math.max(1, diffDays(target, start))
  const daysElapsed  = Math.max(0, Math.min(daysTotal, diffDays(today, start)))
  const daysRemaining = Math.max(0, diffDays(target, today))

  const targetAmount  = Number(row.target_amount)
  const currentAmount = Number(row.current_amount)

  const percentComplete = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0
  const percentExpected = Math.min(100, (daysElapsed / daysTotal) * 100)
  const idealAmount     = (targetAmount * daysElapsed) / daysTotal

  // Pace: 5% tolerance band around the ideal curve
  let pace: Pace
  if (currentAmount >= targetAmount)                     pace = 'completed'
  else if (currentAmount >= idealAmount * 1.05)          pace = 'ahead'
  else if (currentAmount <  idealAmount * 0.95)          pace = 'behind'
  else                                                   pace = 'on_track'

  // Next deposit
  const periodDays      = FREQ_DAYS[row.frequency]
  const periodsRemaining = Math.max(1, Math.ceil(daysRemaining / periodDays))
  const remaining        = Math.max(0, targetAmount - currentAmount)
  const nextDepositAmount = Math.max(0, remaining / periodsRemaining)
  const nextDepositDate   = toISO(addDays(today, Math.min(daysRemaining, periodDays)))

  return {
    daysRemaining,
    daysTotal,
    daysElapsed,
    percentComplete,
    percentExpected,
    idealAmount,
    pace,
    nextDepositAmount,
    nextDepositDate,
    periodsRemaining,
  }
}
