'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export type SelectOption = { value: string; label: string }

type SelectProps = {
  value: string | null | undefined
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  /** Extra classes for the trigger button (it already clones .form-input). */
  className?: string
  /** Inline overrides for the trigger, to match call-sites that don't use .form-input. */
  style?: React.CSSProperties
}

/**
 * Custom <Select> that replaces the native <select>. The native dropdown popup
 * ignores `color-scheme` in some Chromium builds and renders white-on-white in
 * our dark theme, with no reliable CSS/next-themes fix. This renders the popup
 * ourselves so it follows the app design.
 *
 * Theming is 100% via CSS classes (html.light / html.dark in globals.css) — no
 * useTheme()-driven inline styles (project rule). The popup is portaled into
 * <body> and positioned with fixed coords computed from the trigger rect, the
 * same reason modals portal: an ancestor with `transform` (.page-enter) would
 * otherwise clip a position:fixed descendant.
 *
 * The component is shape-agnostic: callers always pass options as {value,label}.
 * An empty/placeholder selection is supported — when `value` is "" / null the
 * trigger shows `placeholder`; a "none" entry (e.g. "Sin meta") is just another
 * option supplied by the caller, never hardcoded here.
 */
export default function Select({
  value, onChange, options, placeholder, disabled, name, id, className, style,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef   = useRef<HTMLUListElement>(null)
  const reactId    = useId()
  const listboxId  = `${reactId}-listbox`

  const selectedIndex = options.findIndex(o => o.value === value)
  const selected      = selectedIndex >= 0 ? options[selectedIndex] : null

  // Position the popup from the trigger rect. Opens upward if there isn't room
  // below. Re-measured once the popup has a real height (rAF) and on scroll/resize.
  function reposition() {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const popupH = popupRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = popupH > spaceBelow && r.top > spaceBelow
    setPos({ left: r.left, top: openUp ? r.top - popupH - 4 : r.bottom + 4, width: r.width })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    const raf = requestAnimationFrame(reposition)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScrollResize = () => reposition()
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    return () => {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on outside click (trigger and popup are the only "inside" zones).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keep the active option scrolled into view during keyboard navigation.
  useEffect(() => {
    if (!open) return
    document.getElementById(`${reactId}-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, reactId])

  function openList() {
    if (disabled) return
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ left: r.left, top: r.bottom + 4, width: r.width })
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }
  function closeList() {
    setOpen(false)
    triggerRef.current?.focus()
  }
  function commit(i: number) {
    const opt = options[i]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActiveIndex(i => Math.min(options.length - 1, i + 1)); break
      case 'ArrowUp':   e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); break
      case 'Home':      e.preventDefault(); setActiveIndex(0); break
      case 'End':       e.preventDefault(); setActiveIndex(options.length - 1); break
      case 'Enter':
      case ' ':         e.preventDefault(); if (activeIndex >= 0) commit(activeIndex); break
      case 'Escape':    e.preventDefault(); closeList(); break
      case 'Tab':       setOpen(false); break
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        name={name}
        disabled={disabled}
        className={`select-trigger${className ? ' ' + className : ''}`}
        style={style}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${reactId}-opt-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'select-trigger-value' : 'select-trigger-placeholder'}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <ChevronDown size={16} className="select-chevron" aria-hidden="true" />
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <ul
          ref={popupRef}
          id={listboxId}
          role="listbox"
          className="select-popup"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive   = i === activeIndex
            return (
              <li
                key={`${opt.value}-${i}`}
                id={`${reactId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                className={`select-option${isActive ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(i) }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className="select-option-check" aria-hidden="true" />}
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </>
  )
}
