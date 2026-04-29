import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const code    = request.nextUrl.searchParams.get('code')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthost-nu.vercel.app'

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`)
  }

  return NextResponse.redirect(`${siteUrl}/dashboard?debug=callback_ok&code=${code.slice(0, 8)}`)
}
