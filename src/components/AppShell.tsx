'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'

const STORAGE_KEY = 'wh_sidebar_collapsed'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Restore preference after mount (avoids SSR mismatch)
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

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      <main
        className="flex-1 overflow-y-auto p-8"
        style={{
          marginLeft: isCollapsed ? '64px' : '256px',
          transition: 'margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
