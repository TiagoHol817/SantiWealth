'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, ArrowLeft, Check, AlertTriangle, RefreshCcw, Plus, ShieldCheck } from 'lucide-react'
import { extractTransactionsFromImage } from '@/lib/ocr/extract-transactions'

// ── Types ────────────────────────────────────────────────────────────────────
type Filter = 'gastos' | 'ingresos' | 'todos'
type TxType = 'income' | 'expense'

interface ParsedTx {
  id:          string
  date:        string
  description: string
  amount:      number
  type:        TxType
  selected:    boolean
}

interface AccountOption {
  id:          string
  name:        string
  type:        string
  currency:    string
  institution: string | null
}

interface ScreenshotImportModalProps {
  open:    boolean
  onClose: () => void
}

type Step = 'upload' | 'preview' | 'success'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Component ────────────────────────────────────────────────────────────────
export default function ScreenshotImportModal({ open, onClose }: ScreenshotImportModalProps) {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Shared state
  const [step, setStep]       = useState<Step>('upload')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Upload state
  const [file, setFile]               = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [filter, setFilter]           = useState<Filter>('gastos')
  const [accounts, setAccounts]       = useState<AccountOption[]>([])
  const [accountId, setAccountId]     = useState<string>('')
  const [dragOver, setDragOver]       = useState(false)

  // Account loading lifecycle. Three terminal states once the request resolves:
  //   accountsLoading=true             → "Cargando cuentas..."
  //   loadError !== null               → red box + retry button
  //   hasLoadedAccounts=true, len === 0→ yellow warning + "Crear cuenta ahora"
  //   hasLoadedAccounts=true, len >= 1 → normal select dropdown
  const [hasLoadedAccounts, setHasLoadedAccounts] = useState(false)
  const [accountsLoading, setAccountsLoading]     = useState(false)
  const [loadError, setLoadError]                 = useState<string | null>(null)

  // Analysis state — OCR runs entirely client-side, no network call.
  // `analyzing` gates the UI; `progress` is a 0..1 float across the pipeline.
  const [analyzing, setAnalyzing]     = useState(false)
  const [progress, setProgress]       = useState(0)

  // Preview state
  const [bank, setBank]               = useState<string>('')
  const [rows, setRows]               = useState<ParsedTx[]>([])
  const [savedCount, setSavedCount]   = useState(0)

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // Load accounts on demand. Wrapped so the Reintentar button can re-trigger.
  // 10-second timeout via AbortController — anything slower is treated as an
  // error so the user isn't stuck on "Cargando cuentas..." forever.
  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setAccountsLoading(true)
    setLoadError(null)

    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 10_000)
    // If the caller passed its own signal (cleanup on unmount), chain it.
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

    try {
      const res = await fetch('/api/accounts', { signal: controller.signal })
      if (!res.ok) {
        setLoadError('No se pudieron cargar las cuentas')
        return
      }
      const data = await res.json() as { accounts?: AccountOption[]; error?: string }
      const list = Array.isArray(data.accounts) ? data.accounts : []
      setAccounts(list)
      if (list.length > 0) setAccountId(list[0].id)
      setHasLoadedAccounts(true)
    } catch (err) {
      // AbortError from external signal during unmount → silently ignore
      if ((err as Error).name === 'AbortError' && signal?.aborted) return
      setLoadError('No se pudieron cargar las cuentas')
    } finally {
      clearTimeout(timeoutId)
      setAccountsLoading(false)
    }
  }, [])

  // Load accounts once when the modal opens. Re-runs if the user retries.
  useEffect(() => {
    if (!open || hasLoadedAccounts) return
    const ac = new AbortController()
    void loadAccounts(ac.signal)
    return () => ac.abort()
  }, [open, hasLoadedAccounts, loadAccounts])

  // Reset internal state when closing. We DON'T clear the accounts cache —
  // if the user closes and reopens, the dropdown is instantly ready.
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setStep('upload'); setError(null); setLoading(false)
      setAnalyzing(false); setProgress(0)
      setFile(null); setPreviewUrl(null); setFilter('gastos')
      setBank(''); setRows([]); setSavedCount(0); setDragOver(false)
    }, 200)
    return () => clearTimeout(t)
  }, [open])

  // Cleanup object URLs
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ── Handlers ───────────────────────────────────────────────────────────────
  function acceptFile(f: File) {
    setError(null)
    if (!f.type.startsWith('image/')) {
      setError('Selecciona una imagen válida (JPG, PNG o WebP)')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('La imagen supera 10 MB')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function analyze() {
    if (!file)      { setError('Selecciona una imagen'); return }
    if (!accountId) { setError('Selecciona una cuenta destino'); return }
    setAnalyzing(true); setProgress(0); setError(null)

    try {
      const result = await extractTransactionsFromImage(file, (p) => setProgress(p))

      // Apply the gastos/ingresos/todos filter chosen on Step 1.
      let filtered = result.transactions
      if      (filter === 'gastos')   filtered = filtered.filter((t) => t.type === 'expense')
      else if (filter === 'ingresos') filtered = filtered.filter((t) => t.type === 'income')

      if (filtered.length === 0) {
        setError('No se detectaron movimientos en la imagen')
        return
      }

      setBank(result.bank)
      setRows(filtered.map((t) => ({
        id:          uid(),
        date:        t.date,
        description: t.description,
        amount:      t.amount,
        type:        t.type,
        selected:    true,
      })))
      setStep('preview')
    } catch {
      setError('No se pudieron leer los movimientos. Intenta con una imagen más clara.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updateRow(id: string, patch: Partial<ParsedTx>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function saveSelected() {
    const selected = rows.filter((r) => r.selected && r.date && r.amount > 0)
    if (selected.length === 0) { setError('Selecciona al menos un movimiento'); return }
    setLoading(true); setError(null)

    try {
      const res = await fetch('/api/import-transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          source:     'screenshot',
          rows: selected.map((r) => ({
            date:        r.date,
            description: r.description,
            amount:      r.amount,
            type:        r.type,
            category:    r.type === 'income' ? 'Ingreso' : 'Otro',
          })),
        }),
      })
      const data = await res.json() as { success?: boolean; count?: number; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudieron guardar las transacciones')
        return
      }
      setSavedCount(data.count ?? selected.length)
      setStep('success')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedRows = rows.filter((r) => r.selected)
  const netSelected  = selectedRows.reduce(
    (s, r) => s + (r.type === 'expense' ? -r.amount : r.amount), 0
  )

  if (!open) return null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 screenshot-modal-overlay"
      style={{
        background:    'rgba(0,0,0,0.62)',
        backdropFilter:'blur(8px)',
        animation:     'screenshotFadeIn 180ms cubic-bezier(0.16,1,0.3,1) both',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full overflow-hidden screenshot-modal-card"
        style={{
          maxWidth:     '720px',
          maxHeight:    '90vh',
          background:   '#1a1f2e',
          border:       '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow:    '0 32px 80px rgba(0,0,0,0.5)',
          display:      'flex',
          flexDirection:'column',
          animation:    'screenshotZoomIn 240ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute transition-all"
          style={{
            top:        '14px',
            right:      '14px',
            width:      '32px',
            height:     '32px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border:     '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color:      '#9ca3af',
            cursor:     'pointer',
            zIndex:     2,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{
            color: '#a78bfa', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '6px',
          }}>
            {step === 'upload' ? 'Importar desde captura'
              : step === 'preview' ? 'Revisar movimientos'
              : 'Importación completa'}
          </p>
          <h2 style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {step === 'upload'  ? 'Sube una imagen de tu app bancaria'
              : step === 'preview' ? `Movimientos detectados · ${bank}`
              : '¡Listo!'}
          </h2>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

          {/* ═══ STEP 1: UPLOAD ═══ */}
          {step === 'upload' && (
            <div className="space-y-5">

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) acceptFile(f)
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                style={{
                  border:       `1.5px dashed ${dragOver ? '#a78bfa' : 'rgba(255,255,255,0.12)'}`,
                  background:   dragOver ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '14px',
                  padding:      previewUrl ? '20px' : '40px 20px',
                  textAlign:    'center',
                  cursor:       'pointer',
                  transition:   'all 180ms cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={(e) => {
                  if (dragOver) return
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167,139,250,0.45)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.04)'
                }}
                onMouseLeave={(e) => {
                  if (dragOver) return
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                {previewUrl ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      style={{
                        width:        '88px',
                        height:       '88px',
                        objectFit:    'cover',
                        borderRadius: '10px',
                        border:       '1px solid rgba(255,255,255,0.08)',
                      }}
                    />
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <p style={{
                        color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginBottom: '3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {file?.name}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>
                        {((file?.size ?? 0) / 1024).toFixed(0)} KB · {file?.type.replace('image/', '').toUpperCase()}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (previewUrl) URL.revokeObjectURL(previewUrl)
                          setFile(null); setPreviewUrl(null)
                        }}
                        style={{
                          background: 'none', border: 'none', color: '#a78bfa',
                          fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '4px',
                        }}
                      >
                        Cambiar imagen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'rgba(167,139,250,0.10)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '14px',
                    }}>
                      <Upload size={20} style={{ color: '#a78bfa' }} />
                    </div>
                    <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      Arrastra una captura aquí
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>
                      o <span style={{ color: '#a78bfa' }}>haz clic para seleccionar</span> · JPG, PNG o WebP · máx 10 MB
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f) }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Filter selector */}
              <div>
                <label className="form-label">¿Qué importar?</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { id: 'gastos',   label: 'Gastos',   color: '#ef4444' },
                    { id: 'ingresos', label: 'Ingresos', color: '#10b981' },
                    { id: 'todos',    label: 'Todos',    color: '#a78bfa' },
                  ] as { id: Filter; label: string; color: string }[]).map((f) => {
                    const active = filter === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          background: active ? `${f.color}1A` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${active ? `${f.color}80` : 'rgba(255,255,255,0.07)'}`,
                          color: active ? f.color : '#9ca3af',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Account selector — 4 mutually-exclusive states */}
              <div>
                <label className="form-label">Cuenta destino *</label>

                {/* State A: loading */}
                {accountsLoading && (
                  <div
                    className="form-input flex items-center gap-2"
                    style={{ color: '#6b7280', cursor: 'wait' }}
                  >
                    <Loader2 size={13} className="animate-spin" />
                    Cargando cuentas...
                  </div>
                )}

                {/* State B: load error → red box + retry */}
                {!accountsLoading && loadError && (
                  <div
                    style={{
                      padding:      '12px 14px',
                      borderRadius: '10px',
                      background:   'rgba(239,68,68,0.08)',
                      border:       '1px solid rgba(239,68,68,0.28)',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '10px',
                    }}
                  >
                    <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                    <span style={{ color: '#f87171', fontSize: '12px', flex: 1 }}>{loadError}</span>
                    <button
                      type="button"
                      onClick={() => loadAccounts()}
                      style={{
                        display:      'inline-flex',
                        alignItems:   'center',
                        gap:          '5px',
                        padding:      '5px 10px',
                        borderRadius: '7px',
                        background:   'rgba(255,255,255,0.06)',
                        border:       '1px solid rgba(255,255,255,0.10)',
                        color:        '#e5e7eb',
                        fontSize:     '11px',
                        fontWeight:   600,
                        cursor:       'pointer',
                        transition:   'background 150ms',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                    >
                      <RefreshCcw size={11} /> Reintentar
                    </button>
                  </div>
                )}

                {/* State C: loaded but empty → yellow warning + create-account CTA */}
                {!accountsLoading && !loadError && hasLoadedAccounts && accounts.length === 0 && (
                  <div
                    style={{
                      padding:      '14px 16px',
                      borderRadius: '12px',
                      background:   'rgba(245,158,11,0.08)',
                      border:       '1px solid rgba(245,158,11,0.30)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                      <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px', marginBottom: '3px' }}>
                          No tienes cuentas registradas
                        </p>
                        <p style={{ color: '#fde68a', fontSize: '12px', lineHeight: 1.55 }}>
                          Para importar movimientos necesitas al menos una cuenta.
                        </p>
                      </div>
                    </div>
                    {/* The only place that currently lets users create accounts
                        is the onboarding wizard (Step 2). Until a dedicated
                        /cuentas page exists, this is the correct destination. */}
                    <a
                      href="/onboarding"
                      style={{
                        display:        'inline-flex',
                        alignItems:     'center',
                        gap:            '6px',
                        padding:        '7px 14px',
                        borderRadius:   '8px',
                        background:     '#f59e0b',
                        color:          '#1a1f2e',
                        fontSize:       '12px',
                        fontWeight:     700,
                        textDecoration: 'none',
                        transition:     'all 150ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#fbbf24'
                        ;(e.currentTarget as HTMLElement).style.transform  = 'translateY(-1px)'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#f59e0b'
                        ;(e.currentTarget as HTMLElement).style.transform  = 'translateY(0)'
                      }}
                    >
                      <Plus size={13} /> Crear cuenta ahora
                    </a>
                  </div>
                )}

                {/* State D: loaded with accounts → real dropdown */}
                {!accountsLoading && !loadError && accounts.length > 0 && (
                  <select
                    className="form-input"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{ appearance: 'none', cursor: 'pointer' }}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.institution ? `· ${a.institution}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* OCR progress (only while analyzing) */}
              {analyzing && (
                <div
                  style={{
                    padding:      '14px 16px',
                    borderRadius: '12px',
                    background:   'rgba(167,139,250,0.06)',
                    border:       '1px solid rgba(167,139,250,0.18)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#e5e7eb', fontSize: '12px', fontWeight: 600 }}>
                      {progress < 0.1  ? 'Cargando OCR...'
                       : progress < 0.9 ? 'Leyendo imagen...'
                                        : 'Identificando movimientos...'}
                    </span>
                    <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height:     '100%',
                        width:      `${Math.max(2, progress * 100)}%`,
                        background: 'linear-gradient(90deg, #a78bfa, #6366f1)',
                        borderRadius: '999px',
                        transition: 'width 240ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                    <ShieldCheck size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ color: '#6b7280', fontSize: '11px', lineHeight: 1.5 }}>
                      Procesamiento 100% local — tu imagen nunca sale de tu dispositivo
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl flex items-center gap-2 text-sm"
                  style={{
                    padding: '11px 13px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                  }}
                >
                  <span>⚠</span> {error}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: PREVIEW ═══ */}
          {step === 'preview' && (
            <div>
              <div className="screenshot-table-wrap" style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  minWidth: '560px',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={thStyle}></th>
                      <th style={thStyle}>Fecha</th>
                      <th style={thStyle}>Descripción</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Monto</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          opacity:      r.selected ? 1 : 0.40,
                          transition:   'opacity 150ms cubic-bezier(0.16,1,0.3,1)',
                        }}
                        className="screenshot-row"
                      >
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) => updateRow(r.id, { selected: e.target.checked })}
                            className="screenshot-checkbox"
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#a78bfa' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="date"
                            value={r.date}
                            onChange={(e) => updateRow(r.id, { date: e.target.value })}
                            className="form-input"
                            style={{ padding: '6px 8px', fontSize: '12px', minWidth: '128px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="text"
                            value={r.description}
                            onChange={(e) => updateRow(r.id, { description: e.target.value })}
                            className="form-input"
                            style={{ padding: '6px 8px', fontSize: '12px', minWidth: '160px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px', verticalAlign: 'middle' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={r.amount}
                            onChange={(e) => updateRow(r.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
                            className="form-input"
                            style={{
                              padding: '6px 8px', fontSize: '12px',
                              textAlign: 'right', minWidth: '110px',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => updateRow(r.id, { type: r.type === 'expense' ? 'income' : 'expense' })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: '1px solid',
                              transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
                              background:  r.type === 'expense' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                              color:       r.type === 'expense' ? '#ef4444' : '#10b981',
                              borderColor: r.type === 'expense' ? 'rgba(239,68,68,0.30)' : 'rgba(16,185,129,0.30)',
                            }}
                          >
                            {r.type === 'expense' ? 'Gasto' : 'Ingreso'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div style={{
                marginTop: '18px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(167,139,250,0.06)',
                border: '1px solid rgba(167,139,250,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: '#e5e7eb', fontSize: '13px' }}>
                  <strong>{selectedRows.length}</strong> movimiento{selectedRows.length !== 1 ? 's' : ''} seleccionado{selectedRows.length !== 1 ? 's' : ''}
                </span>
                <span style={{
                  color: netSelected >= 0 ? '#10b981' : '#ef4444',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '14px',
                }}>
                  Neto: {netSelected >= 0 ? '+' : ''}{fmtCOP(netSelected)}
                </span>
              </div>

              {error && (
                <div
                  className="rounded-xl flex items-center gap-2 text-sm mt-4"
                  style={{
                    padding: '11px 13px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                  }}
                >
                  <span>⚠</span> {error}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 3: SUCCESS ═══ */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
              <div className="screenshot-check" style={{
                width: '76px', height: '76px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.10)',
                border: '1.5px solid rgba(16,185,129,0.30)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Check size={36} strokeWidth={3} style={{ color: '#10b981' }} />
              </div>
              <p style={{
                color: '#e5e7eb', fontSize: '20px', fontWeight: 700,
                marginBottom: '6px', letterSpacing: '-0.01em',
              }}>
                ¡{savedCount} transaccion{savedCount === 1 ? '' : 'es'} guardada{savedCount === 1 ? '' : 's'}!
              </p>
              <p style={{ color: '#9ca3af', fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
                Las nuevas transacciones aparecen ya en tu listado. Las duplicadas fueron omitidas automáticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer / actions */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.18)',
          display: 'flex',
          gap: '10px',
          justifyContent: step === 'success' ? 'center' : 'space-between',
          alignItems: 'center',
        }}>
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '10px 18px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={analyze}
                disabled={analyzing || loading || !file || !accountId || accounts.length === 0}
                title={
                  accounts.length === 0 && hasLoadedAccounts && !loadError
                    ? 'Crea una cuenta primero'
                    : !file
                      ? 'Selecciona una imagen primero'
                      : undefined
                }
                className="btn-primary flex items-center gap-2"
                style={{
                  padding:    '11px 20px',
                  opacity:    (analyzing || loading || !file || !accountId || accounts.length === 0) ? 0.5 : 1,
                  cursor:     (analyzing || loading || !file || !accountId || accounts.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {progress < 0.1  ? 'Cargando OCR...'
                     : progress < 0.9 ? 'Leyendo imagen...'
                                      : 'Identificando movimientos...'}
                  </>
                ) : (
                  'Analizar imagen →'
                )}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => { setStep('upload'); setError(null) }}
                className="btn-secondary flex items-center gap-2"
                style={{ padding: '10px 18px' }}
              >
                <ArrowLeft size={13} /> Volver
              </button>
              <button
                type="button"
                onClick={saveSelected}
                disabled={loading || selectedRows.length === 0}
                className="btn-primary flex items-center gap-2"
                style={{
                  padding:    '11px 20px',
                  opacity:    (loading || selectedRows.length === 0) ? 0.5 : 1,
                  cursor:     (loading || selectedRows.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar seleccionados →'
                )}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={() => {
                onClose()
                router.refresh()
              }}
              className="btn-primary"
              style={{ padding: '11px 24px' }}
            >
              Ver transacciones →
            </button>
          )}
        </div>
      </div>

      {/* Scoped animation styles */}
      <style>{`
        @keyframes screenshotFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes screenshotZoomIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985) }
          to   { opacity: 1; transform: translateY(0)   scale(1)     }
        }
        .screenshot-check {
          animation: screenshotCheckPop 460ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes screenshotCheckPop {
          0%   { transform: scale(0.4); opacity: 0 }
          60%  { transform: scale(1.08); opacity: 1 }
          100% { transform: scale(1);    opacity: 1 }
        }
        .screenshot-row:hover { background: rgba(255,255,255,0.03) }
        @media (max-width: 640px) {
          .screenshot-modal-card {
            max-width: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            height: 100vh;
          }
        }
      `}</style>
    </div>
  )
}

// ── Reusable styles ─────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding:       '10px 8px',
  textAlign:     'left',
  color:         '#6b7280',
  fontSize:      '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight:    600,
}
