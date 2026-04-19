'use client'

import { forwardRef } from 'react'

type Variant = 'gold' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  gold: {
    background:  'linear-gradient(135deg, #D4AF37 0%, #b8922a 100%)',
    color:       '#0f1117',
    border:      '1px solid #D4AF3780',
    fontWeight:  700,
    boxShadow:   '0 2px 12px #D4AF3730',
  },
  ghost: {
    background:  'transparent',
    color:       '#D4AF37',
    border:      '1px solid #D4AF3740',
  },
  danger: {
    background:  'transparent',
    color:       '#ef4444',
    border:      '1px solid #ef444440',
  },
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2   text-sm rounded-xl',
  lg: 'px-7 py-2.5 text-sm rounded-xl',
}

const LuxuryButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'gold', size = 'md', loading, children, disabled, className, style, ...rest }, ref) => {
    const isDisabled = disabled || loading
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 font-medium
          transition-all duration-200 hover:opacity-85 active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed ${SIZES[size]} ${className ?? ''}`}
        style={{ ...VARIANTS[variant], ...style }}
        {...rest}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : null}
        {children}
      </button>
    )
  }
)

LuxuryButton.displayName = 'LuxuryButton'
export default LuxuryButton
