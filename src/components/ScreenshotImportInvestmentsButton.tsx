'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import ScreenshotImportInvestmentsModal from './ScreenshotImportInvestmentsModal'

/**
 * Static import of the modal + a `mounted` flag.
 *
 * Why not `next/dynamic({ ssr: false })` here:
 *   Turbopack + React 19 occasionally loses the chunk graph when a route
 *   has TWO dynamic imports that both transitively pull `tesseract.js`
 *   through different ancestors. Statically importing the modal removes
 *   one of those boundaries — the modal code joins the button's client
 *   chunk, which is fine because the heavy work (Tesseract.js + language
 *   data, ~10 MB) is still gated behind a separate `await import('tesseract.js')`
 *   in src/lib/ocr/run-ocr.ts and only runs when the user clicks Analizar.
 *
 *   The `mounted` flag matches what `{ ssr: false }` was buying us: we
 *   delay rendering the modal until after hydration so document.body
 *   (used by createPortal inside the modal) is available.
 */
export default function ScreenshotImportInvestmentsButton() {
  const [open, setOpen]       = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary inline-flex items-center gap-2"
        style={{ padding: '10px 16px', fontSize: '13px' }}
      >
        <Camera size={13} /> Importar desde captura
      </button>
      {mounted && open && (
        <ScreenshotImportInvestmentsModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
