'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, ArrowLeft, Check, AlertTriangle, ShieldCheck, TrendingUp, HelpCircle, Scissors } from 'lucide-react'
import { extractInvestmentsFromImage } from '@/lib/ocr/extract-investments'
import type { OcrAssetType, OcrCurrency, OcrPosition } from '@/lib/ocr/types'
import ImportTutorialModal from './help/ImportTutorialModal'
import ImageCropper from './ImageCropper'
import Select from '@/components/ui/Select'

interface ScreenshotImportInvestmentsModalProps {
  open:    boolean
  onClose: () => void
}

type Step = 'upload' | 'preview' | 'success'

interface EditableRow {
  id:         string
  ticker:     string
  name:       string
  shares:     string
  avg_cost:   string
  asset_type: OcrAssetType
  currency:   OcrCurrency
  selected:   boolean
}

const ASSET_TYPE_OPTS: OcrAssetType[] = ['stock', 'etf', 'crypto', 'fund']

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
const fmt = (n: number, c: OcrCurrency) => (c === 'USD' ? fmtUSD(n) : fmtCOP(n))

function uid() { return Math.random().toString(36).slice(2, 10) }

// Explicit dark-palette select styling. The default `.form-input` produced
// white-bg + light-gray text in some browsers because the native option
// list and select container inherit browser-default colors that override
// our card theme. Pure inline styles guarantee contrast.

function toRow(p: OcrPosition): EditableRow {
  return {
    id:         uid(),
    ticker:     p.ticker ?? '',
    name:       p.name ?? '',
    shares:     p.shares !== null ? String(p.shares) : '',
    avg_cost:   p.avg_cost !== null ? String(p.avg_cost) : '',
    asset_type: p.asset_type === 'unknown' ? 'stock' : p.asset_type,
    currency:   p.currency,
    selected:   true,
  }
}

