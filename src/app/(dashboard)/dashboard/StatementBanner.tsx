'use client'
/* ── Statement Import Reminder Banner ───────────────────────────────────
   Shows a dismissable banner on the dashboard reminding the user to
   upload their bank statement. Reads/writes localStorage only — no
   server state needed.

   Visible when:   localStorage.remind_statement_upload === 'true'
              AND  localStorage.statement_imported       !== 'true'
   ─────────────────────────────────────────────────────────────────────── */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export default function StatementBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const remind   = localStorage.getItem('remind_statement_upload')
      const imported = localStorage.getItem('statement_imported')
      setVisible(remind === 'true' && imported !== 'true')
    } catch {
      // localStorage not available (SSR guard)
    }
  }, [])

  function dismiss() {
    try { localStorage.removeItem('remind_statement_upload') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="rounded-2xl p-4 flex items-center justify-between gap-4 fade-light"
      style={{ backgroundColor: '#1a1f2e', border: '1px solid #6366f130' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#6366f120', fontSize: '20px' }}
        >
          📄
        </div>
        <div>
          <p className="text-white text-sm font-semibold">
            Importa tu extracto para ver tu análisis completo
          </p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
            Tus datos son mucho más precisos con información real de tu banco.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/transacciones/importar"
          onClick={() => { try { localStorage.removeItem('remind_statement_upload') } catch {} }}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: '#6366f1', color: '#fff' }}
        >
          Subir extracto →
        </Link>
        <button
          onClick={dismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
          style={{ color: '#4b5563' }}
          aria-label="Cerrar"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
