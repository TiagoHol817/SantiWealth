'use client'
import { useState } from 'react'
import { FileText, X, Download, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SECCIONES = [
  { id: 'patrimonio',    label: 'Patrimonio',          icon: '💰' },
  { id: 'inversiones',   label: 'Inversiones',          icon: '📈' },
  { id: 'cdts',          label: 'CDTs',                 icon: '📄' },
  { id: 'presupuesto',   label: 'Presupuesto del mes',  icon: '📊' },
  { id: 'metas',         label: 'Metas financieras',    icon: '🎯' },
  { id: 'costos',        label: 'Costos operacionales', icon: '💸' },
  { id: 'transacciones', label: 'Transacciones',        icon: '💳' },
]

type PatrimonioData = {
  netWorthCOP: number; netWorthUSD: number; trm: number
  totalBanks: number; totalBrokers: number; totalCrypto: number
  cuentas: { name: string; type: string; currency: string; balance: number }[]
}

export default function ReportePDF({ patrimonio }: { patrimonio: PatrimonioData }) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState<string[]>(SECCIONES.map(s => s.id))
  const [mes, setMes]           = useState(new Date().toISOString().slice(0, 7))

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  async function generar() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      let y = 0

      const VERDE  = [0, 212, 170]   as [number,number,number]
      const MORADO = [99, 102, 241]  as [number,number,number]
      const ROJO   = [239, 68, 68]   as [number,number,number]
      const AMBAR  = [245, 158, 11]  as [number,number,number]
      const BG     = [26, 31, 46]    as [number,number,number]
      const BGDARK = [15, 17, 23]    as [number,number,number]
      const TEXTO  = [229, 231, 235] as [number,number,number]
      const GRIS   = [107, 114, 128] as [number,number,number]

      const fmtCOP = (n: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
      const fmtUSD = (n: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
      const fmtMes = (m: string) =>
        new Date(m + '-01').toLocaleString('es-CO', { month: 'long', year: 'numeric' })

      doc.setFillColor(...BGDARK)
      doc.rect(0, 0, W, 297, 'F')
      doc.setFillColor(...BG)
      doc.roundedRect(10, 8, W - 20, 28, 3, 3, 'F')
      doc.setFillColor(...VERDE)
      doc.roundedRect(15, 13, 8, 18, 2, 2, 'F')
      doc.setTextColor(...VERDE)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('WealtHost', 27, 22)
      doc.setTextColor(...GRIS)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Personal Wealth Management System', 27, 28)
      doc.setTextColor(...TEXTO)
      doc.setFontSize(9)
      doc.text(`Reporte · ${fmtMes(mes)}`, W - 15, 22, { align: 'right' })
      doc.setTextColor(...GRIS)
      doc.setFontSize(7)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, W - 15, 28, { align: 'right' })
      y = 44

      const titulo = (text: string, color: [number,number,number] = VERDE) => {
        doc.setFillColor(...BG)
        doc.roundedRect(10, y, W - 20, 10, 2, 2, 'F')
        doc.setFillColor(...color)
        doc.rect(10, y, 3, 10, 'F')
        doc.setTextColor(...color)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(text, 17, y + 7)
        y += 14
      }

      const metricRow = (items: { label: string; value: string; color: [number,number,number] }[]) => {
        const cw = (W - 20 - (items.length - 1) * 3) / items.length
        items.forEach((item, i) => {
          const x = 10 + i * (cw + 3)
          doc.setFillColor(...BG)
          doc.roundedRect(x, y, cw, 18, 2, 2, 'F')
          doc.setTextColor(...GRIS)
          doc.setFontSize(6)
          doc.setFont('helvetica', 'normal')
          doc.text(item.label.toUpperCase(), x + 4, y + 6)
          doc.setTextColor(...item.color)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(item.value, x + 4, y + 14)
        })
        y += 22
      }

      const checkPage = (needed = 40) => {
        if (y + needed > 280) {
          doc.addPage()
          doc.setFillColor(...BGDARK)
          doc.rect(0, 0, W, 297, 'F')
          y = 15
        }
      }

      // ─── PATRIMONIO ───────────────────────────────────────────
      if (selected.includes('patrimonio')) {
        titulo('PATRIMONIO', VERDE)
        metricRow([
          { label: 'Patrimonio Neto COP', value: fmtCOP(patrimonio.netWorthCOP), color: VERDE  },
          { label: 'Patrimonio Neto USD', value: fmtUSD(patrimonio.netWorthUSD), color: MORADO },
          { label: 'TRM del dia',         value: fmtCOP(patrimonio.trm),         color: AMBAR  },
        ])
        metricRow([
          { label: 'Efectivo / Bancos', value: fmtCOP(patrimonio.totalBanks),   color: VERDE  },
          { label: 'Bolsa de Valores',  value: fmtCOP(patrimonio.totalBrokers), color: MORADO },
          { label: 'Criptomonedas',     value: fmtCOP(patrimonio.totalCrypto),  color: AMBAR  },
        ])
        const rows = patrimonio.cuentas.map(a => [
          a.name, a.type, a.currency,
          a.type === 'brokerage' || a.type === 'crypto' ? fmtUSD(a.balance) : fmtCOP(a.balance)
        ])
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Cuenta','Tipo','Moneda','Saldo']],
          body: rows,
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15,17,23], textColor: VERDE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── INVERSIONES ──────────────────────────────────────────
      if (selected.includes('inversiones')) {
        checkPage(60)
        titulo('INVERSIONES', MORADO)
        const { data: investments } = await supabase.from('investments').select('*')
        const prices: Record<string,number> = {}
        await Promise.all((investments??[]).map(async inv => {
          try {
            const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${inv.ticker}?interval=1d&range=1d`,
              { headers: { 'User-Agent': 'Mozilla/5.0' } })
            const d = await r.json()
            const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice
            if (p) prices[inv.ticker] = p
          } catch {}
        }))
        const rows2 = (investments??[]).map(inv => {
          const price   = prices[inv.ticker] ?? Number(inv.avg_cost)
          const mktVal  = price * Number(inv.shares)
          const gain    = mktVal - Number(inv.invested)
          const gainPct = Number(inv.invested)>0 ? (gain/Number(inv.invested)*100).toFixed(2)+'%' : '0%'
          return [inv.ticker, inv.name, inv.type.toUpperCase(), Number(inv.shares).toFixed(4), fmtUSD(price), fmtUSD(mktVal), gainPct]
        })
        const total = rows2.reduce((s,r) => s + parseFloat(r[5].replace(/[^0-9.-]/g,'')), 0)
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Ticker','Nombre','Tipo','Unidades','Precio','Valor','P&L']],
          body: rows2,
          foot: [['','','','','Total',fmtUSD(total),'']],
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 7, cellPadding: 2.5 },
          headStyles: { fillColor: [15,17,23], textColor: MORADO, fontStyle: 'bold' },
          footStyles: { fillColor: [15,17,23], textColor: VERDE,  fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── CDTs ─────────────────────────────────────────────────
      if (selected.includes('cdts')) {
        checkPage(50)
        titulo('CDTs', AMBAR)
        const { data: cdtAccounts } = await supabase.from('accounts').select('*').eq('type','other').ilike('name','%CDT%')
        const today = new Date()
        const rows3 = (cdtAccounts??[]).map(a => {
          const meta    = typeof a.notes==='string' ? JSON.parse(a.notes) : a.notes
          const venc    = new Date(meta.vencimiento)
          const dias    = Math.ceil((venc.getTime()-today.getTime())/(1000*60*60*24))
          const cap     = Number(a.current_balance)
          const diasTot = Math.ceil((venc.getTime()-new Date(meta.apertura).getTime())/(1000*60*60*24))
          const rend    = cap*(meta.tasa_ea/100)*(diasTot/365)
          return [a.name, fmtCOP(cap), `${meta.tasa_ea}%`, meta.vencimiento, dias>0?`${dias} dias`:'VENCIDO', fmtCOP(rend)]
        })
        const totalCap = (cdtAccounts??[]).reduce((s,a)=>s+Number(a.current_balance),0)
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Nombre','Capital','Tasa EA','Vencimiento','Dias rest.','Rendimiento']],
          body: rows3,
          foot: [['Total',fmtCOP(totalCap),'','','','']],
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15,17,23], textColor: AMBAR, fontStyle: 'bold' },
          footStyles: { fillColor: [15,17,23], textColor: VERDE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── PRESUPUESTO ──────────────────────────────────────────
      if (selected.includes('presupuesto')) {
        checkPage(60)
        titulo('PRESUPUESTO — ' + fmtMes(mes).toUpperCase(), MORADO)
        const [mesNum, yearNum] = [Number(mes.split('-')[1]), Number(mes.split('-')[0])]
        const { data: budget } = await supabase.from('budgets').select('*').eq('month',mesNum).eq('year',yearNum).single()
        const limites: Record<string,number> = budget?.notes ? JSON.parse(budget.notes) : {}
        const { data: txs } = await supabase.from('transactions').select('category,amount').eq('type','expense')
          .gte('date',`${mes}-01`).lte('date',`${mes}-31`)
        const gastos: Record<string,number> = {}
        txs?.forEach(t => { gastos[t.category] = (gastos[t.category]??0)+Number(t.amount) })
        const cats  = [...new Set([...Object.keys(limites),...Object.keys(gastos)])]
        const rows4 = cats.map(cat => {
          const lim  = limites[cat]??0; const gast = gastos[cat]??0
          const pct  = lim>0 ? Math.min(100,(gast/lim*100)).toFixed(0)+'%' : '-'
          const estado = lim>0 && gast>lim ? 'Excedido' : lim>0 && gast/lim>0.8 ? 'Alerta' : 'OK'
          return [cat, fmtCOP(lim), fmtCOP(gast), fmtCOP(Math.max(0,lim-gast)), pct, estado]
        })
        const tLim  = Object.values(limites).reduce((s,v)=>s+v,0)
        const tGast = Object.values(gastos).reduce((s,v)=>s+v,0)
        metricRow([
          { label: 'Presupuesto total', value: fmtCOP(tLim),       color: MORADO },
          { label: 'Gastado',           value: fmtCOP(tGast),      color: ROJO   },
          { label: 'Disponible',        value: fmtCOP(tLim-tGast), color: tLim-tGast>=0?VERDE:ROJO },
        ])
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Categoria','Limite','Gastado','Disponible','%','Estado']],
          body: rows4,
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15,17,23], textColor: MORADO, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── METAS ────────────────────────────────────────────────
      if (selected.includes('metas')) {
        checkPage(50)
        titulo('METAS FINANCIERAS', VERDE)
        const { data: goals } = await supabase.from('goals').select('*').order('created_at',{ascending:true})
        const rows5 = (goals??[]).map((g:any) => {
          const pct   = Math.min(100,Math.round(Number(g.current_amount)/Number(g.target_amount)*100))
          const falta = Math.max(0,Number(g.target_amount)-Number(g.current_amount))
          const estado = pct>=100 ? 'Completada' : pct>=80 ? 'Casi lista' : 'En progreso'
          return [g.name, fmtCOP(Number(g.target_amount)), fmtCOP(Number(g.current_amount)), fmtCOP(falta), pct+'%', estado]
        })
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Meta','Objetivo','Ahorrado','Falta','Progreso','Estado']],
          body: rows5,
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15,17,23], textColor: VERDE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── COSTOS OP ────────────────────────────────────────────
      if (selected.includes('costos')) {
        checkPage(50)
        titulo('COSTOS OPERACIONALES', ROJO)
        const { data: costs } = await supabase.from('operational_costs').select('*').order('category')
        const activos      = (costs??[]).filter(c=>c.active)
        const totalMensual = activos.reduce((s,c)=>s+Number(c.amount),0)
        metricRow([
          { label: 'Total mensual', value: fmtCOP(totalMensual),    color: ROJO  },
          { label: 'Total anual',   value: fmtCOP(totalMensual*12), color: AMBAR },
          { label: 'Activos',       value: String(activos.length),  color: VERDE },
        ])
        const rows6 = (costs??[]).map(c => [
          c.name, c.category, fmtCOP(Number(c.amount)), c.frequency??'mensual', c.active?'Activo':'Inactivo'
        ])
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Nombre','Categoria','Monto','Frecuencia','Estado']],
          body: rows6,
          foot: [['Total activos','',fmtCOP(totalMensual),'','']],
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15,17,23], textColor: ROJO,  fontStyle: 'bold' },
          footStyles: { fillColor: [15,17,23], textColor: VERDE, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
        checkPage()
      }

      // ─── TRANSACCIONES ────────────────────────────────────────
      if (selected.includes('transacciones')) {
        checkPage(50)
        titulo('TRANSACCIONES — ' + fmtMes(mes).toUpperCase(), MORADO)
        const { data: txs } = await supabase
          .from('transactions')
          .select('type,amount,category,description,date,accounts!transactions_account_id_fkey(name)')
          .gte('date',`${mes}-01`).lte('date',`${mes}-31`)
          .order('date',{ascending:false})
        const ingresos = (txs??[]).filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0)
        const gastosTx = (txs??[]).filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0)
        metricRow([
          { label: 'Ingresos', value: fmtCOP(ingresos),          color: VERDE },
          { label: 'Gastos',   value: fmtCOP(gastosTx),          color: ROJO  },
          { label: 'Balance',  value: fmtCOP(ingresos-gastosTx), color: ingresos-gastosTx>=0?VERDE:ROJO },
        ])
        const rows7 = (txs??[]).map(t => [
          t.date,
          t.type==='income'?'Ingreso':t.type==='expense'?'Gasto':'Deuda',
          t.description||t.category,
          t.category,
          (t.accounts as any)?.name??'-',
          (t.type==='income'?'+':'-')+fmtCOP(Number(t.amount))
        ])
        autoTable(doc, {
          startY: y, margin: { left: 10, right: 10 },
          head: [['Fecha','Tipo','Descripcion','Categoria','Cuenta','Monto']],
          body: rows7,
          styles: { fillColor: BG, textColor: TEXTO, fontSize: 7, cellPadding: 2.5 },
          headStyles: { fillColor: [15,17,23], textColor: MORADO, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [15,17,23] }, theme: 'plain'
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFillColor(...BG)
        doc.rect(0, 287, W, 10, 'F')
        doc.setTextColor(...GRIS)
        doc.setFontSize(7)
        doc.text('WealtHost — Reporte confidencial', 15, 293)
        doc.text(`Pagina ${i} de ${totalPages}`, W - 15, 293, { align: 'right' })
      }

      const nombreMes = fmtMes(mes).replace(' ', '_')
      doc.save(`WealtHost_Reporte_${nombreMes}.pdf`)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const inp = {
    backgroundColor: '#0f1117', border: '1px solid #2a3040', borderRadius: '10px',
    color: '#e5e7eb', padding: '8px 12px', fontSize: '13px', outline: 'none'
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
        style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', color: '#e5e7eb' }}>
        <FileText size={15} /> Exportar PDF
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: '#00000080' }} onClick={() => setOpen(false)} />
          <div className="fixed z-50 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3040', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-lg">Exportar reporte PDF</h3>
                <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>Selecciona las secciones a incluir</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
                style={{ color: '#6b7280' }}><X size={16} /></button>
            </div>

            <div className="mb-4">
              <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Mes del reporte
              </p>
              <input type="month" value={mes} onChange={e => setMes(e.target.value)}
                style={{ ...inp, colorScheme: 'dark', width: '100%' }} />
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Secciones
                </p>
                <button onClick={() => setSelected(selected.length === SECCIONES.length ? [] : SECCIONES.map(s => s.id))}
                  style={{ color: '#10b981', fontSize: '11px' }}>
                  {selected.length === SECCIONES.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              </div>
              {SECCIONES.map(s => {
                const active = selected.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggle(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                    style={{ backgroundColor: active ? '#10b98115' : '#0f1117', border: `1px solid ${active ? '#10b98140' : '#1e2535'}` }}>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '16px' }}>{s.icon}</span>
                      <span style={{ color: active ? '#e5e7eb' : '#6b7280', fontSize: '13px' }}>{s.label}</span>
                    </div>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: active ? '#10b981' : '#1e2535' }}>
                      {active && <Check size={12} color="#000" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button onClick={generar} disabled={loading || selected.length === 0}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: selected.length === 0 ? '#1e2535' : '#D4AF37', color: selected.length === 0 ? '#4b5563' : '#0f1117' }}>
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <><Download size={15} /> Descargar PDF</>
              )}
            </button>
          </div>
        </>
      )}
    </>
  )
}