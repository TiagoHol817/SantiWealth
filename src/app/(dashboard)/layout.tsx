import Sidebar from '@/components/sidebar'
import { BalanceProvider } from '@/context/BalanceContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BalanceProvider>
      <div className="flex h-screen" style={{ backgroundColor: '#0f1117' }}>
        <Sidebar />
        <main className="flex-1 ml-64 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </BalanceProvider>
  )
}