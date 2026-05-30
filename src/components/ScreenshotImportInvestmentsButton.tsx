'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Camera } from 'lucide-react'

// Lazy-loaded so neither the modal nor Tesseract.js enters the main bundle
// until the user actually clicks the button.
const ScreenshotImportInvestmentsModal = dynamic(
  () => import('./ScreenshotImportInvestmentsModal'),
  { ssr: false, loading: () => null },
)

export default function ScreenshotImportInvestmentsButton() {
  const [open, setOpen] = useState(false)
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
      {open && <ScreenshotImportInvestmentsModal open={open} onClose={() => setOpen(false)} />}
    </>
  )
}
