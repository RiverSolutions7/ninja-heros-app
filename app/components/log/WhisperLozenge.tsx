// @design-locked — built from design-export/capture/frames/8a-w-sort-whisper.html (W1 whisper).
// The compact "Multiple setups? Sort →" lozenge that floats just above the dock.
// Frosted glass over the photo → STATIC blur only (never animated); fade via opacity.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the frosted look.
'use client'

import { useEffect, useRef, useState } from 'react'

function usePrefersReducedMotion() {
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

export interface WhisperLozengeProps {
  visible: boolean
  onSort?: () => void
}

export default function WhisperLozenge({ visible, onSort }: WhisperLozengeProps) {
  const reduced = usePrefersReducedMotion()
  // Keep mounted through the fade-out so the exit crossfade plays.
  const [mounted, setMounted] = useState(visible)
  const firstPaint = useRef(true)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => setMounted(false), reduced ? 0 : 260)
    return () => clearTimeout(t)
  }, [visible, reduced])

  useEffect(() => { firstPaint.current = false }, [])

  if (!mounted) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 120,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={onSort}
        aria-label="Multiple setups? Sort into separate stations"
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          minHeight: 0,
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          background: 'rgba(12,19,34,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'rgba(0,0,0,0.4) 0px 12px 26px',
          cursor: 'pointer',
          opacity: visible ? 1 : 0,
          transition: reduced ? 'none' : 'opacity 220ms ease',
        }}
      >
        {/* Invisible hit-slop → ≥44px tall tap target without growing the compact visible pill. */}
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: 44 }} />
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 12, color: 'rgb(205,216,234)' }}>
          Multiple setups?
        </span>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 700, fontSize: 12, color: 'rgb(255,255,255)' }}>
          Sort →
        </span>
      </button>
    </div>
  )
}
