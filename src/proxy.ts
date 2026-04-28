/**
 * proxy.ts — legacy utility (NOT used as Next.js middleware).
 * Middleware is handled by src/middleware.ts.
 * Kept here for reference; the `config` export has been intentionally removed
 * to prevent Next.js from treating this file as a middleware bundle.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = [
  '/dashboard', '/transacciones', '/inversiones', '/presupuestos',
  '/metas', '/costos-op', '/ingresos', '/reportes', '/ayuda',
]

const BLOCKED = [
  '/.env', '/.git', '/node_modules', '/prisma',
  '/__nextjs_original-stack-frame', '/api/debug',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (BLOCKED.some(p => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(r =>
    pathname === r || pathname.startsWith(r + '/')
  )

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/login' && user) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashUrl)
  }

  return supabaseResponse
}
// NOTE: No `config` export — this file is NOT Next.js middleware.
