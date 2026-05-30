import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { BalanceProvider } from '@/context/BalanceContext'
import { SettingsProvider } from '@/context/SettingsContext'
import ToastWrapper from '@/components/ToastWrapper'
import OnboardingWizard from '@/components/help/OnboardingWizard'
import DemoBanner from '@/components/DemoBanner'

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
    <ToastWrapper>
      <SettingsProvider>
        <BalanceProvider>
          <AppShell>{children}</AppShell>
          <OnboardingWizard />
        </BalanceProvider>
      </SettingsProvider>
      <DemoBanner email={user.email} />
    </ToastWrapper>
  )
}
