'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { CDTData } from '@/lib/parseCDTClient'

type CDTPreview = CDTData & { include: boolean }

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ImportarCDTPage() {
  const router     = useRouter()
  const inputRef   = useRef<HTMLInputElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const currentFile = useRef<File | null>(null)

  const [dragging,          setDragging]          = useState(false)
  const [fileName,          setFileName]          = useState('')
  const [parsing,           setParsing]           = useState(false)
  const [importing,         setImporting]         = useState(false)
  const [done,              setDone]              = useState(false)
  const [error,             setError]             = useState('')
  const [cdts,              setCdts]              = useState<CDTPreview[]>([])
  const [notACDT,           setNotACDT]           = useState(false)
  const [pdfPassword,       setPdfPassword]       = useState('')
  const [passwordRequired,  setPasswordRequired]  = useState(false)
  const [passwordError,     setPasswordError]     = useState('')

  const processPDF = useCallback(async (file: File, passwordOverride?: string) => {
    currentFile.current = file
    setParsing(true)
    setError('')
    setPasswordError('')
    setNotACDT(false)

    try {
      const { parseCDTPDF } = await import('@/lib/parseCDTClient')
      const pwd    = passwordOverride ?? pdfPassword
      const result = await parseCDTPDF(file, pwd || undefined)

      setPasswordRequired(false)
      setPdfPassword('')

      if (result.length === 0) { setNotACDT(true); return }

      setCdts(result.map(c => ({ ...c, include: true })))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'PASSWORD_REQUIRED') { setPasswordRequired(true); return }
      if (msg === 'WRONG_PASSWORD')    { setPasswordRequired(true); setPasswordError('Contraseña incorrecta. Intenta con tu número de cédula sin puntos.'); return }
      if (msg === 'PDF_SCANNED_OR_EMPTY') { setError('El PDF parece estar escaneado o vacío.'); return }
      setError('No se pudo procesar el PDF. Intenta de nuevo.')
    } finally {
      setParsing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPassword])

  const processFile = useCallback((file: File) => {
    setFileName(file.name)
    setError('')
    setDone(false)
    setCdts([])
    setNotACDT(false)
    setPasswordRequired(false)
    setPdfPassword('')
    setPasswordError('')

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB.')
      return
    }
    processPDF(file)
  }, [processPDF])

  const selectedCount = cdts.filter(c => c.include).length

  async function importar() {
    const selected = cdts.filter(c => c.include)
    if (!selected.length) return
    setImporting(true)
    setError('')

    try {
      const payload = selected.map(({ include: _i, ...c }) => c)
      const res = await fetch('/api/cdts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      setDone(true)
      setTimeout(() => router.push('/inversiones?tab=renta-fija'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la importación.')
    } finally {
      setImporting(false)
    }
  }

  /* ── Shared input style ──────────────────────────────────────────────────── */
  const baseCard: React.CSSProperties = { backgroundColor: '#1a1f2e', border: '1px solid #2a3040', borderRadius: '16px' }

  return (
    <div style={{ color: '#e5e7eb', maxWidth: '960px' }}>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/inversiones?tab=renta-fija"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Importar CDTs</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>
            Sube tu constancia de inversión Bancolombia / hapi
          </p>
        </div>
      </div>

      {/* Legal notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
        style={{ backgroundColor: '#0c1a0c', border: '1px solid #10b98130' }}>
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🔒</span>
        <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.7 }}>
          Solo se extraen datos financieros básicos (capital, tasa, fechas).
          El PDF se procesa en tu navegador y nunca se transmite al servidor.
          Cumplimos con la <strong style={{ color: '#9ca3af' }}>Ley 1581 de 2012</strong>.
        </p>
      </div>

      {/* Drop zone */}
      {!cdts.length && !done && !parsing && !passwordRequired && !notACDT && (
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
          style={{
            minHeight: '240px', padding: '48px',
            backgroundColor: dragging ? '#f59e0b10' : '#1a1f2e',
            border: `2px dashed ${dragging ? '#f59e0b' : '#2a3040'}`,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
          />
          <Upload size={36} style={{ color: dragging ? '#f59e0b' : '#4b5563', marginBottom: '16px' }} />
          <p className="text-white font-semibold text-lg mb-2">
            {dragging ? 'Suelta la constancia aquí' : 'Arrastra tu constancia aquí'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
            o haz clic para seleccionar un archivo
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            {['Constancia Bancolombia', 'hapi PDF'].map(b => (
              <span key={b} className="px-3 py-1 rounded-full text-xs"
                style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#6b7280' }}>
                {b}
              </span>
            ))}
          </div>
          <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '12px' }}>PDF · Máx 10 MB</p>
          <p className="mt-2 text-xs" style={{ color: 'rgba(229,231,235,0.3)' }}>
            🔒 Si tiene contraseña, la pediremos en el siguiente paso
          </p>
        </div>
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div className="rounded-2xl flex flex-col items-center justify-center"
          style={{ minHeight: '200px', ...baseCard }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#f59e0b', marginBottom: '16px' }} />
          <p className="text-white font-semibold mb-1">Procesando constancia PDF…</p>
          <p style={{ color: '#6b7280', fontSize: '12px' }}>Extrayendo datos en tu navegador</p>
        </div>
      )}

      {/* Not a CDT constancia */}
      {notACDT && (
        <div className="rounded-2xl p-8 text-center" style={baseCard}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>📄</p>
          <p className="text-white font-semibold mb-2">Este PDF no parece una constancia de inversión</p>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '20px' }}>
            Si quieres registrar CDTs desde tu extracto bancario, ve a{' '}
            <Link href="/transacciones/importar" style={{ color: '#6366f1' }}>
              Transacciones → Importar
            </Link>
            .
          </p>
          <button
            onClick={() => { setNotACDT(false); setFileName('') }}
            className="px-4 py-2 rounded-xl text-sm hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#9ca3af' }}>
            Subir otro PDF
          </button>
        </div>
      )}

      {/* Password panel */}
      {passwordRequired && !parsing && !cdts.length && (
        <div className="relative overflow-hidden rounded-2xl"
          style={{ border: '1px solid rgba(99,102,241,0.25)', backgroundColor: '#1a1f2e' }}>
          <div className="breathe-purple absolute inset-0 rounded-2xl pointer-events-none" />
          <div className="relative space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔒</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>PDF protegido</p>
                <p className="text-xs" style={{ color: 'rgba(229,231,235,0.5)' }}>
                  Bancolombia protege sus constancias con tu número de cédula
                </p>
              </div>
            </div>
            <input
              type="password"
              value={pdfPassword}
              onChange={e => { setPdfPassword(e.target.value); setPasswordError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && pdfPassword && currentFile.current) processPDF(currentFile.current, pdfPassword) }}
              placeholder="Número de cédula (sin puntos)"
              autoComplete="off"
              className="w-full rounded-xl text-sm focus:outline-none"
              style={{
                backgroundColor: '#0f1117',
                border: `1px solid ${passwordError ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.25)'}`,
                color: '#e5e7eb', padding: '10px 14px',
              }}
            />
            {passwordError && <p className="text-xs" style={{ color: '#ef4444' }}>{passwordError}</p>}
            <p className="text-xs" style={{ color: 'rgba(229,231,235,0.3)' }}>
              🛡️ La contraseña se usa solo para leer el PDF y nunca se guarda
            </p>
            <button
              onClick={() => currentFile.current && processPDF(currentFile.current, pdfPassword)}
              disabled={!pdfPassword || parsing}
              className="w-full rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#6366f1', color: '#fff', padding: '10px', opacity: (!pdfPassword || parsing) ? 0.4 : 1 }}>
              {parsing ? 'Procesando...' : 'Desencriptar y procesar'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: '#2d1515', border: '1px solid #ef444440' }}>
          <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="rounded-2xl p-12 text-center" style={{ ...baseCard, borderColor: '#10b98140' }}>
          <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
          <p className="text-white font-bold text-xl mb-2">¡CDTs importados!</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Redirigiendo a Inversiones…</p>
        </div>
      )}

      {/* Preview table */}
      {cdts.length > 0 && !done && (
        <>
          {/* File info bar */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={baseCard}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '20px' }}>📄</span>
              <div>
                <p className="text-white text-sm font-medium">{fileName}</p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  {cdts.length} CDT{cdts.length !== 1 ? 's' : ''} detectado{cdts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setCdts([]); setFileName('') }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              style={{ color: '#6b7280' }}>
              <X size={14} />
            </button>
          </div>

          {/* Preview table */}
          <div className="rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid #2a3040' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '760px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f1117', borderBottom: '1px solid #2a3040' }}>
                    {[
                      { label: '✓',           align: 'center' },
                      { label: 'Banco',        align: 'left'   },
                      { label: 'N° Inversión', align: 'left'   },
                      { label: 'Capital',      align: 'right'  },
                      { label: 'Tasa EA',      align: 'right'  },
                      { label: 'Plazo',        align: 'right'  },
                      { label: 'Apertura',     align: 'left'   },
                      { label: 'Vencimiento',  align: 'left'   },
                      { label: 'Intereses',    align: 'right'  },
                      { label: 'Estado',       align: 'left'   },
                    ].map(h => (
                      <th key={h.label} style={{
                        padding: '8px 14px', fontWeight: 500, fontSize: '10px',
                        color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                        textAlign: h.align as React.CSSProperties['textAlign'],
                      }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cdts.map((cdt, i) => (
                    <tr
                      key={i}
                      onClick={() => setCdts(prev => prev.map((c, idx) => idx === i ? { ...c, include: !c.include } : c))}
                      className="cursor-pointer hover:bg-white/[0.02]"
                      style={{
                        borderBottom: i < cdts.length - 1 ? '1px solid #1e2535' : 'none',
                        opacity: cdt.include ? 1 : 0.4,
                      }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div className="w-4 h-4 rounded flex items-center justify-center mx-auto"
                          style={{
                            backgroundColor: cdt.include ? '#f59e0b' : '#2a3040',
                            border: `1px solid ${cdt.include ? '#f59e0b' : '#2a3040'}`,
                          }}>
                          {cdt.include && <span style={{ color: '#0f1117', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#e5e7eb' }}>{cdt.bank}</td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontFamily: 'monospace', fontSize: '11px' }}>
                        {cdt.investment_id ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#e5e7eb', fontWeight: 600 }} className="tabular-nums">
                        {fmtCOP(cdt.capital)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10b981' }} className="tabular-nums">
                        {cdt.interest_rate != null ? `${cdt.interest_rate}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#9ca3af' }}>
                        {cdt.term_days != null ? `${cdt.term_days}d` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{fmtDate(cdt.start_date)}</td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{fmtDate(cdt.end_date)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#f59e0b' }} className="tabular-nums">
                        {cdt.interest_earned > 0 ? fmtCOP(cdt.interest_earned) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: cdt.status === 'active' ? '#10b98120' : '#6366f120',
                            color:           cdt.status === 'active' ? '#10b981'   : '#6366f1',
                          }}>
                          {cdt.status === 'active' ? 'Activo' : cdt.status === 'matured' ? 'Vencido' : 'Cancelado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import button */}
          <button
            onClick={importar}
            disabled={importing || selectedCount === 0}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
              color: '#0f1117',
              opacity: (importing || selectedCount === 0) ? 0.5 : 1,
            }}>
            {importing
              ? <><Loader2 size={16} className="animate-spin" /> Importando…</>
              : `Importar ${selectedCount} CDT${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
