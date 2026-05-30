'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

/**
 * The modal is loaded lazily so it doesn't get folded into the
 * /transacciones server-page chunk graph. Turbopack was throwing
 * "module factory is not available" for this page after fresh starts —
 * isolating the modal into its own client-only chunk avoids that.
 */
const ScreenshotImportModal = dynamic(() => import('./ScreenshotImportModal'), {
  ssr:     false,
  loading: () => null,
})

/**
 * Client-side wrapper that holds the open-state for the screenshot import
 * modal so it can live inside server components without converting them.
 */
export default function ScreenshotImportButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-2 px-3 py-2 text-sm"
      >
        📷 Subir captura
      </button>
      {open && <ScreenshotImportModal open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
