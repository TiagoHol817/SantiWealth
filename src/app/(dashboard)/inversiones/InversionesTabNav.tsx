'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { id: 'portafolio',  label: 'Portafolio',  icon: '📈' },
  { id: 'renta-fija',  label: 'Renta Fija',  icon: '📄' },
]

export default function InversionesTabNav({
  activeTab,
  cdtCount,
  proximoVenc,
}: {
  activeTab:    string
  cdtCount:     number
  proximoVenc?: number
}) {
  const router  = useRouter()
  const params  = useSearchParams()

  const nav = (tab: string) => {
    const url = new URLSearchParams(params.toString())
    url.set('tab', tab)
    router.push(`?${url.toString()}`)
  }

  return (
    <div className="card flex gap-2 p-1" style={{ width: 'fit-content' }}>
      {TABS.map(tab => {
        const isActive  = activeTab === tab.id
        const showAlert = tab.id === 'renta-fija' && proximoVenc !== undefined && proximoVenc <= 30

        return (
          <button
            key={tab.id}
            onClick={() => nav(tab.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color:           isActive ? '#e5e7eb'               : '#6b7280',
              border:          isActive ? '1px solid rgba(99,102,241,0.30)' : '1px solid transparent',
            }}>
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            {tab.label}
            {tab.id === 'renta-fija' && cdtCount > 0 && (
              <span className="tabular-nums text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: showAlert ? '#f59e0b25' : '#10b98120',
                  color:           showAlert ? '#f59e0b'   : '#10b981',
                }}>
                {showAlert ? `⚠️ ${proximoVenc}d` : cdtCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
