/**
 * /api/trash
 *   GET → all soft-deleted items for the authenticated user across both
 *         modules (investment_assets + transactions). Sorted by deletedAt
 *         descending. daysRemaining = max(0, 30 - days_since_deleted).
 *
 * The shape is normalized so the UI can render a single list. Investment
 * transactions follow their parent asset — when the asset is restored,
 * its children come back too, so we don't list them separately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

export type TrashItemType = 'investment' | 'transaction'

export interface TrashItem {
  id:             string
  type:           TrashItemType
  title:          string
  subtitle:       string
  deletedAt:      string
  daysRemaining:  number
}

function daysRemaining(deletedAt: string): number {
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / 86_400_000
  return Math.max(0, Math.ceil(30 - elapsed))
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const [{ data: assets }, { data: txs }] = await Promise.all([
    supabase
      .from('investment_assets')
      .select('id, name, ticker, asset_type, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('transactions')
      .select('id, description, amount, date, type, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const items: TrashItem[] = []

  for (const a of assets ?? []) {
    if (!a.deleted_at) continue
    items.push({
      id:            a.id,
      type:          'investment',
      title:         `${a.ticker} · ${a.name}`,
      subtitle:      String(a.asset_type ?? '').toUpperCase(),
      deletedAt:     a.deleted_at,
      daysRemaining: daysRemaining(a.deleted_at),
    })
  }

  for (const t of txs ?? []) {
    if (!t.deleted_at) continue
    items.push({
      id:            t.id,
      type:          'transaction',
      title:         t.description || (t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Movimiento'),
      subtitle:      `${fmtCOP(Number(t.amount))} · ${fmtDate(t.date)}`,
      deletedAt:     t.deleted_at,
      daysRemaining: daysRemaining(t.deleted_at),
    })
  }

  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))

  return NextResponse.json({ items })
}
