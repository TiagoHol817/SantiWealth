import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const body = await req.json()
  const { error } = await supabase
    .from('operational_costs')
    .insert({
      name: body.name,
      category: body.category,
      amount: Number(body.amount),
      frequency: body.frequency || 'monthly',
      active: true,
      user_id: user.id
    })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}