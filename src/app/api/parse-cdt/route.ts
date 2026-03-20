import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 }
          },
          {
            type: 'text',
            text: `Extrae los datos de este CDT bancario y responde SOLO con JSON válido, sin texto adicional:
{
  "nombre": "CDT Bancolombia #X",
  "capital": 10000000,
  "apertura": "2026-03-03",
  "vencimiento": "2026-05-04",
  "tasa_ea": 8.6,
  "tasa_nominal": 8.31,
  "plazo_dias": 61,
  "interes_periodo": 140770
}
Las fechas en formato YYYY-MM-DD. Los números sin puntos ni comas.`
          }
        ]
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const data = JSON.parse(text.replace(/```json|```/g, '').trim())

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Error al procesar imagen' }, { status: 500 })
  }
}