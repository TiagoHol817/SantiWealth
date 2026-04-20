'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import { useSettings } from '@/context/SettingsContext'

const STORAGE_KEY = 'wh_sidebar_collapsed'

const DENSITY_PADDING: Record<string, string> = {
  compacta: '16px',
  normal:   '32px',
  amplia:   '48px',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setIsCollapsed(true)
    } catch {}
  }, [])

  const toggle = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }

  const padding = DENSITY_PADDING[settings.ui_density] ?? '32px'

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          marginLeft: isCollapsed ? '64px' : '256px',
          padding,
          transition: 'margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms ease',
        }}
      >
        {children}
      </main>
    </div>
  )
}
