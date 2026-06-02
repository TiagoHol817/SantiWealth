'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { createClient } from '@/lib/supabase/client'
import { useBalance } from '@/context/BalanceContext'
import {
  LayoutDashboard, Layers, ArrowLeftRight, TrendingUp,
  PieChart, Target, Receipt, LogOut,
  Eye, EyeOff, Bell, X, BarChart3, Wallet,
  Sun, Moon, Settings2, Trash2, Landmark, PiggyBank,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import WealtHostBrand from '@/components/WealtHostBrand'
import type { ElementType } from 'react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const navGroups: { label?: string; items: { href: string; label: string; icon: ElementType; tooltip: string }[] }[] = [
  {
    items: [
      { href: '/patrimonio', label: 'Patrimonio', icon: Layers, tooltip: 'Composición y centro de control' },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      { href: '/transacciones', label: 'Transacciones', icon: ArrowLeftRight, tooltip: 'Ingresos y gastos'   },
      { href: '/inversiones',   label: 'Inversiones',   icon: TrendingUp,     tooltip: 'Bolsa, ETFs y cripto' },
      { href: '/cdts',          label: 'CDTs',          icon: Landmark,       tooltip: 'Certificados de depósito a término' },
      { href: '/presupuestos',  label: 'Presupuestos',  icon: PieChart,       tooltip: 'Controla tu gasto'    },
    ],
  },
  {
    label: 'PLANIFICACIÓN',
    items: [
      { href: '/metas',     label: 'Metas',             icon: Target,    tooltip: 'Tus objetivos financieros'              },
      { href: '/ahorros',   label: 'Ahorro programado', icon: PiggyBank, tooltip: 'Planes de ahorro con depósitos periódicos' },
      { href: '/costos-op', label: 'Costos fijos',      icon: Receipt,   tooltip: 'Gastos recurrentes'                      },
    ],
  },
  {
    label: 'ANÁLISIS',
    items: [
      { href: '/reportes', label: 'Reportes', icon: BarChart3, tooltip: 'Análisis y estadísticas' },
      { href: '/settings', label: 'Ajustes',  icon: Settings2, tooltip: 'Configuración'           },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { href: '/configuracion/cuentas',  label: 'Cuentas',  icon: Wallet, tooltip: 'Edita o elimina tus cuentas'      },
      { href: '/configuracion/papelera', label: 'Papelera', icon: Trash2, tooltip: 'Elementos eliminados (30 días)' },
    ],
  },
]

type CDTAlert    = { id: string; name: string; dias: number; capital: number; vencimiento: string }
type InvAlert    = { ticker: string; name: string; pct: number; precio: number }
type BudAlert    = { categoria: string; pct: number; gastado: number; limite: number }
type GoalAlert   = { id: string; name: string; pct: number; icon: string; falta: number }
type WeekSummary = { total: number; top: { cat: string; monto: number }[]; dias: number } | null

