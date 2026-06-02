'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RefreshCcw, AlertTriangle, TrendingUp, Receipt, ArrowLeft, Wallet, Landmark, Bitcoin, AlertCircle, Box } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

type TrashItemType = 'investment' | 'transaction' | 'account'

interface TrashItem {
  id:             string
  type:           TrashItemType
  title:          string
  subtitle:       string
  meta?:          string          // for accounts: the type token (bank/cash/etc.)
  deletedAt:      string
  daysRemaining:  number
}

type FilterKey = 'all' | 'investment' | 'transaction' | 'account'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'Todos' },
  { key: 'investment',  label: 'Inversiones' },
  { key: 'transaction', label: 'Transacciones' },
  { key: 'account',     label: 'Cuentas' },
]

// Pure rendering helper — selects icon per account-type token. No user-specific
// data, no specific account names. Falls back to a generic icon.
function iconForAccountType(t: string | undefined): React.ComponentType<{ size?: number; style?: React.CSSProperties }> {
  switch (t) {
    case 'bank':      return Landmark
    case 'cash':      return Wallet
    case 'brokerage': return TrendingUp
    case 'crypto':    return Bitcoin
    case 'liability': return AlertCircle
    default:          return Box
  }
}

function fmtDeletedAt(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Eliminado hoy'
  if (days === 1) return 'Eliminado hace 1 día'
  return `Eliminado hace ${days} días`
}

