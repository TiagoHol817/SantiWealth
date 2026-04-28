import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl  = new URL(request.url)
  const code        = requestUrl.searchParams.get('code')
  const next        = requestUrl.searchParams.get('next') ?? '/dashboard'
  const oauthError  = requestUrl.searchParams.get('error')
  const oauthDesc   = requestUrl.searchParams.get('error_description')

  // Always redirect to the fixed production URL — never build a URL from
  // request.url, which can be a Vercel preview deployment domain.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  if (oauthError) {
    console.error('[auth/callback] OAuth error:', oauthError, oauthDesc)
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(oauthDesc ?? oauthError)}`
    )
  }

  if (!code) {
    console.error('[auth/callback] No code received')
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`)
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()            { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] PKCE exchange failed:', error.message)
      return NextResponse.redirect(
        `${siteUrl}/login?error=${encodeURIComponent(error.message)}`
      )
    }

    if (user) {
      // Ensure every OAuth user has a user_settings row
      await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, onboarding_completed: false },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )

      const { data: settings } = await supabase
        .from('user_settings')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!settings?.onboarding_completed) {
        return NextResponse.redirect(`${siteUrl}/onboarding`)
      }
    }

    return NextResponse.redirect(`${siteUrl}${next}`)

  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err)
    return NextResponse.redirect(`${siteUrl}/login?error=unexpected`)
  }
}
