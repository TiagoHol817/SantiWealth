'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { X, Scissors, Loader2 } from 'lucide-react'

// react-easy-crop is a client-only library (uses DOM/Image APIs). We dynamic-
// import it so it doesn't enter the main bundle until the cropper is opened.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Cropper: any = dynamic(() => import('react-easy-crop'), { ssr: false, loading: () => null })

interface Area {
  x:      number
  y:      number
  width:  number
  height: number
}

interface Props {
  imageUrl: string
  /** Original file name so we can preserve a sensible name on the cropped File. */
  fileName?: string
  onCrop:   (croppedFile: File) => void
  onCancel: () => void
}

/**
 * Full-screen crop UI with free aspect ratio. Portaled to <body> with
 * z-[130] so it stacks above the import modal (z-[100]) and the import
 * tutorial (z-[110]).
 *
 * The actual crop is rendered into a temporary <canvas>, then exported
 * as a JPEG `File` via canvas.toBlob() — same format the modals already
 * accept downstream.
 */
export default function ImageCropper({ imageUrl, fileName, onCrop, onCancel }: Props) {
  const [crop, setCrop]                     = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                     = useState(1)
  const [croppedAreaPixels, setCroppedPx]   = useState<Area | null>(null)
  const [processing, setProcessing]         = useState(false)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedPx(areaPixels)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !processing) onCancel()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel, processing])

  async function applyCrop() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const file = await cropImageToFile(imageUrl, croppedAreaPixels, fileName ?? 'cropped.jpg')
      onCrop(file)
    } finally {
      setProcessing(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[130]"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(4px)' }}
    >
      {/* Cropper canvas */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '120px' }}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          // Free aspect ratio — null in react-easy-crop disables the lock.
          aspect={undefined}
          showGrid
          objectFit="contain"
          minZoom={1}
          maxZoom={3}
        />
      </div>

      {/* Top bar with hint + close */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '14px',
          background: 'linear-gradient(180deg, rgba(15,17,23,0.9), transparent)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <p style={{ color: '#a78bfa', fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '2px' }}>
            Recortar
          </p>
          <p style={{ color: '#e5e7eb', fontSize: '13px', maxWidth: '520px', lineHeight: 1.4 }}>
            Recorta solo la sección de tu activo. Excluye sidebars, pestañas del navegador y notificaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          aria-label="Cerrar"
          style={{
            pointerEvents: 'auto',
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#e5e7eb', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Bottom bar: zoom slider + actions */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
          padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          background: 'linear-gradient(0deg, rgba(15,17,23,0.95), transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '48px' }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              flex: 1, accentColor: '#a78bfa', cursor: 'pointer',
            }}
          />
          <span className="tabular-nums" style={{ color: '#9ca3af', fontSize: '12px', minWidth: '40px', textAlign: 'right' }}>
            {zoom.toFixed(2)}×
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="btn-secondary"
            style={{ padding: '10px 20px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={processing || !croppedAreaPixels}
            className="btn-primary inline-flex items-center gap-2"
            style={{
              padding: '10px 22px', fontSize: '13px',
              opacity: (processing || !croppedAreaPixels) ? 0.5 : 1,
              cursor:  (processing || !croppedAreaPixels) ? 'not-allowed' : 'pointer',
            }}
          >
            {processing
              ? (<><Loader2 size={14} className="animate-spin" /> Recortando…</>)
              : (<><Scissors size={14} /> Listo →</>)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Helper: crop the source image to a File ─────────────────────────────────
function cropImageToFile(src: string, area: Area, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = area.width
      canvas.height = area.height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas-context')); return }
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('canvas-toBlob')); return }
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => reject(new Error('image-load'))
    img.src = src
  })
}
