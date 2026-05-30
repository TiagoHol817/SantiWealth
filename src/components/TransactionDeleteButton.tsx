'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

/**
 * Per-row trash icon that soft-deletes a single transaction with undo.
 * Shown on row hover via the `tx-delete-btn` class (controlled by the row
 * `.row-hover` class — fades in 0 → 1 opacity on hover).
 */
export default function TransactionDeleteButton({
  txId,
  label,
}: {
  txId:  string
  label: string
}) {
  const router  = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function softDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        toast.error('No se pudo eliminar', data.error ?? 'Intenta de nuevo')
        return
      }
      router.refresh()
      toast.withAction({
        type:     'success',
        title:    'Transacción eliminada',
        message:  label,
        duration: 10_000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            const r = await fetch(`/api/transactions/${txId}`, {
              method:  'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ action: 'restore' }),
            })
            if (r.ok) router.refresh()
          },
        },
      })
    } catch {
      toast.error('Error de conexión', 'Intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={softDelete}
      disabled={loading}
      aria-label="Eliminar transacción"
      className="tx-delete-btn"
      style={{
        width:        '28px',
        height:       '28px',
        borderRadius: '8px',
        background:   'transparent',
        border:       'none',
        color:        '#6b7280',
        cursor:       loading ? 'wait' : 'pointer',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        transition:   'background 150ms, color 150ms, opacity 150ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'
        ;(e.currentTarget as HTMLElement).style.color    = '#ef4444'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color    = '#6b7280'
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  )
}
