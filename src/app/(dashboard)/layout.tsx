import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { BalanceProvider } from '@/context/BalanceContext'
import { ToastProvider } from '@/context/ToastContext'
import { SettingsProvider } from '@/context/SettingsContext'
import ToastContainer from '@/components/ToastContainer'
import OnboardingWizard from '@/components/help/OnboardingWizard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Gate: redirect new users to onboarding
  const { data: settings } = await supabase
    .from('user_settings')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.onboarding_completed) redirect('/onboarding')

  return (
    <ToastProvider>
      <SettingsProvider>
        <BalanceProvider>
          <AppShell>{children}</AppShell>
          <OnboardingWizard />
        </BalanceProvider>
      </SettingsProvider>
      <ToastContainer />
    </ToastProvider>
  )
}
