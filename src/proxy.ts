import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Auth routes: pass through immediately, no session check ──────────────
  // These routes MUST reach their Route Handlers unmodified. Any redirect here
  // (even to /login) would break the PKCE code exchange and cause
  // DEPLOYMENT_NOT_FOUND if request.url resolves to a stale deployment.
  const isAuthRoute =
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/'

  if (isAuthRoute) {
    return NextResponse.next()
  }

  // ── Static assets: skip entirely ─────────────────────────────────────────
  const isStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|svg|woff2|ttf|otf|eot)$/.test(pathname)

  if (isStatic) {
    return NextResponse.next()
  }

  // ── Session check for all other routes ───────────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Always use the fixed production URL — never request.url, which can resolve
  // to a Vercel preview deployment hash that no longer exists.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  const publicRoutes = ['/login', '/landing']
  const isPublic = publicRoutes.some(r => pathname.startsWith(r))

  if (!isPublic && !user) {
    return NextResponse.redirect(`${siteUrl}/login`)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(`${siteUrl}/dashboard`)
  }

  // ── Security headers ──────────────────────────────────────────────────────
  supabaseResponse.headers.set('X-Frame-Options',        'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-XSS-Protection',       '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy',     'camera=(), microphone=(), geolocation=()')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
