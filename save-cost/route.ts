import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  const userId = payload.sub

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const body = await req.json()

  if (body.id) {
    const { error } = await supabase.from('operational_costs')
      .update({ name: body.name, category: body.category, amount: body.amount, active: body.active })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('operational_costs').insert({
      user_id: userId,
      name: body.name,
      category: body.category,
      amount: body.amount,
      frequency: body.frequency ?? 'monthly',
      active: true
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}