'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { useSettings } from '@/context/SettingsContext'
import { Menu, X } from 'lucide-react'

const STORAGE_KEY = 'wh_sidebar_collapsed'

const DENSITY_PADDING: Record<string, string> = {
  compacta: '16px',
  normal:   '32px',
  amplia:   '48px',
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [isMobile, setIsMobile]           = useState(false)
  const { settings } = useSettings()
  const pathname = usePathname()

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') setIsCollapsed(true)
    } catch {}
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

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

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: '#00000070' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless mobileOpen */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
          transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Sidebar isCollapsed={isMobile ? false : isCollapsed} onToggle={toggle} />
      </div>

      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: 'fixed', top: '12px', left: '12px', zIndex: 50,
            width: '40px', height: '40px', borderRadius: '10px',
            backgroundColor: '#1a1f2e', border: '1px solid #2a3040',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e5e7eb', cursor: 'pointer',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      <main
        className="flex-1 overflow-y-auto"
        style={{
          marginLeft: isMobile ? '0' : (isCollapsed ? '64px' : '256px'),
          padding: isMobile ? '56px 16px 80px' : padding,
          transition: 'margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1), padding 300ms ease',
          minWidth: 0,
        }}
      >
        <div key={pathname} style={{ animation: 'fadeIn 150ms ease-out' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
