'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────────── */
type ParsedRow = {
  date: string
  description: string
  amount: number
  category: string
  include: boolean
}

type BankFormat = 'bancolombia' | 'davivienda' | 'nequi' | 'nu' | 'generic'

/* ── Helpers ────────────────────────────────────────────────────────── */
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

  const fi = (names: string[]) => names.findIndex(n => headers.some(h => h.includes(n)))

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

/* ── Main component ─────────────────────────────────────────────────── */
export default function ImportarPage() {
  const router = useRouter()
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging]   = useState(false)
  const [fileName, setFileName]   = useState('')
  const [bank, setBank]           = useState<BankFormat | null>(null)
  const [rows, setRows]           = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  const processFile = useCallback((file: File) => {
    if (!file) return
    setFileName(file.name)
    setError('')
    setDone(false)
    setRows([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text    = e.target?.result as string
        const raw     = parseCSV(text)
        if (raw.length < 2) { setError('El archivo está vacío o no tiene el formato esperado.'); return }
        const headers = raw[0]
        const detected = detectBank(headers)
        setBank(detected)
        setRows(parseRows(raw, detected))
      } catch {
        setError('No se pudo procesar el archivo. Verifica que sea un CSV válido.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

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

  const toggleRow = (i: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, include: !r.include } : r))
  }

  const selectedRows = rows.filter(r => r.include)

  async function importar() {
    if (!selectedRows.length) return
    setImporting(true)
    setProgress(0)
    setError('')

    try {
      // Animate progress bar while the single request is in flight
      const ticker = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 5 : prev))
      }, 120)

      const res = await fetch('/api/import-transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rows: selectedRows.map(r => ({
            type:        'expense',
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
      setTimeout(() => router.push('/transacciones'), 2000)
    } catch (err: unknown) {
      setImporting(false)
      setProgress(0)
      setError(err instanceof Error ? err.message : 'No se pudo completar la importación. Inténtalo de nuevo.')
    }
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '8px',
    color: '#e5e7eb', padding: '4px 8px', fontSize: '12px', outline: 'none', width: '100%',
  }

  return (
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
            Sube tu extracto bancario en formato CSV, OFX o QIF
          </p>
        </div>
      </div>

      {/* Drop zone */}
      {!rows.length && !done && (
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
          style={{
            minHeight: '280px', padding: '48px',
            backgroundColor: dragging ? '#10b98110' : '#1a1f2e',
            border: `2px dashed ${dragging ? '#10b981' : '#2a3040'}`,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.ofx,.qif,.txt"
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
          <div className="flex gap-2 flex-wrap justify-center">
            {['Bancolombia', 'Davivienda', 'Nequi', 'Nu', 'Genérico'].map(b => (
              <span key={b} className="px-3 py-1 rounded-full text-xs"
                style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#6b7280' }}>
                {b}
              </span>
            ))}
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
        <div className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: '#1a1f2e', border: '1px solid #10b98140' }}>
          <CheckCircle size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
          <p className="text-white font-bold text-xl mb-2">¡Importación completada!</p>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>
            {selectedRows.length} transacciones importadas. Redirigiendo...
          </p>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && !done && (
        <>
          {/* File info */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-4"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#10b98120' }}>
                <Upload size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{fileName}</p>
                <p style={{ color: '#6b7280', fontSize: '12px' }}>
                  {bank ? BANK_LABELS[bank] : 'Formato detectado'} · {rows.length} transacciones encontradas
                </p>
              </div>
            </div>
            <button
              onClick={() => { setRows([]); setFileName(''); setBank(null) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
              style={{ color: '#6b7280' }}>
              <X size={14} />
            </button>
          </div>

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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
                  {['✓', 'Fecha', 'Descripción', 'Categoría', 'Monto'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 14px', fontWeight: '500', fontSize: '10px',
                      color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                      textAlign: i === 0 ? 'center' : i === 4 ? 'right' : 'left',
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
                      <span className="tabular-nums font-semibold" style={{ color: '#ef4444' }}>
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
                <p style={{ color: '#9ca3af', fontSize: '12px' }}>Importando transacciones...</p>
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
              ? <><Loader2 size={16} className="animate-spin" /> Importando {progress}%...</>
              : `Importar ${selectedRows.length} transacción${selectedRows.length !== 1 ? 'es' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}
