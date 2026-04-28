import { redirect }        from 'next/navigation'
import type { Metadata }   from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies }         from 'next/headers'
import LandingPage         from './landing/LandingPage'

export const metadata: Metadata = {
  title:       'WealthHost — Tu patrimonio, bajo control',
  description: 'Consolida tus cuentas, inversiones, presupuestos y metas en un solo lugar. Con IA que categoriza, analiza y te dice exactamente qué hacer con tu dinero.',
  openGraph: {
    title:       'WealthHost — Tu patrimonio, bajo control',
    description: 'Finanzas personales inteligentes para Colombia.',
    url:         'https://wealthhost-nu.vercel.app',
    siteName:    'WealthHost',
    locale:      'es_CO',
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'WealthHost — Tu patrimonio, bajo control',
    description: 'Finanzas personales inteligentes para Colombia.',
  },
}

interface Props {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>
}

export default async function Home({ searchParams }: Props) {
  const params  = await searchParams
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wealthhost-nu.vercel.app'

  // If Supabase sent back an OAuth error, forward it to the login page
  if (params.error) {
    redirect(`/login?error=${encodeURIComponent(params.error_description ?? params.error)}`)
  }

  // If Supabase redirected to / with a PKCE code (misconfigured redirect URI),
  // forward it to the real callback handler so the session is exchanged properly
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}`)
  }

  // If the user already has a valid session, send them straight to the dashboard
  try {
    const cookieStore = await cookies()
    const supabase    = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},           // read-only here — no cookies to write
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {
    // If session check fails for any reason, fall through and show the landing
  }

  return <LandingPage />
}
