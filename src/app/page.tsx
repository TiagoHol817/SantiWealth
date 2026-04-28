import { redirect }   from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LandingPage      from './landing/LandingPage'

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

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {}

  return <LandingPage />
}