function NavTooltip({ label, tooltip, isCollapsed, children }: { label: string; tooltip?: string; isCollapsed: boolean; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const tooltipText = isCollapsed ? label : (tooltip ?? label)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="pointer-events-none absolute"
          style={{ left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '10px', zIndex: 200 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid #2a3040',
            }} />
            <div style={{
              backgroundColor: '#1a1f2e',
              border: '1px solid #2a3040',
              borderRadius: '8px',
              padding: '5px 10px',
              whiteSpace: 'nowrap',
              color: '#e5e7eb',
              fontSize: '12px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {tooltipText}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const hasHoverPointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const collapsed = isCollapsed

  const pathname = usePathname()
  const router   = useRouter()
  const { visible, toggle } = useBalance()

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const asideRef     = useRef<HTMLElement>(null)
  const logoRef      = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  const [cdtAlerts,   setCdtAlerts]   = useState<CDTAlert[]>([])
  const [invAlerts,   setInvAlerts]   = useState<InvAlert[]>([])
  const [budAlerts,   setBudAlerts]   = useState<BudAlert[]>([])
  const [goalAlerts,  setGoalAlerts]  = useState<GoalAlert[]>([])
  const [weekSummary, setWeekSummary] = useState<WeekSummary>(null)
  const [showAlerts,  setShowAlerts]  = useState(false)

  const fmtCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  // ── Set initial opacity to 0 before first paint to prevent flash ─────────
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const aside = asideRef.current
    if (!aside) return
    aside.querySelectorAll<HTMLElement>('.sidebar-logo, .nav-item, .nav-section-label, .sidebar-logout')
      .forEach(el => { el.style.opacity = '0' })
  }, [])

  // ── Entrance stagger on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion()) return
    const aside = asideRef.current
    if (!aside) return

    const a1 = animate(aside.querySelectorAll('.sidebar-logo'), {
      translateX: [-12, 0],
      opacity:    [0, 1],
      duration:   400,
      ease:       'out(3)',
    })
    const a2 = animate(aside.querySelectorAll('.nav-section-label'), {
      opacity:    [0, 1],
      translateY: [-6, 0],
      duration:   300,
      ease:       'out(3)',
      delay:      stagger(60, { start: 60 }),
    })
    const a3 = animate(aside.querySelectorAll('.nav-item'), {
      translateX: [-12, 0],
      opacity:    [0, 1],
      duration:   400,
      ease:       'out(3)',
      delay:      stagger(40, { start: 120 }),
    })
    const a4 = animate(aside.querySelectorAll('.sidebar-logout'), {
      opacity:  [0, 1],
      duration: 300,
      ease:     'out(3)',
      delay:    500,
    })

    return () => { a1.cancel(); a2.cancel(); a3.cancel(); a4.cancel() }
  }, [])

  // ── Active indicator scaleY on route change ───────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion()) return
    if (!indicatorRef.current) return
    const a = animate(indicatorRef.current, {
      scaleY:   [0, 1],
      duration: 250,
      ease:     'out(4)',
    })
    return () => { a.cancel() }
  }, [pathname])

  // ── Section label subtle breathe (after entrance settles) ─────────────────
  useEffect(() => {
    if (prefersReducedMotion()) return
    const aside = asideRef.current
    if (!aside) return
    let breatheAnim: ReturnType<typeof animate> | undefined
    const timer = setTimeout(() => {
      const labels = aside.querySelectorAll('.nav-section-label')
      if (!labels.length) return
      breatheAnim = animate(labels, {
        opacity:   0.7,
        duration:  1500,
        ease:      'inOut(2)',
        loop:      true,
        alternate: true,
      })
    }, 800)
    return () => {
      clearTimeout(timer)
      breatheAnim?.cancel()
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      const supabase = createClient()
      const today    = new Date()

      const { data: accounts } = await supabase.from('accounts').select('*')
      const cdtList: CDTAlert[] = []
      accounts?.filter(a => a.type === 'other' && a.name?.includes('CDT')).forEach(a => {
        try {
          const meta = typeof a.notes === 'string' ? JSON.parse(a.notes) : a.notes
          if (!meta?.vencimiento) return
          const dias = Math.ceil((new Date(meta.vencimiento + 'T12:00:00').getTime() - today.getTime()) / 86400000)
          if (dias <= 30) cdtList.push({ id: a.id, name: a.name, dias, capital: Number(a.current_balance), vencimiento: meta.vencimiento })
        } catch {}
      })
      cdtList.sort((a, b) => a.dias - b.dias)
      setCdtAlerts(cdtList)

      const { data: investments } = await supabase.from('investments').select('*')
      const invList: InvAlert[] = []
      await Promise.all((investments ?? []).map(async inv => {
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${inv.ticker}?interval=1d&range=5d`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          const d      = await r.json()
          const meta   = d?.chart?.result?.[0]?.meta
          const precio = meta?.regularMarketPrice ?? 0
          const prev   = meta?.chartPreviousClose ?? meta?.previousClose ?? precio
          if (!prev) return
          const pct = ((precio - prev) / prev) * 100
          if (Math.abs(pct) >= 2) invList.push({ ticker: inv.ticker, name: inv.name, pct, precio })
        } catch {}
      }))
      invList.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      setInvAlerts(invList)

      const mesNum  = today.getMonth() + 1
      const yearNum = today.getFullYear()
      const mesStr  = `${yearNum}-${String(mesNum).padStart(2,'0')}`
      const { data: budget } = await supabase.from('budgets').select('*').eq('month', mesNum).eq('year', yearNum).maybeSingle()
      const limites: Record<string,number> = budget?.notes ? JSON.parse(budget.notes) : {}
      const { data: txs } = await supabase.from('transactions').select('category,amount')
        .eq('type','expense').gte('date',`${mesStr}-01`).lte('date',`${mesStr}-31`)
      const gastos: Record<string,number> = {}
      txs?.forEach(t => { gastos[t.category] = (gastos[t.category] ?? 0) + Number(t.amount) })
      const budList: BudAlert[] = []
      Object.entries(limites).forEach(([cat, lim]) => {
        const gast = gastos[cat] ?? 0
        const pct  = lim > 0 ? (gast / lim) * 100 : 0
        if (pct >= 80) budList.push({ categoria: cat, pct, gastado: gast, limite: lim })
      })
      setBudAlerts(budList.sort((a, b) => b.pct - a.pct))

      const { data: goals } = await supabase.from('investment_goals').select('*')
      const goalList: GoalAlert[] = []
      goals?.forEach((g: any) => {
        const pct   = Math.min(100, Math.round(Number(g.current_amount) / Number(g.target_amount) * 100))
        const falta = Math.max(0, Number(g.target_amount) - Number(g.current_amount))
        if (pct >= 90 && pct < 100) goalList.push({ id: g.id, name: g.name, pct, icon: g.icon, falta })
      })
      setGoalAlerts(goalList)

      const hace7 = new Date(today)
      hace7.setDate(today.getDate() - 7)
      const { data: semana } = await supabase.from('transactions').select('category,amount')
        .eq('type','expense')
        .gte('date', hace7.toISOString().slice(0,10))
        .lte('date', today.toISOString().slice(0,10))
      if (semana && semana.length > 0) {
        const total = semana.reduce((s,t) => s + Number(t.amount), 0)
        const bycat: Record<string,number> = {}
        semana.forEach(t => { bycat[t.category] = (bycat[t.category] ?? 0) + Number(t.amount) })
        const top = Object.entries(bycat).sort((a,b) => b[1]-a[1]).slice(0,3).map(([cat,monto]) => ({ cat, monto }))
        setWeekSummary({ total, top, dias: 7 })
      }
    }
    loadAll()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const totalAlertas = cdtAlerts.length + invAlerts.length + budAlerts.length + goalAlerts.length + (weekSummary ? 1 : 0)
  const hayUrgente   = cdtAlerts.some(a => a.dias <= 7)  || budAlerts.some(a => a.pct >= 100) || invAlerts.some(a => Math.abs(a.pct) >= 4)
  const hayAlerta    = cdtAlerts.some(a => a.dias <= 15) || budAlerts.some(a => a.pct >= 90)  || invAlerts.some(a => Math.abs(a.pct) >= 3)
  const badgeColor   = hayUrgente ? '#ef4444' : hayAlerta ? '#f59e0b' : '#6366f1'

  const invColor = (pct: number) => Math.abs(pct) >= 4 ? '#ef4444' : Math.abs(pct) >= 3 ? '#f59e0b' : '#6366f1'
  const budColor = (pct: number) => pct >= 100 ? '#ef4444' : '#f59e0b'

  const notifLeft = collapsed ? '80px' : '270px'

  return (
    <aside
      ref={asideRef}
      className="flex flex-col h-screen fixed left-0 top-0 overflow-hidden"
      style={{
        width: collapsed ? '64px' : '256px',
        transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
        backgroundColor: '#0d1117',
        borderRight: '1px solid var(--wh-border, #1e2535)',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '16px 12px',
          borderBottom: '1px solid var(--wh-border, #1e2535)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '72px',
          transition: 'padding 300ms ease',
        }}
      >
        {/* Brand — hidden when collapsed */}
        <div
          className="sidebar-logo"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            overflow: 'hidden',
            maxWidth: collapsed ? '0px' : '160px',
            opacity: collapsed ? 0 : 1,
            transition: 'max-width 300ms ease, opacity 200ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            ref={logoRef}
            className="logo-avatar w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
            style={{ color: '#ffffff', cursor: 'default' }}
            onMouseEnter={() => {
              if (prefersReducedMotion() || !hasHoverPointer()) return
              if (logoRef.current) animate(logoRef.current, { rotate: 3, scale: 1.04, duration: 200, ease: 'out(3)' })
            }}
            onMouseLeave={() => {
              if (prefersReducedMotion()) return
              if (logoRef.current) animate(logoRef.current, { rotate: 0, scale: 1, duration: 200, ease: 'out(3)' })
            }}
          >
            W
          </div>
          <div>
            <WealtHostBrand size="sm" />
            <p className="brand-subtitle" style={{ margin: 0 }}>Finanzas personales</p>
          </div>
        </div>

        {/* W icon when collapsed */}
        {collapsed && (
          <div className="logo-avatar w-8 h-8 rounded-xl flex items-center justify-center font-black text-base"
            style={{ color: '#ffffff' }}>
            W
          </div>
        )}

        {/* Action buttons — shown when expanded */}
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAlerts(v => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: totalAlertas > 0 ? badgeColor : '#4b5563', position: 'relative' }}
              >
                <Bell size={13} />
                {totalAlertas > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: badgeColor, fontSize: '8px' }}>
                    {totalAlertas > 9 ? '9+' : totalAlertas}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={toggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: visible ? '#4b5563' : '#D4AF37' }}
            >
              {visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: '#4b5563' }}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Collapse toggle button */}
      <button
        onClick={onToggle}
        className="sidebar-toggle-btn"
        title={collapsed ? 'Expandir' : 'Colapsar'}
        style={{ alignSelf: 'flex-end', marginBottom: '8px', marginTop: '8px', marginRight: collapsed ? 'auto' : '8px', marginLeft: collapsed ? 'auto' : undefined }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Collapsed icon row — action buttons */}
      {collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px 0 8px' }}>
          <NavTooltip label="Notificaciones" isCollapsed={collapsed}>
            <button
              onClick={() => setShowAlerts(v => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: totalAlertas > 0 ? badgeColor : '#4b5563', position: 'relative' }}
            >
              <Bell size={15} />
              {totalAlertas > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: badgeColor, fontSize: '8px' }}>
                  {totalAlertas > 9 ? '9+' : totalAlertas}
                </span>
              )}
            </button>
          </NavTooltip>
          <NavTooltip label={visible ? 'Ocultar saldos' : 'Mostrar saldos'} isCollapsed={collapsed}>
            <button onClick={toggle}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: visible ? '#4b5563' : '#D4AF37' }}>
              {visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </NavTooltip>
          {mounted && (
            <NavTooltip label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} isCollapsed={collapsed}>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: '#4b5563' }}>
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </NavTooltip>
          )}
        </div>
      )}

      {/* Notification panel */}
      {showAlerts && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setShowAlerts(false)} />
          <div className="notifications-panel fixed rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: '320px', top: '70px', left: notifLeft,
              maxHeight: '85vh', overflowY: 'auto', zIndex: 9999,
              transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
            <div className="notifications-panel flex items-center justify-between px-4 py-3 sticky top-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Bell size={14} color={badgeColor} />
                <p className="text-white font-semibold text-sm">Notificaciones</p>
                {totalAlertas > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: badgeColor + '25', color: badgeColor }}>
                    {totalAlertas}
                  </span>
                )}
              </div>
              <button onClick={() => setShowAlerts(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10"
                style={{ color: '#6b7280' }}>
                <X size={13} />
              </button>
            </div>

            {totalAlertas === 0 ? (
              <div className="px-4 py-8 text-center">
                <p style={{ color: '#6b7280', fontSize: '24px', marginBottom: '8px' }}>✓</p>
                <p className="text-white font-medium text-sm mb-1">Todo en orden</p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>No hay alertas pendientes</p>
              </div>
            ) : (
              <>
                {weekSummary && (
                  <div>
                    <SectionLabel label="Resumen semanal" color="#6b7280" />
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid #1e2535' }}>
                      <div className="rounded-xl p-3" style={{ backgroundColor: '#ffffff08', border: '1px solid #2a3040' }}>
                        <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>Gastaste esta semana</p>
                        <p className="tabular-nums font-bold text-lg" style={{ color: '#f59e0b' }}>{fmtCOP(weekSummary.total)}</p>
                        <div className="mt-2 space-y-1">
                          {weekSummary.top.map(t => (
                            <div key={t.cat} className="flex justify-between items-center">
                              <span style={{ color: '#9ca3af', fontSize: '11px' }}>{t.cat}</span>
                              <span className="tabular-nums" style={{ color: '#e5e7eb', fontSize: '11px' }}>{fmtCOP(t.monto)}</span>
                            </div>
                          ))}
                        </div>
                        <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '8px' }}>Úsalo para planear la semana que viene</p>
                      </div>
                    </div>
                  </div>
                )}
                {invAlerts.length > 0 && (
                  <div>
                    <SectionLabel label="Movimientos en inversiones" color="#6366f1" />
                    {invAlerts.map(a => {
                      const color = invColor(a.pct)
                      const sube  = a.pct > 0
                      return (
                        <Link key={a.ticker} href="/inversiones" onClick={() => setShowAlerts(false)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all"
                          style={{ borderBottom: '1px solid #1e2535' }}>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white text-sm font-medium">{a.ticker}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                                style={{ backgroundColor: color + '20', color }}>
                                {sube ? '▲' : '▼'} {Math.abs(a.pct).toFixed(2)}%
                              </span>
                            </div>
                            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                              {a.name} · {sube ? '↑ Subiendo' : '↓ Cayendo'}
                              {!sube && Math.abs(a.pct) >= 3 && ' — oportunidad de compra'}
                            </p>
                          </div>
                          <p className="tabular-nums text-xs" style={{ color: '#9ca3af' }}>${a.precio.toFixed(2)}</p>
                        </Link>
                      )
                    })}
                  </div>
                )}
                {budAlerts.length > 0 && (
                  <div>
                    <SectionLabel label="Presupuesto — advertencia" color="#f59e0b" />
                    {budAlerts.map(a => {
                      const color    = budColor(a.pct)
                      const excedido = a.pct >= 100
                      return (
                        <Link key={a.categoria} href="/presupuestos" onClick={() => setShowAlerts(false)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all"
                          style={{ borderBottom: '1px solid #1e2535' }}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white text-sm font-medium">{a.categoria}</p>
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                                style={{ backgroundColor: color + '20', color }}>
                                {Math.round(a.pct)}%
                              </span>
                            </div>
                            <div className="rounded-full overflow-hidden mb-1" style={{ height: '4px', backgroundColor: '#0f1117' }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, a.pct)}%`, backgroundColor: color }} />
                            </div>
                            <p style={{ color: '#6b7280', fontSize: '11px' }}>
                              {excedido ? `Excediste en ${fmtCOP(a.gastado - a.limite)}` : `Quedan ${fmtCOP(a.limite - a.gastado)} disponibles`}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
                {goalAlerts.length > 0 && (
                  <div>
                    <SectionLabel label="Metas — casi listas" color="#10b981" />
                    {goalAlerts.map(a => (
                      <Link key={a.id} href="/metas" onClick={() => setShowAlerts(false)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all"
                        style={{ borderBottom: '1px solid #1e2535' }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{a.icon}</span>
                            <p className="text-white text-sm font-medium">{a.name}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                              style={{ backgroundColor: '#10b98120', color: '#10b981' }}>
                              {a.pct}%
                            </span>
                          </div>
                          <div className="rounded-full overflow-hidden mb-1" style={{ height: '4px', backgroundColor: '#0f1117' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${a.pct}%`, background: 'linear-gradient(90deg, #10b981, #6366f1)' }} />
                          </div>
                          <p style={{ color: '#6b7280', fontSize: '11px' }}>
                            {a.pct >= 95 ? `Solo faltan ${fmtCOP(a.falta)}` : `Vas muy bien, faltan ${fmtCOP(a.falta)}`}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {cdtAlerts.length > 0 && (
                  <div>
                    <SectionLabel label="CDTs próximos a vencer" color="#f59e0b" />
                    {cdtAlerts.map(a => {
                      const color = a.dias <= 7 ? '#ef4444' : a.dias <= 15 ? '#f59e0b' : '#6366f1'
                      return (
                        <Link key={a.id} href="/cdts" onClick={() => setShowAlerts(false)}
                          className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-all"
                          style={{ borderBottom: '1px solid #1e2535' }}>
                          <div>
                            <p className="text-white text-sm font-medium">{a.name}</p>
                            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                              {fmtCOP(a.capital)} · {a.vencimiento}
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{ backgroundColor: color + '20', color }}>
                            {a.dias <= 0 ? 'Vencido' : `${a.dias}d`}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            <div className="notifications-panel px-4 py-3 sticky bottom-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#4b5563', fontSize: '10px', textAlign: 'center' }}>Actualizado al abrir la app</p>
            </div>
          </div>
        </>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="nav-section-label">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon   = item.icon
                return (
                  <NavTooltip key={item.href} label={item.label} tooltip={item.tooltip} isCollapsed={collapsed}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.tooltip : undefined}
                      className={`flex items-center rounded-xl text-sm font-medium relative nav-item transition-all${active ? ' nav-item-active' : ''}`}
                      style={{
                        gap:            collapsed ? '0' : '10px',
                        padding:        collapsed ? '10px' : '9px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                      }}
                      onMouseEnter={(e) => {
                        if (active || !hasHoverPointer() || prefersReducedMotion()) return
                        animate(e.currentTarget, { translateX: 3, duration: 150, ease: 'out(3)' })
                      }}
                      onMouseLeave={(e) => {
                        if (active || prefersReducedMotion()) return
                        animate(e.currentTarget, { translateX: 0, duration: 150, ease: 'out(3)' })
                      }}
                    >
                      {active && !collapsed && (
                        <div
                          ref={indicatorRef}
                          className="absolute left-0 w-0.5 h-5 rounded-r-full nav-item-indicator"
                          style={{ top: 'calc(50% - 10px)', transformOrigin: 'center bottom' }}
                        />
                      )}
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                      <span style={{
                        maxWidth:   collapsed ? '0px' : '160px',
                        opacity:    collapsed ? 0 : 1,
                        overflow:   'hidden',
                        whiteSpace: 'nowrap',
                        transition: 'max-width 300ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease',
                      }}>
                        {item.label}
                      </span>
                    </Link>
                  </NavTooltip>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '12px 0' : '12px', borderTop: '1px solid var(--wh-border, #1e2535)' }}>
        <NavTooltip label="Cerrar sesión" isCollapsed={collapsed}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className="sidebar-logout flex items-center rounded-xl text-sm font-medium w-full transition-all duration-200"
            style={{
              gap:            collapsed ? '0' : '10px',
              padding:        collapsed ? '10px' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color:          '#6b7280',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#ef444415'
              ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#6b7280'
            }}
          >
            <LogOut size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            <span style={{
              maxWidth:   collapsed ? '0px' : '160px',
              opacity:    collapsed ? 0 : 1,
              overflow:   'hidden',
              whiteSpace: 'nowrap',
              transition: 'max-width 300ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease',
            }}>
              Cerrar sesión
            </span>
          </button>
        </NavTooltip>
        {!collapsed && (
          <p className="text-center mt-2" style={{ color: '#2a3040', fontSize: '10px', letterSpacing: '0.04em' }}>
            WealtHost · v2.0
          </p>
        )}
      </div>
    </aside>
  )
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <p className="px-4 pt-3 pb-1"
      style={{ color, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: color + '08' }}>
      {label}
    </p>
  )
}
