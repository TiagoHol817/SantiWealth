'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { detectRecurringCosts, type RecurringSuggestion } from '@/lib/detectRecurring'
import type { PDFTransaction } from '@/lib/parsePDF'

/* ── Types ──────────────────────────────────────────────────────────── */
type TxType = 'income' | 'expense'

type ParsedRow = {
  date:        string
  description: string
  amount:      number
  type:        TxType
  category:    string
  include:     boolean
}

type BankFormat = 'bancolombia' | 'davivienda' | 'nequi' | 'nu' | 'generic'
type SourceKind  = 'csv' | 'pdf' | null

/* ── CSV helpers (unchanged) ────────────────────────────────────────── */
function parseCSV(text: string): string[][] {
  const lines = text.split('\n').filter(l => l.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if ((line[i] === ',' || line[i] === ';') && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += line[i]
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''))
    return result
  })
}

function detectBank(headers: string[]): BankFormat {
  const h = headers.map(x => x.toLowerCase().trim())
  if (h.includes('date') && h.includes('title') && h.includes('amount')) return 'nu'
  if (h.includes('concepto')) return 'nequi'
  if (h.some(x => x.includes('fecha transacci'))) return 'davivienda'
  if (h.includes('fecha') && (h.includes('descripción') || h.includes('descripcion'))) return 'bancolombia'
  return 'generic'
}

