'use client'
import { createContext, useContext, useState } from 'react'

type BalanceContextType = { visible: boolean; toggle: () => void }

const BalanceContext = createContext<BalanceContextType>({ visible: true, toggle: () => {} })

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true)
  return (
    <BalanceContext.Provider value={{ visible, toggle: () => setVisible(v => !v) }}>
      {children}
    </BalanceContext.Provider>
  )
}

export const useBalance = () => useContext(BalanceContext)