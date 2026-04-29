'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { detectRecurringCosts, type RecurringSuggestion } from '@/lib/detectRecurring'
import { useAchievementToast } from '@/components/ui/WealthMessage'
import { loadCategoryRules, categorizeTransaction } from '@/lib/categorizeTransaction'
import type { CDTData } from '@/lib/parseCDTClient'

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

const ALL_CATEGORIES = [...Object.keys(CATEGORY_MAP), 'Inversiones', 'Bancario', 'Otro']

// Extracts CDT records from investment-category transactions (CANCELA/INTERES INV VIRT)
function extractCDTsFromInvestmentRows(rows: ParsedRow[]): CDTData[] {
  const map = new Map<string, { capital?: number; interest_earned?: number; date?: string }>()

  for (const row of rows) {
    const m = /INV[\s_]VIRT[\s_](\d+)/i.exec(row.description)
    if (!m) continue
    const id  = m[1]
    const rec = map.get(id) ?? {}
    if (/CANCELA/i.test(row.description)) {
      rec.capital = row.amount
      rec.date    = rec.date ?? row.date
    } else if (/INTERES/i.test(row.description)) {
      rec.interest_earned = row.amount
      rec.date            = rec.date ?? row.date
    }
    map.set(id, rec)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.capital != null)
    .map(([id, v]) => ({
      investment_id:   id,
      bank:            'Bancolombia',
      capital:         v.capital!,
      interest_rate:   null,
      term_days:       null,
      start_date:      v.date ?? new Date().toISOString().split('T')[0],
      end_date:        v.date ?? null,
      interest_earned: v.interest_earned ?? 0,
      status:          'matured' as const,
      raw_text:        '',
    }))
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
  const router                      = useRouter()
  const { trigger, ToastContainer } = useAchievementToast()
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
  const [accountLastFour,  setAccountLastFour]  = useState<string | null>(null)
  const [accountType,      setAccountType]      = useState<string>('Cuenta de Ahorros')
  const [accountBalance,   setAccountBalance]   = useState<number | null>(null)
  const [showRecurring,   setShowRecurring]   = useState(false)
  const [recurringSugg,   setRecurringSugg]   = useState<RecurringSuggestion[]>([])
  const [showInvestmentBanner,  setShowInvestmentBanner]  = useState(false)
  const [investmentCDTs,        setInvestmentCDTs]        = useState<CDTData[]>([])
  const [registeringInvestments, setRegisteringInvestments] = useState(false)
  const [imageFile,             setImageFile]             = useState<File | null>(null)
  const [showImageInstructions, setShowImageInstructions] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // Inicializar mes más reciente como expandido cuando llegan filas
  useEffect(() => {
    if (rows.length === 0) { setExpandedMonths(new Set()); return }
    const keys = [...new Set(rows.map(r => r.date.substring(0, 7)))].sort((a, b) => b.localeCompare(a))
    setExpandedMonths(new Set([keys[0]]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length > 0])

  // ── PDF password state ───────────────────────────────────────────────────
  const [pdfPassword,      setPdfPassword]      = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [passwordError,    setPasswordError]    = useState('')
  const currentPDFFile = useRef<File | null>(null)

  /* ── process PDF in browser (client-side, pdfjs-dist) ──────────────── */
  const processPDF = useCallback(async (file: File, passwordOverride?: string) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede superar 10 MB.')
      return
    }
    currentPDFFile.current = file
    setParsing(true)
    setError('')
    setPasswordError('')
    try {
      const { parsePDFInBrowser } = await import('@/lib/parsePDFClient')
      const pwd    = passwordOverride ?? pdfPassword
      const result = await parsePDFInBrowser(file, pwd || undefined)

      const txs = result.transactions
      if (txs.length === 0) {
        setError('No se encontraron transacciones en este PDF. Asegúrate de que sea un extracto digital (no escaneado).')
        return
      }

      const rules = await loadCategoryRules()
      setPasswordRequired(false)
      setPdfPassword('')
      setBank('bancolombia')
      setSourceKind('pdf')
      setAccountLastFour(result.accountLast4 ?? null)
      setAccountType(result.accountType ?? 'Cuenta de Ahorros')
      setAccountBalance(result.accountBalance ?? null)
      setRows(txs.map(t => ({
        date:        t.date,
        description: t.description,
        amount:      t.amount,
        type:        t.type,
        // DB rules take priority; fall back to parser's autoCategory hint
        // Parser's autoCategory takes priority when it produced a specific result.
        // Only consult DB rules when the parser returned 'Otro' or nothing.
        category:    (t.category && t.category !== 'Otro')
                       ? t.category
                       : (categorizeTransaction(t.description, rules) || 'Otro'),
        include:     true,
      })))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''

      if (msg === 'PASSWORD_REQUIRED') {
        setPasswordRequired(true)
        return
      }
      if (msg === 'WRONG_PASSWORD') {
        setPasswordRequired(true)
        setPasswordError('Contraseña incorrecta. Intenta con tu número de cédula sin puntos.')
        return
      }
      if (msg === 'PDF_SCANNED_OR_EMPTY') {
        setError('El PDF parece estar escaneado. Descarga el extracto digital desde la app de Bancolombia.')
        return
      }
      setError('No se pudo procesar el PDF. Intenta de nuevo.')
    } finally {
      setParsing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPassword])

  /* ── process CSV client-side ────────────────────────────────────────── */
  const processCSV = useCallback(async (file: File) => {
    const rules  = await loadCategoryRules()
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text     = e.target?.result as string
        const raw      = parseCSV(text)
        if (raw.length < 2) { setError('El archivo está vacío o no tiene el formato esperado.'); return }
        const detected = detectBank(raw[0])
        setBank(detected)
        setSourceKind('csv')
        setRows(parseRows(raw, detected).map(row => ({
          ...row,
          category: categorizeTransaction(row.description, rules),
        })))
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
    setAccountBalance(null)
    setPasswordRequired(false)
    setPdfPassword('')
    setPasswordError('')
    setShowImageInstructions(false)
    setImageFile(null)

    const isPDF   = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type.startsWith('image/')

    if (isImage) {
      setImageFile(file)
      setShowImageInstructions(true)
      return
    }
    if (isPDF) {
      processPDF(file)
      return
    }
    processCSV(file)
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

  const TX_TYPE_CYCLE: TxType[] = ['income', 'expense']
  const toggleType = (i: number) =>
    setRows(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      const next = TX_TYPE_CYCLE[(TX_TYPE_CYCLE.indexOf(r.type) + 1) % TX_TYPE_CYCLE.length]
      return { ...r, type: next }
    }))

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
          // Only send last_balance when extracted from "SALDO ACTUAL" in the summary.
          // Never use transaction-row running balances for this.
          ...(accountBalance != null ? { last_balance: accountBalance } : {}),
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
      trigger('csv_imported')

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

      // Detect CDT movements (CANCELA/INTERES INV VIRT) → offer to register in Inversiones
      const invRows  = selectedRows.filter(r => r.category === 'Inversiones')
      const cdtItems = extractCDTsFromInvestmentRows(invRows)
      if (cdtItems.length > 0) {
        setInvestmentCDTs(cdtItems)
        setShowInvestmentBanner(true)
        return   // Don't auto-redirect yet; wait for user decision
      }

      setTimeout(() => router.push('/transacciones'), 2000)
    } catch (err: unknown) {
      setImporting(false)
      setProgress(0)
      setError(err instanceof Error ? err.message : 'No se pudo completar la importación. Inténtalo de nuevo.')
    }
  }

  /* ── month grouping ─────────────────────────────────────────────────── */
  const groupedMonths = useMemo(() => {
    const map = new Map<string, number[]>()
    rows.forEach((row, i) => {
      const key = row.date.substring(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  function toggleMonth(indices: number[]) {
    const allSelected = indices.every(i => rows[i].include)
    setRows(prev => prev.map((r, i) => indices.includes(i) ? { ...r, include: !allSelected } : r))
  }

  function toggleExpandMonth(key: string) {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function monthLabel(key: string): string {
    const [year, month] = key.split('-')
    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return `${names[parseInt(month) - 1]} ${year}`
  }

  /* ── input style helper ─────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '8px',
    color: '#e5e7eb', padding: '4px 8px', fontSize: '12px', outline: 'none', width: '100%',
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Investment detection modal ───────────────────────────────────── */}
      {done && showInvestmentBanner && !showRecurring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #f59e0b40' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: '#f59e0b20' }}>📈</div>
                <div>
                  <p className="text-white font-semibold">
                    CDT{investmentCDTs.length !== 1 ? 's' : ''} detectado{investmentCDTs.length !== 1 ? 's' : ''}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '12px' }}>
                    {investmentCDTs.length} movimiento{investmentCDTs.length !== 1 ? 's' : ''} de inversión en el extracto
                  </p>
                </div>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.7, marginBottom: '20px' }}>
                Se detectaron <strong style={{ color: '#f59e0b' }}>
                  {investmentCDTs.length} CDT{investmentCDTs.length !== 1 ? 's' : ''}
                </strong> a partir de los movimientos de inversión.
                ¿Quieres registrarlos también en el módulo de Inversiones?
              </p>
              <div className="space-y-2 mb-5">
                {investmentCDTs.map(c => (
                  <div key={c.investment_id} className="rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{ backgroundColor: '#0f1117', border: '1px solid #1e2535' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px', fontFamily: 'monospace' }}>
                      {c.bank} #{c.investment_id?.slice(-6)}
                    </span>
                    <span className="tabular-nums font-semibold" style={{ color: '#f59e0b', fontSize: '13px' }}>
                      {fmtCOP(c.capital)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowInvestmentBanner(false); router.push('/transacciones') }}
                className="flex-1 py-2 rounded-xl text-sm hover:opacity-80 transition-opacity"
                style={{ backgroundColor: '#0f1117', color: '#6b7280', border: '1px solid #2a3040' }}>
                No, gracias
              </button>
              <button
                onClick={async () => {
                  setRegisteringInvestments(true)
                  try {
                    await fetch('/api/cdts', {
                      method:  'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body:    JSON.stringify(investmentCDTs),
                    })
                  } catch { /* non-blocking */ }
                  setRegisteringInvestments(false)
                  setShowInvestmentBanner(false)
                  router.push('/inversiones?tab=renta-fija')
                }}
                disabled={registeringInvestments}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
                  color: '#0f1117', opacity: registeringInvestments ? 0.7 : 1,
                }}>
                {registeringInvestments ? 'Registrando…' : 'Sí, registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {!rows.length && !done && !parsing && !passwordRequired && !showImageInstructions && (
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
              accept="application/pdf,text/csv,.csv,.ofx,.qif,image/png,image/jpeg,image/jpg,image/webp"
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
              {['Bancolombia PDF', 'Davivienda', 'Nequi', 'Nu', 'CSV Genérico', 'Captura'].map(b => (
                <span key={b} className="px-3 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#0f1117', border: '1px solid #2a3040', color: '#6b7280' }}>
                  {b}
                </span>
              ))}
            </div>
            <p style={{ color: '#4b5563', fontSize: '11px' }}>PDF · CSV · OFX · QIF · Imagen (captura) · Máx 10 MB</p>
            <p className="mt-2 text-xs" style={{ color: 'rgba(229,231,235,0.3)' }}>
              🔒 Si tu extracto tiene contraseña, la pediremos en el siguiente paso
            </p>
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

        {/* Image instructions panel */}
        {showImageInstructions && imageFile && (
          <div className="relative overflow-hidden rounded-2xl"
            style={{ border: '1px solid rgba(99,102,241,0.25)', backgroundColor: '#1a1f2e' }}>
            <div className="breathe-purple absolute inset-0 rounded-2xl pointer-events-none" />
            <div className="relative space-y-3 p-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📸</span>
                <p className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>
                  Captura recibida
                </p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(229,231,235,0.6)' }}>
                El procesamiento automático de imágenes estará disponible próximamente.
                Por ahora puedes ingresar tus transacciones manualmente o usar tu extracto en PDF o CSV.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowImageInstructions(false); setImageFile(null) }}
                  className="rounded-xl px-4 py-2 text-xs hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(229,231,235,0.6)', backgroundColor: 'transparent' }}
                >
                  Subir otro formato
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/transacciones')}
                  className="rounded-xl px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#6366f1', color: '#fff' }}
                >
                  Ingresar manualmente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password panel — shown when PDF is encrypted */}
        {passwordRequired && !parsing && !rows.length && (
          <div className="relative overflow-hidden rounded-2xl"
            style={{ border: '1px solid rgba(99,102,241,0.25)', backgroundColor: '#1a1f2e' }}>
            {/* breathing purple — visual cue that this is a security step, not an error */}
            <div className="breathe-purple absolute inset-0 rounded-2xl pointer-events-none" />

            <div className="relative space-y-3 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                  <span className="text-sm">🔒</span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#e5e7eb' }}>
                    PDF protegido
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(229,231,235,0.5)' }}>
                    Bancolombia protege sus extractos con tu número de cédula
                  </p>
                </div>
              </div>

              <input
                type="password"
                value={pdfPassword}
                onChange={(e) => {
                  setPdfPassword(e.target.value)
                  setPasswordError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pdfPassword && currentPDFFile.current) {
                    processPDF(currentPDFFile.current, pdfPassword)
                  }
                }}
                placeholder="Número de cédula (sin puntos)"
                autoComplete="off"
                className="w-full rounded-xl text-sm focus:outline-none"
                style={{
                  backgroundColor: '#0f1117',
                  border: `1px solid ${passwordError ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.25)'}`,
                  color: '#e5e7eb', padding: '10px 14px',
                }}
              />

              {passwordError && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{passwordError}</p>
              )}

              <p className="text-xs" style={{ color: 'rgba(229,231,235,0.3)' }}>
                🛡️ La contraseña se usa solo para leer el PDF y nunca se guarda
              </p>

              <button
                onClick={() => currentPDFFile.current && processPDF(currentPDFFile.current, pdfPassword)}
                disabled={!pdfPassword || parsing}
                className="w-full rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#6366f1', color: '#fff',
                  padding: '10px', opacity: (!pdfPassword || parsing) ? 0.4 : 1,
                }}
              >
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
                  {' · '}{accountType}
                </p>
              </div>
            )}

            {/* Select all */}
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                <strong style={{ color: '#e5e7eb' }}>{selectedRows.length}</strong> de {rows.length} seleccionadas
                {' · '}
                <strong style={{ color: '#10b981' }}>
                  ↑ {fmtCOP(selectedRows.filter(r => r.type === 'income').reduce((s,r) => s+r.amount, 0))}
                </strong>
                {' · '}
                <strong style={{ color: '#ef4444' }}>
                  ↓ {fmtCOP(selectedRows.filter(r => r.type === 'expense').reduce((s,r) => s+r.amount, 0))}
                </strong>
                {' · '}
                <span style={{ color: '#6b7280' }}>
                  = {(() => {
                    const net = selectedRows.filter(r => r.type === 'income').reduce((s,r) => s+r.amount, 0)
                              - selectedRows.filter(r => r.type === 'expense').reduce((s,r) => s+r.amount, 0)
                    return <span style={{ color: net >= 0 ? '#10b981' : '#ef4444' }}>{net < 0 ? '-' : ''}{fmtCOP(Math.abs(net))}</span>
                  })()}
                </span>
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

            {/* Grouped by month */}
            <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groupedMonths.map(([monthKey, indices]) => {
                const isExpanded  = expandedMonths.has(monthKey)
                const allSelected = indices.every(i => rows[i].include)
                const anySelected = indices.some(i => rows[i].include)
                const monthRows   = indices.map(i => rows[i])
                const income   = monthRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
                const expenses = monthRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
                const net      = income - expenses

                return (
                  <div key={monthKey} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #2a3040' }}>

                    {/* Month header */}
                    <div
                      onClick={() => toggleExpandMonth(monthKey)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      style={{ backgroundColor: '#1a1f2e', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={e => { e.stopPropagation(); toggleMonth(indices) }}
                        className="flex-shrink-0"
                        style={{
                          width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer',
                          backgroundColor: allSelected ? '#10b981' : anySelected ? '#10b98150' : '#2a3040',
                          border: `1px solid ${allSelected || anySelected ? '#10b981' : '#2a3040'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {allSelected && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                        {!allSelected && anySelected && <span style={{ color: 'white', fontSize: '10px' }}>–</span>}
                      </div>

                      {/* Arrow */}
                      <span style={{
                        fontSize: '9px', color: '#6b7280', flexShrink: 0,
                        display: 'inline-block',
                        transition: 'transform 200ms ease',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}>▶</span>

                      {/* Month name */}
                      <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '13px', flex: 1, minWidth: '120px' }}>
                        {monthLabel(monthKey)}
                      </span>

                      {/* Stats */}
                      <span style={{ color: '#6b7280', fontSize: '11px', flexShrink: 0 }}>
                        {indices.length} transacciones
                      </span>
                      <span style={{ color: '#00d4aa', fontSize: '11px', flexShrink: 0 }}>
                        ↑ {fmtCOP(income)}
                      </span>
                      <span style={{ color: '#ef4444', fontSize: '11px', flexShrink: 0 }}>
                        ↓ {fmtCOP(expenses)}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '11px', flexShrink: 0, color: net >= 0 ? '#00d4aa' : '#ef4444' }}>
                        = {net < 0 ? '-' : ''}{fmtCOP(Math.abs(net))}
                      </span>
                    </div>

                    {/* Rows */}
                    {isExpanded && (
                      <div className="table-scroll" style={{ borderTop: '1px solid #2a3040' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '640px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #2a3040', backgroundColor: '#0f1117' }}>
                              {['✓', 'Fecha', 'Descripción', 'Tipo', 'Categoría', 'Monto'].map((h, hi) => (
                                <th key={h} style={{
                                  padding: '8px 14px', fontWeight: 500, fontSize: '10px',
                                  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
                                  textAlign: hi === 0 ? 'center' : hi === 5 ? 'right' : 'left',
                                }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {indices.map((flatIdx, j) => {
                              const row = rows[flatIdx]
                              return (
                                <tr key={flatIdx}
                                  onClick={() => toggleRow(flatIdx)}
                                  className="cursor-pointer hover:bg-white/[0.02]"
                                  style={{
                                    borderBottom: j < indices.length - 1 ? '1px solid #1e2535' : 'none',
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
                                  <td style={{ padding: '10px 14px' }} onClick={e => { e.stopPropagation(); toggleType(flatIdx) }}>
                                    <span style={{
                                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                      backgroundColor: row.type === 'income' ? '#10b98120' : '#ef444420',
                                      color:           row.type === 'income' ? '#10b981'   : '#ef4444',
                                      border: `1px solid ${row.type === 'income' ? '#10b98130' : '#ef444430'}`,
                                    }}>
                                      {row.type === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                                    <select
                                      style={inp}
                                      value={row.category}
                                      onChange={e => setRows(prev => prev.map((r, idx) => idx === flatIdx ? { ...r, category: e.target.value } : r))}
                                    >
                                      {ALL_CATEGORIES.map(c => (
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
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
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
      <ToastContainer />
    </>
  )
}
