'use client'

/**
 * DemoBanner — fixed bottom strip shown only to demo@wealthost.co
 * Renders nothing for real users.
 */

interface DemoBannerProps {
  email: string | null | undefined
}

export default function DemoBanner({ email }: DemoBannerProps) {
  if (email !== 'demo@wealthost.co') return null

  return (
    <div className="demo-banner" aria-label="Modo demo activo">
      <span className="demo-banner-dot" />
      <span>
        Estás en modo <strong>Demo</strong> — los datos son ficticios y se reinician periódicamente.
      </span>
      <span className="demo-banner-badge">demo@wealthost.co</span>
    </div>
  )
}
