import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@/lib/supabase/server'
import type { CDTData }             from '@/lib/parseCDTClient'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('cdts')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) {
    console.error('[cdts GET]', error)
    return NextResponse.json({ error: 'Error al obtener CDTs' }, { status: 500 })
  }

  return NextResponse.json({ cdts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: CDTData[]
  try {
    const raw = await req.json()
    body = Array.isArray(raw) ? raw : [raw]
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  const rows = body.map(item => ({
    user_id:         user.id,
    bank:            item.bank ?? 'Bancolombia',
    investment_id:   item.investment_id ?? null,
    capital:         Number(item.capital),
    interest_rate:   item.interest_rate != null ? Number(item.interest_rate) : null,
    term_days:       item.term_days    != null ? Number(item.term_days)    : null,
    start_date:      item.start_date,
    end_date:        item.end_date ?? null,
    interest_earned: Number(item.interest_earned ?? 0),
    status:          item.status ?? 'active',
    notes:           null,
  }))

  // Rows with investment_id → upsert (ignore duplicates by partial unique index)
  const withId    = rows.filter(r => r.investment_id)
  const withoutId = rows.filter(r => !r.investment_id)

  let inserted = 0
  const errs: string[] = []

  if (withId.length) {
    // Try insert; on unique-constraint conflict just skip (already imported)
    const { data, error } = await supabase
      .from('cdts')
      .insert(withId)
      .select('id')
    if (error && !error.message.includes('duplicate')) {
      console.error('[cdts POST upsert]', error)
      errs.push(error.message)
    } else {
      inserted += data?.length ?? 0
    }
  }

  if (withoutId.length) {
    const { data, error } = await supabase
      .from('cdts')
      .insert(withoutId)
      .select('id')
    if (error) {
      console.error('[cdts POST insert]', error)
      errs.push(error.message)
    } else {
      inserted += data?.length ?? 0
    }
  }

  if (errs.length && inserted === 0) {
    return NextResponse.json({ error: errs.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: inserted })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { error } = await supabase
    .from('cdts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[cdts DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