export default function ScreenshotImportInvestmentsModal({ open, onClose }: ScreenshotImportInvestmentsModalProps) {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep]               = useState<Step>('upload')
  const [error, setError]             = useState<string | null>(null)
  const [file, setFile]               = useState<File | null>(null)
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [analyzing, setAnalyzing]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [saving, setSaving]           = useState(false)
  const [broker, setBroker]           = useState('')
  const [rows, setRows]               = useState<EditableRow[]>([])
  const [savedCount, setSavedCount]   = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [confidence, setConfidence]   = useState<'high' | 'medium' | 'low'>('high')

  // Tutorial state — DB-backed (per-user) with auto-open the first time
  // this user ever opens the investments import modal.
  const [tutorialOpen, setTutorialOpen] = useState(false)
  // Cropper state — opt-in flow before OCR.
  const [cropperOpen, setCropperOpen]   = useState(false)

  useEffect(() => {
    if (!open) return
    // Check seen status once per session-open of the parent modal.
    let cancelled = false
    fetch('/api/import-tutorial/status?type=investments')
      .then((r) => r.json())
      .then((data: { seen?: boolean }) => {
        if (cancelled) return
        if (!data.seen) {
          // Slight delay so the parent modal mount-animation completes first.
          setTimeout(() => { if (!cancelled) setTutorialOpen(true) }, 600)
        }
      })
      .catch(() => { /* network failure — don't pop unexpectedly */ })
    return () => { cancelled = true }
  }, [open])

  function closeTutorial() {
    setTutorialOpen(false)
    // Best-effort persistence — UI doesn't depend on the response.
    fetch('/api/import-tutorial/mark-seen', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'investments' }),
    }).catch(() => {})
  }

  // Reset on close
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setStep('upload'); setError(null)
      setFile(null); setPreviewUrl(null); setDragOver(false)
      setAnalyzing(false); setProgress(0)
      setSaving(false); setBroker(''); setRows([])
      setSavedCount(0); setFailedCount(0)
      setConfidence('high')
    }, 200)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Handlers
  const acceptFile = useCallback((f: File) => {
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
  }, [previewUrl])

  async function analyze() {
    if (!file) { setError('Selecciona una captura'); return }
    setAnalyzing(true); setProgress(0); setError(null)

    try {
      const result = await extractInvestmentsFromImage(file, (p) => setProgress(p))
      // Show ANY position the OCR extracted — even one without a ticker —
      // as long as it has at least one useful field. The user fills the gap
      // manually in the preview. We only show the red error banner when the
      // OCR yielded zero rows at all OR every row lacks every useful field.
      const usable = result.positions.filter(
        (p) => (p.shares ?? 0) > 0 || (p.avg_cost ?? 0) > 0 || (p.market_value ?? 0) > 0 || (p.ticker ?? '').length > 0,
      )
      if (usable.length === 0) {
        setError('No se detectaron posiciones. Intenta con una imagen más clara.')
        return
      }
      setBroker(result.broker)
      setConfidence(result.confidence)
      setRows(usable.map(toRow))
      setStep('preview')
    } catch {
      setError('No se pudieron leer las posiciones. Intenta con una imagen más clara.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updateRow(id: string, patch: Partial<EditableRow>) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  async function saveSelected() {
    const selected = rows.filter((r) =>
      r.selected
      && r.ticker.trim().length > 0
      && Number(r.shares)   > 0
      && Number(r.avg_cost) > 0,
    )
    if (selected.length === 0) {
      setError('Selecciona al menos una posición válida')
      return
    }
    setSaving(true); setError(null)

    try {
      const res = await fetch('/api/save-investments-bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: selected.map((r) => ({
            name:       r.name || r.ticker,
            ticker:     r.ticker.toUpperCase().trim(),
            asset_type: r.asset_type,
            shares:     Number(r.shares),
            avg_cost:   Number(r.avg_cost),
            currency:   r.currency,
            broker:     broker || undefined,
            fee_usd:    0,
          })),
        }),
      })
      const data = await res.json() as { saved?: number; failed?: number; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'No se pudieron guardar las posiciones')
        return
      }
      setSavedCount(data.saved ?? 0)
      setFailedCount(data.failed ?? 0)
      setStep('success')
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length
  // Count selected rows whose ticker is still empty — drives the soft warning
  // banner above the preview AND gates the save button so the user can't
  // submit positions without an identifier.
  const missingTickers = rows.filter((r) => r.selected && r.ticker.trim().length === 0).length
  const allTickersFilled = missingTickers === 0

  if (!open) return null
  // SSR guard: createPortal needs document. The button uses dynamic({ssr: false})
  // so we're on the client by the time this runs, but the explicit check makes
  // the intent obvious to readers and survives any future direct import.
  if (typeof document === 'undefined') return null

  // Portal into <body> so this modal escapes any ancestor that establishes a
  // containing block via `transform` / `filter` / `perspective`. The
  // /inversiones header uses .page-enter (animates transform: translateY) which
  // would otherwise trap this `position: fixed` overlay inside the header card.
  return (
    <>
    {/* Tutorial self-portals into body, so it doesn't need to be inside our portal */}
    <ImportTutorialModal open={tutorialOpen} onClose={closeTutorial} type="investments" />
    {cropperOpen && previewUrl && (
      <ImageCropper
        imageUrl={previewUrl}
        fileName={file?.name}
        onCancel={() => setCropperOpen(false)}
        onCrop={(cropped) => {
          // Replace the uploaded file + preview with the cropped one.
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          setFile(cropped)
          setPreviewUrl(URL.createObjectURL(cropped))
          setCropperOpen(false)
        }}
      />
    )}
    {createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background:    'rgba(0,0,0,0.62)',
        backdropFilter:'blur(8px)',
        animation:     'invModalFadeIn 180ms cubic-bezier(0.16,1,0.3,1) both',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full overflow-hidden inv-modal-card"
        style={{
          maxWidth:     '760px',
          maxHeight:    '92vh',
          background:   '#1a1f2e',
          border:       '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow:    '0 32px 80px rgba(0,0,0,0.5)',
          display:      'flex',
          flexDirection:'column',
          animation:    'invModalZoomIn 240ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Help — reopens the tutorial regardless of seen-state */}
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          aria-label="Tutorial"
          style={{
            position:     'absolute',
            top:          '14px',
            right:        '54px',
            width:        '32px',
            height:       '32px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color:        '#9ca3af',
            cursor:       'pointer',
            zIndex:       2,
          }}
        >
          <HelpCircle size={15} />
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position:     'absolute',
            top:          '14px',
            right:        '14px',
            width:        '32px',
            height:       '32px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color:        '#9ca3af',
            cursor:       'pointer',
            zIndex:       2,
          }}
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {step === 'upload' ? 'Importar desde captura'
             : step === 'preview' ? 'Revisar posiciones'
             : 'Importación completa'}
          </p>
          <h2 style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {step === 'upload'  ? 'Sube una captura de tu broker'
             : step === 'preview' ? `Posiciones detectadas · ${broker}`
             : '¡Listo!'}
          </h2>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

          {/* STEP 1 */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files?.[0]; if (f) acceptFile(f)
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
              >
                {previewUrl ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      style={{ width: '88px', height: '88px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file?.name}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>
                        {((file?.size ?? 0) / 1024).toFixed(0)} KB
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (previewUrl) URL.revokeObjectURL(previewUrl)
                          setFile(null); setPreviewUrl(null)
                        }}
                        style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '4px' }}
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
                      Arrastra una captura de tu broker
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

              <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', lineHeight: 1.55 }}>
                Soporta capturas de Hapi, Toro, Trii, Robinhood, Binance, Coinbase u otros brokers.
              </p>

              {analyzing && (
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#e5e7eb', fontSize: '12px', fontWeight: 600 }}>
                      {progress < 0.1  ? 'Cargando OCR...'
                       : progress < 0.95 ? 'Leyendo captura...'
                                         : 'Identificando posiciones...'}
                    </span>
                    <span style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.max(2, progress * 100)}%`,
                      background: 'linear-gradient(90deg, #a78bfa, #6366f1)',
                      borderRadius: '999px', transition: 'width 240ms cubic-bezier(0.16,1,0.3,1)',
                    }} />
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
                <div className="rounded-xl flex items-center gap-2 text-sm" style={{ padding: '11px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  <span>⚠</span> {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 'preview' && (
            <div className="space-y-4">
              {missingTickers > 0 && (
                <div
                  style={{
                    padding:      '12px 14px',
                    borderRadius: '12px',
                    background:   'rgba(245,158,11,0.10)',
                    border:       '1px solid rgba(245,158,11,0.32)',
                    display:      'flex',
                    alignItems:   'flex-start',
                    gap:          '10px',
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                      No se detectó el ticker en {missingTickers} posición{missingTickers === 1 ? '' : 'es'}
                    </p>
                    <p style={{ color: '#fde68a', fontSize: '12px', lineHeight: 1.5 }}>
                      Complétalo manualmente antes de guardar. Sin ticker no se puede registrar la posición.
                    </p>
                  </div>
                </div>
              )}
              {confidence !== 'high' && (
                <div
                  style={{
                    padding:      '12px 14px',
                    borderRadius: '12px',
                    background:   'rgba(245,158,11,0.08)',
                    border:       '1px solid rgba(245,158,11,0.32)',
                    display:      'flex',
                    alignItems:   'flex-start',
                    gap:          '10px',
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                      Los datos extraídos tienen inconsistencias
                    </p>
                    <p style={{ color: '#fde68a', fontSize: '12px', lineHeight: 1.5 }}>
                      Verifica los números antes de guardar — las matemáticas no cuadran.
                    </p>
                  </div>
                </div>
              )}
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding:      '14px',
                    borderRadius: '12px',
                    background:   r.selected ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)',
                    border:       '1px solid rgba(255,255,255,0.06)',
                    opacity:      r.selected ? 1 : 0.45,
                    transition:   'opacity 150ms, background 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={(e) => updateRow(r.id, { selected: e.target.checked })}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#a78bfa' }}
                    />
                    <input
                      type="text"
                      value={r.ticker}
                      onChange={(e) => updateRow(r.id, { ticker: e.target.value.toUpperCase() })}
                      placeholder="ej: AAPL"
                      className="form-input"
                      style={{
                        width: '110px', padding: '6px 10px', fontSize: '13px',
                        fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
                        // Highlight missing tickers with an amber outline so the user
                        // knows exactly which rows still need attention.
                        borderColor: r.ticker.trim().length === 0 ? 'rgba(245,158,11,0.45)' : undefined,
                        boxShadow:   r.ticker.trim().length === 0 ? '0 0 0 1px rgba(245,158,11,0.30) inset' : undefined,
                      }}
                    />
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => updateRow(r.id, { name: e.target.value })}
                      placeholder="Nombre del activo"
                      className="form-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: '13px', minWidth: 0 }}
                    />
                  </div>

                  <div className="inv-prev-grid">
                    <div>
                      <p className="form-label">Cantidad</p>
                      <input
                        type="number"
                        step="any"
                        value={r.shares}
                        onChange={(e) => updateRow(r.id, { shares: e.target.value })}
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>
                    <div>
                      <p className="form-label">Costo promedio</p>
                      <input
                        type="number"
                        step="any"
                        value={r.avg_cost}
                        onChange={(e) => updateRow(r.id, { avg_cost: e.target.value })}
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>
                    <div>
                      <p className="form-label">Tipo</p>
                      <Select
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={r.asset_type}
                        onChange={(v) => updateRow(r.id, { asset_type: v as OcrAssetType })}
                        options={ASSET_TYPE_OPTS.map((t) => ({ value: t, label: t }))}
                      />
                    </div>
                    <div>
                      <p className="form-label">Moneda</p>
                      <Select
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                        value={r.currency}
                        onChange={(v) => updateRow(r.id, { currency: v as OcrCurrency })}
                        options={[
                          { value: 'USD', label: 'USD' },
                          { value: 'COP', label: 'COP' },
                        ]}
                      />
                    </div>
                  </div>

                  {Number(r.shares) > 0 && Number(r.avg_cost) > 0 && (
                    <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
                      Invertido: <strong style={{ color: '#e5e7eb' }}>{fmt(Number(r.shares) * Number(r.avg_cost), r.currency)}</strong>
                    </p>
                  )}
                </div>
              ))}

              <div style={{
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(167,139,250,0.06)',
                border: '1px solid rgba(167,139,250,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '10px',
              }}>
                <span style={{ color: '#e5e7eb', fontSize: '13px' }}>
                  <strong>{selectedCount}</strong> posición{selectedCount === 1 ? '' : 'es'} seleccionada{selectedCount === 1 ? '' : 's'}
                </span>
              </div>

              {error && (
                <div className="rounded-xl flex items-center gap-2 text-sm" style={{ padding: '11px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  <span>⚠</span> {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0 12px' }}>
              <div className="inv-check" style={{
                width: '76px', height: '76px',
                margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.10)',
                border: '1.5px solid rgba(16,185,129,0.30)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={36} strokeWidth={3} style={{ color: '#10b981' }} />
              </div>
              <p style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.01em' }}>
                ¡{savedCount} posici{savedCount === 1 ? 'ón agregada' : 'ones agregadas'}!
              </p>
              {failedCount > 0 && (
                <p style={{ color: '#f59e0b', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
                  <AlertTriangle size={13} /> {failedCount} no pudieron guardarse
                </p>
              )}
              <p style={{ color: '#9ca3af', fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
                Las nuevas posiciones aparecen ya en tu portafolio.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.18)',
          display: 'flex', gap: '10px',
          justifyContent: step === 'success' ? 'center' : 'space-between',
          alignItems: 'center',
        }}>
          {step === 'upload' && (
            <>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '10px 18px' }}>
                Cancelar
              </button>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCropperOpen(true)}
                  disabled={analyzing || !file || !previewUrl}
                  className="btn-secondary inline-flex items-center gap-2"
                  style={{
                    padding: '10px 16px',
                    opacity: (analyzing || !file) ? 0.5 : 1,
                    cursor:  (analyzing || !file) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Scissors size={13} /> Recortar primero
                </button>
                <button
                  type="button"
                  onClick={analyze}
                  disabled={analyzing || !file}
                  className="btn-primary flex items-center gap-2"
                  style={{
                    padding: '11px 20px',
                    opacity: (analyzing || !file) ? 0.5 : 1,
                    cursor:  (analyzing || !file) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {analyzing
                    ? (<><Loader2 size={14} className="animate-spin" /> Analizando…</>)
                    : (<>Analizar imagen completa →</>)}
                </button>
              </div>
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
                disabled={saving || selectedCount === 0 || !allTickersFilled}
                title={!allTickersFilled ? 'Completa el ticker de cada posición antes de guardar' : undefined}
                className="btn-primary flex items-center gap-2"
                style={{
                  padding: '11px 20px',
                  opacity: (saving || selectedCount === 0 || !allTickersFilled) ? 0.5 : 1,
                  cursor:  (saving || selectedCount === 0 || !allTickersFilled) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving
                  ? (<><Loader2 size={14} className="animate-spin" /> Guardando…</>)
                  : (<><TrendingUp size={13} /> Guardar {selectedCount} {selectedCount === 1 ? 'posición' : 'posiciones'}</>)}
              </button>
            </>
          )}

          {step === 'success' && (
            <button
              type="button"
              onClick={() => { onClose(); router.refresh() }}
              className="btn-primary"
              style={{ padding: '11px 24px' }}
            >
              Ver inversiones →
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes invModalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes invModalZoomIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985) }
          to   { opacity: 1; transform: translateY(0)   scale(1)     }
        }
        .inv-check {
          animation: invCheckPop 460ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes invCheckPop {
          0%   { transform: scale(0.4); opacity: 0 }
          60%  { transform: scale(1.08); opacity: 1 }
          100% { transform: scale(1);    opacity: 1 }
        }
        .inv-prev-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        @media (max-width: 640px) {
          .inv-modal-card {
            max-width: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
            height: 100vh;
          }
          .inv-prev-grid { grid-template-columns: 1fr 1fr }
        }
      `}</style>
    </div>,
    document.body,
    )}
    </>
  )
}
