'use client'

/**
 * Single 'use client' boundary that owns the ToastProvider + ToastContainer.
 *
 * The dashboard layout is a Server Component. Importing ToastProvider
 * directly there technically works, but co-locating the provider AND its
 * portal-target ToastContainer inside one explicit client boundary is the
 * Next.js-recommended pattern (and avoids subtle re-render edge cases where
 * useToast() consumers can race the provider during hydration).
 */

import { ToastProvider } from '@/context/ToastContext'
import ToastContainer from './ToastContainer'

export default function ToastWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  )
}