export default function PapeleraPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [items, setItems]     = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<FilterKey>('all')
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/trash')
      const data = await res.json() as { items?: TrashItem[]; error?: string }
      if (!res.ok || data.error) {
        toast.error('No se pudo cargar la papelera', data.error)
        return
      }
      setItems(data.items ?? [])
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter)

  function basePathFor(type: TrashItemType): string {
    if (type === 'investment')  return '/api/investments'
    if (type === 'transaction') return '/api/transactions'
    return '/api/accounts'
  }

  async function restoreOne(item: TrashItem) {
    const path = `${basePathFor(item.type)}/${item.id}`
    const res = await fetch(path, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'restore' }),
    })
    if (res.ok) {
      setItems((prev) => prev.filter((x) => !(x.id === item.id && x.type === item.type)))
      toast.success('Restaurado', item.title)
      router.refresh()
    } else {
      toast.error('No se pudo restaurar')
    }
  }

  async function hardDeleteOne(item: TrashItem) {
    const path = `${basePathFor(item.type)}/${item.id}/hard-delete`
    const res = await fetch(path, { method: 'DELETE' })
    if (res.ok) {
      setItems((prev) => prev.filter((x) => !(x.id === item.id && x.type === item.type)))
      toast.success('Eliminado definitivamente')
    } else {
      toast.error('No se pudo eliminar')
    }
  }

  async function restoreAll() {
    if (items.length === 0) return
    const res  = await fetch('/api/trash/restore-all', { method: 'POST' })
    const data = await res.json() as { count?: number; error?: string }
    if (!res.ok || data.error) {
      toast.error('No se pudo restaurar todo', data.error)
      return
    }
    toast.success(`${data.count ?? 0} elementos restaurados`)
    setItems([])
    router.refresh()
  }

  async function emptyTrash() {
    setConfirmEmpty(false)
    const res  = await fetch('/api/trash/empty', { method: 'DELETE' })
    const data = await res.json() as { count?: number; error?: string }
    if (!res.ok || data.error) {
      toast.error('No se pudo vaciar', data.error)
      return
    }
    toast.success(`Papelera vaciada · ${data.count ?? 0} elementos`)
    setItems([])
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8" style={{ maxWidth: '880px', margin: '0 auto' }}>

      <a
        href="/settings"
        className="inline-flex items-center gap-2 transition-colors"
        style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e5e7eb' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280' }}
      >
        <ArrowLeft size={14} /> Volver a Configuración
      </a>

      <div className="page-enter">
        <h1 className="page-title">Papelera</h1>
        <p className="page-subtitle">
          Los elementos se eliminan permanentemente después de 30 días.
        </p>
      </div>

      {/* Action bar */}
      <div className="card p-5 page-enter page-enter-delay-1" style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            const count = f.key === 'all' ? items.length : items.filter((i) => i.type === f.key).length
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  padding:      '7px 14px',
                  borderRadius: '999px',
                  fontSize:     '12px',
                  fontWeight:   600,
                  background:   active ? 'rgba(99,102,241,0.16)' : 'rgba(255,255,255,0.04)',
                  border:       `1px solid ${active ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  color:        active ? '#a78bfa' : '#9ca3af',
                  cursor:       'pointer',
                  transition:   'all 150ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {f.label} {count > 0 && <span style={{ opacity: 0.7 }}>· {count}</span>}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={restoreAll}
            disabled={items.length === 0}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12px', opacity: items.length === 0 ? 0.5 : 1, cursor: items.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCcw size={12} /> Restaurar todo
          </button>
          <button
            type="button"
            onClick={() => setConfirmEmpty(true)}
            disabled={items.length === 0}
            style={{
              padding:      '8px 14px',
              borderRadius: '10px',
              background:   'rgba(239,68,68,0.10)',
              border:       '1px solid rgba(239,68,68,0.32)',
              color:        '#f87171',
              fontSize:     '12px',
              fontWeight:   600,
              cursor:       items.length === 0 ? 'not-allowed' : 'pointer',
              opacity:      items.length === 0 ? 0.5 : 1,
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '6px',
              transition:   'background 150ms',
            }}
          >
            <Trash2 size={12} /> Vaciar papelera
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center page-enter page-enter-delay-2">
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Cargando…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center page-enter page-enter-delay-2">
          <Trash2 size={28} style={{ color: '#4b5563', margin: '0 auto 12px' }} />
          <p style={{ color: '#e5e7eb', fontWeight: 600, marginBottom: '4px' }}>Tu papelera está vacía</p>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>Aquí aparecerán los elementos eliminados durante los próximos 30 días.</p>
        </div>
      ) : (
        <div className="card overflow-hidden page-enter page-enter-delay-2">
          {filtered.map((item, i) => (
            <div
              key={`${item.type}:${item.id}`}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '14px',
                padding:      '14px 18px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              {(() => {
                // Per-type color/icon. For accounts the icon is selected from
                // the row's `meta` (account-type token) — never from a specific
                // user-facing string like the account name.
                const palette =
                  item.type === 'investment'  ? { bg: 'rgba(99,102,241,0.12)',  fg: '#a78bfa' }
                  : item.type === 'transaction' ? { bg: 'rgba(16,185,129,0.10)',  fg: '#10b981' }
                                                : { bg: 'rgba(245,158,11,0.12)',  fg: '#f59e0b' }
                const Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> =
                  item.type === 'investment'   ? TrendingUp
                  : item.type === 'transaction' ? Receipt
                                                : iconForAccountType(item.meta)
                return (
                  <div
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: palette.bg, color: palette.fg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                )
              })()}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>{item.subtitle}</p>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '3px' }}>
                  {fmtDeletedAt(item.deletedAt)} · Quedan {item.daysRemaining} {item.daysRemaining === 1 ? 'día' : 'días'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => restoreOne(item)}
                  style={{
                    padding:      '6px 12px',
                    borderRadius: '8px',
                    background:   'rgba(99,102,241,0.10)',
                    border:       '1px solid rgba(99,102,241,0.30)',
                    color:        '#a78bfa',
                    fontSize:     '11px',
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'background 150ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.10)' }}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => hardDeleteOne(item)}
                  style={{
                    padding:      '6px 12px',
                    borderRadius: '8px',
                    background:   'transparent',
                    border:       '1px solid rgba(239,68,68,0.28)',
                    color:        '#f87171',
                    fontSize:     '11px',
                    fontWeight:   600,
                    cursor:       'pointer',
                    transition:   'background 150ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm empty modal */}
      {confirmEmpty && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmEmpty(false) }}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     50,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding:    '20px',
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              maxWidth:     '420px',
              background:   '#1a1f2e',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding:      '24px',
              boxShadow:    '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <AlertTriangle size={20} style={{ color: '#f87171' }} />
              <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '16px' }}>¿Vaciar la papelera?</p>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.55, marginBottom: '18px' }}>
              Esta acción elimina permanentemente {items.length} elemento{items.length === 1 ? '' : 's'} y no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={emptyTrash}
                style={{
                  padding:      '8px 16px',
                  borderRadius: '10px',
                  background:   '#ef4444',
                  border:       'none',
                  color:        '#fff',
                  fontSize:     '12px',
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                Sí, vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
