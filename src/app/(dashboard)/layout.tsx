import Sidebar from '@/components/sidebar'
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
        <div className="flex h-screen" style={{ backgroundColor: '#0f1117' }}>
          <Sidebar />
          <main className="flex-1 ml-64 overflow-y-auto p-8">
            {children}
          </main>
        </div>
        <OnboardingWizard />
      </BalanceProvider>
      <ToastContainer />
    </ToastProvider>
  )
}