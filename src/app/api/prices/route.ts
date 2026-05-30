import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getIP } from '@/lib/rateLimit'

const TICKER_RE = /^[A-Z0-9.\-^=]{1,20}$/

export async function GET(req: NextRequest) {
  const { allowed } = rateLimit(getIP(req), { limit: 30, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase().trim() ?? ''
  if (!ticker || !TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: 'Ticker inválido' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'No se encontró el ticker' }, { status: 404 })
    }

    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta

    if (!meta || !meta.regularMarketPrice) {
      return NextResponse.json({ error: 'Ticker no encontrado o sin datos' }, { status: 404 })
    }

    const price     = meta.regularMarketPrice as number
    const prev      = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number
    const dayChange = price - prev
    const dayPct    = prev > 0 ? ((price - prev) / prev) * 100 : 0
    const name      = (meta.longName ?? meta.shortName ?? ticker) as string
    const currency  = (meta.currency ?? 'USD') as string

    return NextResponse.json({ ticker, name, price, dayChange, dayPct, currency })
  } catch {
    return NextResponse.json({ error: 'Error al obtener precio' }, { status: 502 })
  }
}
