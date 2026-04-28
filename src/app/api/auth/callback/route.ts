import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code       = requestUrl.searchParams.get('code')
  const next       = requestUrl.searchParams.get('next') ?? '/dashboard'
  const oauthError = requestUrl.searchParams.get('error')
  const oauthDesc  = requestUrl.searchParams.get('error_description')

  // Always redirect to the fixed production URL — never build from request.url,
  // which can be a Vercel preview deployment domain.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  if (oauthError) {
    console.error('[api/auth/callback] OAuth error:', oauthError, oauthDesc)
    return NextResponse.redirect(
      `${siteUrl}/login?error=${encodeURIComponent(oauthDesc ?? oauthError)}`
    )
  }

  if (!code) {
    console.error('[api/auth/callback] No code received')
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`)
  }

  try {
    // Create the redirect response FIRST so session cookies can be attached to it.
    // setAll MUST write to both cookieStore (in-request reads) AND response.cookies
    // (Set-Cookie headers on the redirect) — writing only to cookieStore loses the
    // code_verifier when @supabase/ssr v0.9 checks it during PKCE exchange.
    const response    = NextResponse.redirect(`${siteUrl}${next}`)
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options) } catch {}
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[api/auth/callback] PKCE exchange failed:', exchangeError.message)
      return NextResponse.redirect(
        `${siteUrl}/login?error=${encodeURIComponent(exchangeError.message)}`
      )
    }

    if (data.user) {
      // Ensure every OAuth user has a user_settings row
      await supabase
        .from('user_settings')
        .upsert(
          { user_id: data.user.id, onboarding_completed: false },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )

      const { data: settings } = await supabase
        .from('user_settings')
        .select('onboarding_completed')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!settings?.onboarding_completed) {
        // Redirect to onboarding, carrying the session cookies from `response`
        const onboardingResp = NextResponse.redirect(`${siteUrl}/onboarding`)
        response.cookies.getAll().forEach(({ name, value, ...rest }) => {
          onboardingResp.cookies.set(name, value, rest)
        })
        return onboardingResp
      }
    }

    return response

  } catch (err) {
    console.error('[api/auth/callback] Unexpected error:', err)
    return NextResponse.redirect(`${siteUrl}/login?error=unexpected`)
  }
}
