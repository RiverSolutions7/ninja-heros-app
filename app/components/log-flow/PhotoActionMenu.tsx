// @design-locked — built to the locked spec in C:\Users\river\.claude\plans\photo-menu-decisions.md
// (the visual source of truth): a frosted Grok-style context menu — frosted-circle tiles, white
// single-weight line glyphs, monochrome, "bloom from origin" motion. There is no Claude Design HTML
// export for this one; the decision ledger IS the export. polish-audit: do NOT flag divergence from
// MenuList / BottomSheet / the token registry as drift — flag only a11y / tap-targets / state /
// gesture / motion-perf / bugs.

'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LF } from './atoms'

const GLYPH = '#eaf0fb'

function IconPhotoPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GLYPH} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6.5" />
      <circle cx="8" cy="9" r="1.4" />
      <path d="M3.5 16.5l3.2-3.2a1 1 0 0 1 1.4 0l2.3 2.3" />
      <path d="M19 14.5v6M16 17.5h6" />
    </svg>
  )
}

function IconReorder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GLYPH} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 20V5M4 7.8 7 5 10 7.8" />
      <path d="M17 4v15M14 16.2 17 19 20 16.2" />
    </svg>
  )
}

function IconSliders() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GLYPH} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.2" />
      <circle cx="15" cy="16" r="2.2" />
    </svg>
  )
}

function usePrefersReducedMotion() {
  // Read synchronously on first render so the very first open honours Reduce Motion.
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

export interface PhotoActionMenuProps {
  visible: boolean
  onClose: () => void
  onAddMedia: () => void
  onReorder: () => void
  onParsingSettings: () => void
  /** CSS transform-origin for the bloom — point it at the trigger control. */
  origin?: string
  /** Where the panel floats (absolute offsets: left/right/top/bottom). */
  style?: React.CSSProperties
}

export default function PhotoActionMenu({
  visible,
  onClose,
  onAddMedia,
  onReorder,
  onParsingSettings,
  origin = 'left bottom',
  style,
}: PhotoActionMenuProps) {
  const [mounted, setMounted] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const reduced = usePrefersReducedMotion()

  // Mount on show so the bloom plays from collapsed; keep mounted through the FULL exit —
  // the unmount delay must outlast the exit transition or the bloom-out gets cut off.
  useEffect(() => {
    if (visible) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    } else if (mounted) {
      setAnimateIn(false)
      const t = setTimeout(() => setMounted(false), reduced ? 160 : 320)
      return () => clearTimeout(t)
    }
  }, [visible, mounted, reduced])

  // Esc closes; focus the first item on open (keyboard entry point).
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => itemRefs.current[0]?.focus(), 60)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [visible, onClose])

  if (!mounted || typeof window === 'undefined') return null

  const dur = reduced ? 140 : 300
  const ease = reduced ? 'ease' : 'cubic-bezier(0.34, 1.4, 0.5, 1)'

  // ARIA menu keyboard model: arrows rove between items, Home/End jump, Tab dismisses.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[]
    if (!items.length) return
    const idx = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus() }
    else if (e.key === 'Tab') { onClose() }
  }

  const rows = [
    { key: 'add', label: 'Add media', icon: <IconPhotoPlus />, onClick: onAddMedia },
    { key: 'reorder', label: 'Reorder', icon: <IconReorder />, onClick: onReorder },
    { key: 'parsing', label: 'Parsing settings', icon: <IconSliders />, onClick: onParsingSettings },
  ]

  const menu = (
    <>
      {/* Blur-scrim: the Capture screen behind frosts in. Opacity fades (compositor-safe);
          the blur value itself is never animated — see motion-perf in polish-audit. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          cursor: 'pointer',
          background: 'rgba(8,10,18,0.28)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: animateIn ? 1 : 0,
          transition: `opacity ${dur}ms ease`,
        }}
      />

      {/* Frosted panel — blooms from `origin`. */}
      <div
        role="menu"
        aria-label="Photo actions"
        onKeyDown={onPanelKeyDown}
        style={{
          position: 'fixed',
          zIndex: 9999,
          width: 280,
          background: 'rgba(28,32,46,0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 26,
          boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
          padding: '10px 8px',
          willChange: 'transform, opacity',
          ...style,
          transformOrigin: origin,
          transform: reduced ? 'none' : animateIn ? 'scale(1)' : 'scale(0.9)',
          opacity: animateIn ? 1 : 0,
          transition: `transform ${dur}ms ${ease}, opacity ${dur}ms ease`,
        }}
      >
        {rows.map((r, i) => (
          <button
            key={r.key}
            ref={(el) => { itemRefs.current[i] = el }}
            type="button"
            role="menuitem"
            onClick={() => { r.onClick(); onClose() }}
            className="flex items-center w-full text-left bg-transparent transition-colors duration-100 motion-reduce:transition-none hover:bg-white/5 active:bg-white/[0.08]"
            style={{ gap: 16, padding: '11px 14px', minHeight: 58, border: 'none', borderRadius: 16, cursor: 'pointer' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {r.icon}
            </span>
            <span style={{ fontFamily: LF.body, fontSize: 17, fontWeight: 500, letterSpacing: '-0.2px', color: '#f6f8fc' }}>
              {r.label}
            </span>
          </button>
        ))}
      </div>
    </>
  )

  return createPortal(menu, document.body)
}
