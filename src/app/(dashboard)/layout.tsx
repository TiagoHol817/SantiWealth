import AppShell from '@/components/AppShell'
import { BalanceProvider } from '@/context/BalanceContext'
import { ToastProvider } from '@/context/ToastContext'
import ToastContainer from '@/components/ToastContainer'
import OnboardingWizard from '@/components/help/OnboardingWizard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <BalanceProvider>
        <AppShell>{children}</AppShell>
        <OnboardingWizard />
      </BalanceProvider>
      <ToastContainer />
    </ToastProvider>
  )
}