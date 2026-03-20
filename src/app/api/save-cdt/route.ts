import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: body.nombre,
      type: 'other',
      currency: 'COP',
      current_balance: body.capital,
      notes: JSON.stringify({
        apertura: body.apertura,
        vencimiento: body.vencimiento,
        tasa_ea: body.tasa_ea,
        tasa_nominal: body.tasa_nominal,
        plazo_dias: body.plazo_dias,
        interes_periodo: body.interes_periodo
      })
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}