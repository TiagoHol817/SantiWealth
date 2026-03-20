import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession(); const user = session?.user
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const { error } = await supabase
    .from('goals')
    .insert({
      name: body.name,
      target_amount: Number(body.target_amount),
      current_amount: Number(body.current_amount) || 0,
      deadline: body.deadline || null,
      icon: body.icon,
      color: body.color,
      user_id: user.id
    })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession(); const user = session?.user
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const { error } = await supabase
    .from('goals')
    .update({ current_amount: Number(body.current_amount) })
    .eq('id', body.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}