function parseAmount(val: string): number {
  if (!val) return 0
  const clean = val.replace(/[^0-9.,\-]/g, '').replace(/\./g, '').replace(',', '.')
  return Math.abs(parseFloat(clean) || 0)
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0]
  const parts = val.split(/[\/\-\s]/)
  if (parts.length >= 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`
    return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
  }
  return new Date().toISOString().split('T')[0]
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Alimentación':            ['supermercado','mercado','restaurante','comida','café','coffee','rappi','ifood','uber eats','domicilio','almuerzo','desayuno','cena'],
  'Transporte':              ['uber','taxi','transporte','gasolina','peaje','parqueadero','sitp','metro','combustible','bus'],
  'Servicios/Suscripciones': ['netflix','spotify','amazon','apple','google','suscripción','internet','celular','claro','movistar','tigo','disney','youtube'],
  'Vivienda':                ['arriendo','administración','agua','luz','electricidad','gas domiciliario'],
  'Salud':                   ['farmacia','droguería','médico','doctor','clinica','hospital','laboratorio','óptica'],
  'Entretenimiento':         ['cine','bar','fiesta','gym','deporte','juego','concierto'],
  'Ropa y personal':         ['nike','adidas','zara','h&m','ropa','calzado','zapatos','peluquería','barbería'],
  'Educación':               ['universidad','curso','libro','librería','estudio'],
}

function guessCategory(description: string): string {
  const d = description.toLowerCase()
  for (const [cat, kws] of Object.entries(CATEGORY_MAP)) {
    if (kws.some(k => d.includes(k))) return cat
  }
  return 'Otro'
}

function parseRows(raw: string[][], bank: BankFormat): ParsedRow[] {
  if (raw.length < 2) return []
  const headers = raw[0].map(h => h.toLowerCase().trim())
  const rows    = raw.slice(1)

  let dateIdx = -1, descIdx = -1, amtIdx = -1

  if (bank === 'nu') {
    dateIdx = headers.indexOf('date')
    descIdx = headers.indexOf('title')
    amtIdx  = headers.indexOf('amount')
  } else if (bank === 'nequi') {
    dateIdx = headers.findIndex(h => h.includes('fecha'))
    descIdx = headers.findIndex(h => h.includes('concepto'))
    amtIdx  = headers.findIndex(h => h.includes('valor'))
  } else if (bank === 'davivienda') {
    dateIdx = headers.findIndex(h => h.includes('fecha'))
    descIdx = headers.findIndex(h => h.includes('descripci'))
    amtIdx  = headers.findIndex(h => h.includes('monto') || h.includes('valor'))
  } else {
    dateIdx = headers.findIndex(h => h.includes('fecha'))
    descIdx = headers.findIndex(h => h.includes('descripci'))
    amtIdx  = headers.findIndex(h => h.includes('valor') || h.includes('monto') || h.includes('amount'))
  }

  if (dateIdx === -1) dateIdx = 0
  if (descIdx === -1) descIdx = 1
  if (amtIdx  === -1) amtIdx  = 2

  return rows
    .filter(r => r.length > Math.max(dateIdx, descIdx, amtIdx))
    .map(r => {
      const description = r[descIdx] ?? ''
      const amount      = parseAmount(r[amtIdx] ?? '')
      return {
        date:        parseDate(r[dateIdx] ?? ''),
        description,
        amount,
        type:        'expense' as TxType,
        category:    guessCategory(description),
        include:     amount > 0,
      }
    })
    .filter(r => r.amount > 0)
}

const BANK_LABELS: Record<BankFormat, string> = {
  bancolombia: '🏦 Bancolombia',
  davivienda:  '🔴 Davivienda',
  nequi:       '🟣 Nequi',
  nu:          '🟣 Nu',
  generic:     '📄 Formato genérico',
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

/* ── Recurring modal ─────────────────────────────────────────────────── */
function RecurringModal({
  suggestions,
  onDone,
}: {
  suggestions: RecurringSuggestion[]
  onDone: () => void
}) {
  const supabase = createClient()
  const [added,   setAdded]   = useState<Set<string>>(new Set())
  const [ignored, setIgnored] = useState<Set<string>>(new Set())
  const [saving,  setSaving]  = useState<string | null>(null)

  const visible = suggestions.filter(s => !ignored.has(s.normalizedKey))

  async function handleAdd(s: RecurringSuggestion) {
    setSaving(s.normalizedKey)
    try {
      await supabase.from('operational_costs').insert({
        name:      s.description.slice(0, 80),
        cost_type: 'subscription',
        amount:    s.amount,
        currency:  'COP',
        frequency: 'monthly',
        category:  s.category,
        vendor:    s.description.slice(0, 80),
        is_active: true,
      })
      setAdded(prev => new Set([...prev, s.normalizedKey]))
    } catch (e) {
      console.error('[recurring-add]', e)
    } finally {
      setSaving(null)
    }
  }

  function handleIgnore(key: string) {
    setIgnored(prev => new Set([...prev, key]))
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#1a1f2e', border: '1px solid #2a3040', borderRadius: '20px',
        maxWidth: '560px', width: '100%', maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #2a3040' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>
                💡 Costos recurrentes detectados
              </p>
              <p style={{ color: '#6b7280', fontSize: '13px' }}>
                Encontramos {suggestions.length} posibles costos fijos en tu extracto.
                ¿Quieres agregarlos a tu módulo de Costos fijos?
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', padding: '16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0', fontSize: '14px' }}>
              ¡Listo! Ya procesaste todas las sugerencias.
            </p>
          )}
          {visible.map(s => {
            const isAdded   = added.has(s.normalizedKey)
            const isSaving  = saving === s.normalizedKey
            return (
              <div key={s.normalizedKey} style={{
                backgroundColor: '#0f1117', border: `1px solid ${isAdded ? '#10b98130' : '#1e2535'}`,
                borderRadius: '12px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                opacity: isAdded ? 0.7 : 1,
              }}>
                {/* Icon */}
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  backgroundColor: '#6366f120', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
                }}>
                  {s.category === 'Entretenimiento' ? '🎬' :
                   s.category === 'Internet/Celular' ? '📶' :
                   s.category === 'Arriendo'         ? '🏠' :
                   s.category === 'Servicios públicos' ? '⚡' : '🔄'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.description}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                    {s.category} · {s.occurrences}× detectado · {Math.round(s.confidence * 100)}% confianza
                  </p>
                </div>

                {/* Amount */}
                <p className="tabular-nums" style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {fmtCOP(s.amount)}/mes
                </p>

                {/* Actions */}
                {isAdded ? (
                  <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>✓ Agregado</span>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleAdd(s)}
                      disabled={!!saving}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none',
                        backgroundColor: '#6366f1', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {isSaving ? '...' : 'Agregar'}
                    </button>
                    <button
                      onClick={() => handleIgnore(s.normalizedKey)}
                      style={{
                        padding: '6px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #2a3040',
                        backgroundColor: 'transparent', color: '#6b7280', cursor: 'pointer',
                      }}
                    >
                      Ignorar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #2a3040' }}>
          <button
            onClick={onDone}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
              background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
              color: '#0f1117', border: 'none', cursor: 'pointer',
            }}
          >
            {added.size > 0 ? `Listo · ${added.size} costo${added.size !== 1 ? 's' : ''} agregado${added.size !== 1 ? 's' : ''}` : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function ImportarPage() {
  const router   = useRouter()
  const dropRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging,   setDragging]   = useState(false)
  const [fileName,   setFileName]   = useState('')
  const [bank,       setBank]       = useState<BankFormat | null>(null)
  const [rows,       setRows]       = useState<ParsedRow[]>([])
  const [importing,  setImporting]  = useState(false)
  const [parsing,    setParsing]    = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')
  const [sourceKind, setSourceKind] = useState<SourceKind>(null)
  const [accountLastFour, setAccountLastFour] = useState<string | null>(null)
  const [showRecurring,   setShowRecurring]   = useState(false)
  const [recurringSugg,   setRecurringSugg]   = useState<RecurringSuggestion[]>([])

  /* ── process PDF via server ─────────────────────────────────────────── */
  const processPDF = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB.')
      return
    }
    setParsing(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('consent', 'true')   // consent text is visibly shown to user above dropzone
      const res  = await fetch('/api/parse-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)

      const txs: PDFTransaction[] = data.transactions ?? []
      if (txs.length === 0) {
        setError('No se encontraron transacciones en este PDF. Asegúrate de que sea un extracto digital (no escaneado).')
        return
      }

      setBank('bancolombia')
      setSourceKind('pdf')
      setAccountLastFour(data.accountLastFour ?? null)
      setRows(txs.map(t => ({
        date:        t.date,
        description: t.description,
        amount:      t.amount,
        type:        t.type,
        category:    guessCategory(t.description),
        include:     true,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el PDF.')
    } finally {
      setParsing(false)
    }
  }, [])

  /* ── process CSV client-side ────────────────────────────────────────── */
  const processCSV = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text     = e.target?.result as string
        const raw      = parseCSV(text)
        if (raw.length < 2) { setError('El archivo está vacío o no tiene el formato esperado.'); return }
        const detected = detectBank(raw[0])
        setBank(detected)
        setSourceKind('csv')
        setRows(parseRows(raw, detected))
      } catch {
        setError('No se pudo procesar el archivo. Verifica que sea un CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  /* ── unified file handler ───────────────────────────────────────────── */
  const processFile = useCallback((file: File) => {
    if (!file) return
    setFileName(file.name)
    setError('')
    setDone(false)
    setRows([])
    setSourceKind(null)
    setAccountLastFour(null)

    if (file.name.toLowerCase().endsWith('.pdf')) {
      processPDF(file)
    } else {
      processCSV(file)
    }
  }, [processPDF, processCSV])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const toggleRow  = (i: number) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, include: !r.include } : r))

  const toggleType = (i: number) =>
    setRows(prev => prev.map((r, idx) =>
      idx === i ? { ...r, type: r.type === 'income' ? 'expense' : 'income' } : r
    ))

  const selectedRows = rows.filter(r => r.include)

  /* ── import ─────────────────────────────────────────────────────────── */
  async function importar() {
    if (!selectedRows.length) return
    setImporting(true)
    setProgress(0)
    setError('')

    try {
      const ticker = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 5 : prev))
      }, 120)

      const res = await fetch('/api/import-transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          consent:            true,
          source:             sourceKind === 'pdf' ? 'import_pdf' : 'import_csv',
          account_last_four:  accountLastFour,
          institution:        bank === 'bancolombia' ? 'Bancolombia' :
                              bank === 'davivienda'  ? 'Davivienda'  :
                              bank === 'nequi'       ? 'Nequi'       :
                              bank === 'nu'          ? 'Nu'          : undefined,
          rows: selectedRows.map(r => ({
            type:        r.type,
            amount:      r.amount,
            category:    r.category,
            description: r.description,
            date:        r.date,
          })),
        }),
      })

      clearInterval(ticker)
      setProgress(100)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${res.status}`)
      }

      setImporting(false)
      setDone(true)

      // Mark statement as imported (dismisses dashboard banner)
      try { localStorage.setItem('statement_imported', 'true') } catch {}

      // Detect recurring costs from imported expense rows
      const expenseRows = selectedRows.filter(r => r.type === 'expense')
      if (expenseRows.length > 0) {
        const sugg = detectRecurringCosts(expenseRows.map(r => ({
          description: r.description,
          amount:      r.amount,
          date:        r.date,
        })))
        if (sugg.length > 0) {
          setRecurringSugg(sugg)
          setShowRecurring(true)
          return   // Don't auto-redirect yet; wait for modal
        }
      }

      setTimeout(() => router.push('/transacciones'), 2000)
    } catch (err: unknown) {
      setImporting(false)
      setProgress(0)
      setError(err instanceof Error ? err.message : 'No se pudo completar la importación. Inténtalo de nuevo.')
    }
  }

  /* ── input style helper ─────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '8px',
    color: '#e5e7eb', padding: '4px 8px', fontSize: '12px', outline: 'none', width: '100%',
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Recurring suggestions modal */}
      {showRecurring && (
        <RecurringModal
          suggestions={recurringSugg}
          onDone={() => {
            setShowRecurring(false)
            router.push('/transacciones')
          }}
        />
      )}

      <div style={{ color: '#e5e7eb', maxWidth: '900px' }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/transacciones"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#9ca3af' }}
          >
            <ArrowLeft size={14} /> Volver
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Importar transacciones</h1>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>
              Sube tu extracto bancario en formato PDF, CSV, OFX o QIF
            </p>
          </div>
        </div>

        {/* ── Consent / Legal notice ────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
          style={{ backgroundColor: '#0c1a0c', border: '1px solid #10b98130' }}>
          <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>🔒</span>
          <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.7 }}>
            Al subir este archivo confirmas que es tu propio extracto bancario y autorizas a{' '}
            <strong style={{ color: '#9ca3af' }}>WealthHost</strong> procesarlo exclusivamente para tu cuenta
            personal. Tus datos nunca se comparten ni se venden. Cumplimos con la{' '}
            <strong style={{ color: '#9ca3af' }}>Ley 1581 de 2012</strong> de Protección de Datos de Colombia.
          </p>
        </div>

        {/* ── Drop zone ────────────────────────────────────────────────── */}
        {!rows.length && !done && !parsing && (
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
            style={{
              minHeight: '260px', padding: '48px',
              backgroundColor: dragging ? '#10b98110' : '#1a1f2e',
              border: `2px dashed ${dragging ? '#10b981' : '#2a3040'}`,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.ofx,.qif,.txt,.pdf"
              className="hidden"
              onChange={handleFileInput}
            />
            <Upload size={36} style={{ color: dragging ? '#10b981' : '#4b5563', marginBottom: '16px' }} />
            <p className="text-white font-semibold text-lg mb-2">
              {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu extracto aquí'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
              o haz clic para seleccionar un archivo
            </p>
            <div className="flex gap-2 flex-wrap justify-center mb-4">
              {['Bancolombia PDF', 'Davivienda', 'Nequi', 'Nu', 'CSV Genérico'].map(b => (
                <span key={b} className="px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#6b7280' }}>
                  {b}
                </span>
              ))}
            </div>
            <p style={{ color: '#4b5563', fontSize: '11px' }}>PDF · CSV · OFX · QIF · Máx 10 MB</p>
          </div>
        )}

        {/* Parsing spinner */}
        {parsing && (
          <div className="rounded-2xl flex flex-col items-center justify-center"
            style={{ minHeight: '200px', backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1', marginBottom: '16px' }} />
            <p className="text-white font-semibold mb-1">Procesando extracto PDF…</p>
            <p style={{ color: '#6b7280', fontSize: '12px' }}>Extrayendo transacciones en memoria</p>
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
        {done && !showRecurring && (
          <div className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #10b98140' }}>
            <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
            <p className="text-white font-bold text-xl mb-2">¡Importación completada!</p>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>
              {selectedRows.length} transacciones importadas. Redirigiendo…
            </p>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && !done && (
          <>
            {/* File info */}
            <div className="flex items-center justify-between p-4 rounded-xl mb-4"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: sourceKind === 'pdf' ? '#6366f120' : '#10b98120' }}>
                  {sourceKind === 'pdf'
                    ? <span style={{ fontSize: '16px' }}>📄</span>
                    : <Upload size={16} style={{ color: '#10b981' }} />}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{fileName}</p>
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>
                    {bank ? BANK_LABELS[bank] : 'Formato detectado'}
                    {sourceKind === 'pdf' ? ' · PDF' : ' · CSV'}
                    {accountLastFour && ` · ****${accountLastFour}`}
                    {` · ${rows.length} transacciones encontradas`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setRows([]); setFileName(''); setBank(null); setSourceKind(null); setAccountLastFour(null) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                style={{ color: '#6b7280' }}>
                <X size={14} />
              </button>
            </div>

            {/* Account masked info */}
            {accountLastFour && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
                style={{ backgroundColor: '#1a1f2e', border: '1px solid #6366f130' }}>
                <span style={{ fontSize: '14px' }}>🏦</span>
                <p style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Bancolombia <strong style={{ color: '#6366f1' }}>****{accountLastFour}</strong>
                  {' · '}Cuenta de Ahorros / Corriente
                </p>
              </div>
            )}

            {/* Select all */}
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                <strong style={{ color: '#e5e7eb' }}>{selectedRows.length}</strong> de {rows.length} seleccionadas
                {' · '}<strong style={{ color: '#10b981' }}>{fmtCOP(selectedRows.reduce((s,r) => s+r.amount, 0))}</strong> total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, include: true })))}
                  className="px-3 py-1 rounded-lg text-xs"
                  style={{ backgroundColor: '#10b98115', color: '#10b981', border: '1px solid #10b98130' }}>
                  Todas
                </button>
                <button
                  onClick={() => setRows(prev => prev.map(r => ({ ...r, include: false })))}
                  className="px-3 py-1 rounded-lg text-xs"
                  style={{ backgroundColor: '#0f1117', color: '#6b7280', border: '1px solid #2a3040' }}>
                  Ninguna
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden mb-6 table-scroll"
              style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
                    {['✓', 'Fecha', 'Descripción', 'Tipo', 'Categoría', 'Monto'].map((h, i) => (
                      <th key={h} style={{
                        padding: '10px 14px', fontWeight: '500', fontSize: '10px',
                        color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                        textAlign: i === 0 ? 'center' : i === 5 ? 'right' : 'left',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}
                      onClick={() => toggleRow(i)}
                      className="cursor-pointer hover:bg-white/[0.02]"
                      style={{
                        borderBottom: i < rows.length - 1 ? '1px solid #1e2535' : 'none',
                        opacity: row.include ? 1 : 0.4,
                      }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div className="w-4 h-4 rounded flex items-center justify-center mx-auto"
                          style={{
                            backgroundColor: row.include ? '#10b981' : '#2a3040',
                            border: `1px solid ${row.include ? '#10b981' : '#2a3040'}`,
                          }}>
                          {row.include && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{row.date}</td>
                      <td style={{ padding: '10px 14px', color: '#e5e7eb', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.description || '—'}
                      </td>
                      {/* Type toggle */}
                      <td style={{ padding: '10px 14px' }} onClick={e => { e.stopPropagation(); toggleType(i) }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: row.type === 'income' ? '#10b98120' : '#ef444420',
                          color:           row.type === 'income' ? '#10b981'   : '#ef4444',
                          border:          `1px solid ${row.type === 'income' ? '#10b98130' : '#ef444430'}`,
                        }}>
                          {row.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                        <select
                          style={inp}
                          value={row.category}
                          onChange={e => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, category: e.target.value } : r))}
                        >
                          {Object.keys(CATEGORY_MAP).concat(['Otro']).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span className="tabular-nums font-semibold"
                          style={{ color: row.type === 'income' ? '#10b981' : '#ef4444' }}>
                          {fmtCOP(row.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Progress bar */}
            {importing && (
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <p style={{ color: '#9ca3af', fontSize: '12px' }}>Importando transacciones…</p>
                  <p style={{ color: '#10b981', fontSize: '12px' }}>{progress}%</p>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: '#0f1117' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: '#10b981' }} />
                </div>
              </div>
            )}

            {/* Import button */}
            <button
              onClick={importar}
              disabled={importing || selectedRows.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                color: '#0f1117',
                opacity: (importing || selectedRows.length === 0) ? 0.5 : 1,
              }}
            >
              {importing
                ? <><Loader2 size={16} className="animate-spin" /> Importando {progress}%…</>
                : `Importar ${selectedRows.length} transacción${selectedRows.length !== 1 ? 'es' : ''}`}
            </button>
          </>
        )}
      </div>
    </>
  )
}
