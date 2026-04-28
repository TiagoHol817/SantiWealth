import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const code     = request.nextUrl.searchParams.get('code')
  const error    = request.nextUrl.searchParams.get('error')
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  if (error || !code) {
    return NextResponse.redirect(`${siteUrl}/login?error=${error ?? 'no_code'}`)
  }

  try {
    const cookieStore = await cookies()
    const response    = NextResponse.redirect(`${siteUrl}/dashboard`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            toSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options) } catch {}
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(`${siteUrl}/login?error=exchange_failed`)
    }

    return response

  } catch (err) {
    console.error('[auth/callback]', err)
    return NextResponse.redirect(`${siteUrl}/login?error=unexpected`)
  }
}
