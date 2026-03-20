import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: body.account_id || null,
    type: body.type,
    amount: body.amount,
    category: body.category,
    description: body.description,
    date: body.date
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}