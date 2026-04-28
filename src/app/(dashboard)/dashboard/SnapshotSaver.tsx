'use client'
import { useEffect } from 'react'
import { saveSnapshot } from '@/lib/saveSnapshot'

export default function SnapshotSaver({
  netWorthCOP, netWorthUSD, totalBanks, totalStocks, totalCrypto
}: {
  netWorthCOP: number; netWorthUSD: number
  totalBanks: number; totalStocks: number; totalCrypto: number
}) {
  useEffect(() => {
    saveSnapshot(netWorthCOP, netWorthUSD, totalBanks, totalStocks, totalCrypto)
  }, [])
  return null
}