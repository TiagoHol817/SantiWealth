'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Landmark, Wallet, TrendingUp, Bitcoin, AlertCircle, Box,
  MoreVertical, Pencil, Trash2, Plus, Loader2, ArrowLeft,
} from 'lucide-react'
import HiddenValue from '@/components/HiddenValue'
import HelpModal from '@/components/help/HelpModal'
import AccountEditModal, { type AccountInit } from '@/components/AccountEditModal'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/context/ToastContext'

type AccountType = 'bank' | 'cash' | 'brokerage' | 'crypto' | 'liability' | 'other'

interface Account {
  id:              string
  name:            string
  type:            AccountType
  currency:        'COP' | 'USD'
  current_balance: number | string
  institution:     string | null
}

const TYPE_META: Record<AccountType, { label: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> ; color: string }> = {
  bank:      { label: 'Banco',      Icon: Landmark,    color: '#6366f1' },
  cash:      { label: 'Efectivo',   Icon: Wallet,      color: '#10b981' },
  brokerage: { label: 'Brokerage',  Icon: TrendingUp,  color: '#a78bfa' },
  crypto:    { label: 'Cripto',     Icon: Bitcoin,     color: '#f59e0b' },
  liability: { label: 'Pasivo',     Icon: AlertCircle, color: '#ef4444' },
  other:     { label: 'Otro',       Icon: Box,         color: '#6b7280' },
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmt = (n: number, c: 'COP' | 'USD') => (c === 'USD' ? fmtUSD(n) : fmtCOP(n))

export default function CuentasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<AccountInit | null>(null)
  const [creating, setCreating]   = useState(false)
  const [menuFor, setMenuFor]     = useState<string | null>(null)

  // Confirm-delete state
  const [confirmTarget, setConfirmTarget] = useState<Account | null>(null)
  const [linkedCount, setLinkedCount]     = useState(0)
  const [deleting, setDeleting]           = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/accounts')
      const data = await res.json() as { accounts?: Account[]; error?: string }
      if (!res.ok || data.error) {
        toast.error('No se pudieron cargar las cuentas', data.error)
        return
      }
      setAccounts(data.accounts ?? [])
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!menuFor) return
    function onDoc() { setMenuFor(null) }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [menuFor])

  async function askDeleteAccount(a: Account) {
    // Pre-check linked transactions so the confirm message is accurate.
    let count = 0
    try {
      const r = await fetch(`/api/accounts/${a.id}`)
      const d = await r.json() as { linkedTransactions?: number }
      count = d.linkedTransactions ?? 0
    } catch { /* fall through — modal still opens */ }
    setLinkedCount(count)
    setConfirmTarget(a)
  }

  async function confirmDeleteAccount() {
    const a = confirmTarget
    if (!a) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/accounts/${a.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAccounts((prev) => prev.filter((x) => x.id !== a.id))
        setConfirmTarget(null)
        toast.withAction({
          type:     'success',
          title:    'Cuenta movida a la papelera',
          message:  a.name,
          duration: 10_000,
          action: {
            label: 'Deshacer',
            onClick: async () => {
              const r = await fetch(`/api/accounts/${a.id}`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({}),
              })
              if (r.ok) { await load(); router.refresh() }
            },
          },
        })
        router.refresh()
      } else {
        toast.error('No se pudo eliminar la cuenta')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 pb-8" style={{ maxWidth: '880px', margin: '0 auto' }}>
      <a
        href="/settings"
        className="inline-flex items-center gap-2"
        style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
      >
        <ArrowLeft size={14} /> Volver a Configuración
      </a>

      <div className="page-enter">
        <div className="relative flex items-end justify-between" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 className="page-title">Mis cuentas</h1>
            <p className="page-subtitle">Edita o elimina las cuentas que registraste</p>
          </div>
          <div className="flex items-center gap-3">
            <HelpModal moduleId="cuentas" />
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary inline-flex items-center gap-2"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              <Plus size={14} /> Nueva cuenta
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center page-enter page-enter-delay-1">
          <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 10px', color: '#6b7280' }} />
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Cargando…</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="card card-purple p-12 text-center page-enter page-enter-delay-1">
          <Wallet size={32} style={{ color: '#a78bfa', margin: '0 auto 14px' }} />
          <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>
            No tienes cuentas registradas
          </p>
          <p style={{ color: '#9ca3af', fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px' }}>
            Crea una cuenta para empezar a registrar movimientos.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary inline-flex items-center gap-2"
            style={{ padding: '11px 20px', fontSize: '13px' }}
          >
            <Plus size={14} /> Crear primera cuenta
          </button>
        </div>
      ) : (
        <div className="cuentas-grid page-enter page-enter-delay-1">
          {accounts.map((a) => {
            const meta = TYPE_META[a.type] ?? TYPE_META.other
            const Icon = meta.Icon
            return (
              <div
                key={a.id}
                className="card card-purple"
                style={{ padding: '18px 20px', position: 'relative', overflow: 'visible' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: meta.color + '20', color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '15px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </p>
                    <span
                      style={{
                        display:      'inline-block',
                        padding:      '2px 8px',
                        borderRadius: '999px',
                        fontSize:     '10px',
                        fontWeight:   600,
                        background:   meta.color + '18',
                        color:        meta.color,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {meta.label.toUpperCase()} · {a.currency}
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      aria-label="Más acciones"
                      onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === a.id ? null : a.id) }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: menuFor === a.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                        border: 'none', color: '#9ca3af', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <MoreVertical size={15} />
                    </button>
                    {menuFor === a.id && (
                      <div
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute', top: '32px', right: 0, minWidth: '150px',
                          background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                          padding: '5px', zIndex: 20,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => { setMenuFor(null); setEditing({
                            id: a.id, name: a.name, type: a.type,
                            currency: a.currency, current_balance: a.current_balance,
                          }) }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', borderRadius: '7px',
                            background: 'transparent', border: 'none', color: '#e5e7eb',
                            fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMenuFor(null); void askDeleteAccount(a) }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', borderRadius: '7px',
                            background: 'transparent', border: 'none', color: '#ef4444',
                            fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    Saldo actual
                  </p>
                  <HiddenValue
                    value={fmt(Number(a.current_balance) || 0, a.currency)}
                    className="tabular-nums font-bold"
                    style={{ color: meta.color, fontSize: '22px' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AccountEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
      />
      <AccountEditModal
        open={creating}
        onClose={() => setCreating(false)}
      />

      <ConfirmModal
        open={confirmTarget !== null}
        title="Eliminar cuenta"
        message={
          confirmTarget
            ? (linkedCount > 0
                ? `"${confirmTarget.name}" tiene ${linkedCount} transacción${linkedCount === 1 ? '' : 'es'} vinculada${linkedCount === 1 ? '' : 's'}. Las transacciones se conservarán pero la cuenta se moverá a la papelera. ¿Continuar?`
                : `Mover "${confirmTarget.name}" a la papelera. Puedes restaurarla en 30 días.`)
            : ''
        }
        confirmLabel="Eliminar cuenta"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setConfirmTarget(null)}
      />

      <style>{`
        .cuentas-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 760px) {
          .cuentas-grid { grid-template-columns: 1fr }
        }
      `}</style>
    </div>
  )
}
