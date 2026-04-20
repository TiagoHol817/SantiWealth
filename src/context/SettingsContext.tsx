'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Density = 'compacta' | 'normal' | 'amplia'
export type AccentColor = 'gold'

export interface UserSettings {
  ui_density: Density
  show_daily_gains: boolean
  accent_color: AccentColor
}

const DEFAULTS: UserSettings = {
  ui_density: 'normal',
  show_daily_gains: true,
  accent_color: 'gold',
}

interface SettingsContextType {
  settings: UserSettings
  update: (patch: Partial<UserSettings>) => Promise<void>
  loading: boolean
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULTS,
  update: async () => {},
  loading: true,
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('user_settings')
        .select('ui_density, show_daily_gains, accent_color')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setSettings({
          ui_density: (data.ui_density as Density) ?? DEFAULTS.ui_density,
          show_daily_gains: data.show_daily_gains ?? DEFAULTS.show_daily_gains,
          accent_color: (data.accent_color as AccentColor) ?? DEFAULTS.accent_color,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next) // optimistic

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, update, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
