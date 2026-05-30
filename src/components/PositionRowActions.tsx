'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

/**
 * Per-position dropdown menu used inside the (server-rendered) Inversiones
 * page. Renders a small ⋮ button; clicking it toggles a tiny menu with
 * "Eliminar". Soft-deletes via DELETE /api/investments/[id] with optimistic
 * UI and an undo toast.
 */
export default function PositionRowActions({
  assetId,
  label,
}: {
  assetId: string
  label:   string  // displayed in the undo toast for context
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Click-outside to close
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  async function softDelete() {
    setOpen(false)
    // Optimistically refresh — the server query already filters deleted rows,
    // so after refresh this card is gone.
    try {
      const res = await fetch(`/api/investments/${assetId}`, { method: 'DELETE' })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        toast.error('No se pudo eliminar', data.error ?? 'Intenta de nuevo')
        return
      }
      router.refresh()
      toast.withAction({
        type:     'success',
        title:    'Inversión eliminada',
        message:  label,
        duration: 10_000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            const r = await fetch(`/api/investments/${assetId}`, {
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
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        aria-label="Más acciones"
        style={{
          width:        '28px',
          height:       '28px',
          borderRadius: '8px',
          background:   open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border:       'none',
          color:        '#9ca3af',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          transition:   'background 150ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? 'rgba(255,255,255,0.08)' : 'transparent' }}
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          style={{
            position:     'absolute',
            top:          '32px',
            right:        '0px',
            minWidth:     '160px',
            background:   '#1a1f2e',
            border:       '1px solid rgba(255,255,255,0.10)',
            borderRadius: '10px',
            boxShadow:    '0 12px 32px rgba(0,0,0,0.4)',
            padding:      '5px',
            zIndex:       10,
            animation:    'position-menu-in 140ms cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <button
            type="button"
            onClick={softDelete}
            style={{
              width:        '100%',
              display:      'flex',
              alignItems:   'center',
              gap:          '8px',
              padding:      '8px 10px',
              borderRadius: '7px',
              background:   'transparent',
              border:       'none',
              color:        '#ef4444',
              fontSize:     '13px',
              fontWeight:   500,
              cursor:       'pointer',
              textAlign:    'left',
              transition:   'background 120ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      )}

      <style>{`
        @keyframes position-menu-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)    scale(1)    }
        }
      `}</style>
    </div>
  )
}
