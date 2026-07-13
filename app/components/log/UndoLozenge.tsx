// @design-locked — the shared Undo lozenge (chunk N1; N3 reuses it for step/cues/card-clear undo).
// Geometry is the W1 whisper's (design-export/capture/frames/8a-w-sort-whisper.html + GracefulToast):
// soft glass rgba(12,19,34,0.78) + STATIC blur(20), 1px border rgba(255,255,255,0.12), radius 14,
// box-shadow 0/12/26 @0.4. The whisper is text-only; this adds a REAL "Undo" button on the right, split
// from the message by a hairline. role=status (polite) + a focusable button. Auto-fades ~6s; the caller
// re-keys it so the NEWEST action REPLACES the last (never stacked). Reduced motion = no transition.
// FREEZE: the blur is STATIC — the lozenge appears/disappears by mount, nothing animates over it.
// The message copy is caller-supplied (unauthored strings flagged at each call site).
// polish-audit: flag only a11y / state / bugs — not the frosted look.
'use client'

import { useEffect, useRef, useState } from 'react'

const INTER = 'var(--font-inter), sans-serif'

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

export interface UndoLozengeProps {
  /** The message ("Changed 3 steps", "Step deleted", "No changes made"). */
  text: string
  /** The action button label. Defaults to "Undo". Omit the button entirely with `onAction` undefined
   *  (e.g. the "No changes made" lozenge, which has nothing to undo). */
  actionLabel?: string
  /** Fires on the Undo tap. When undefined, no button renders (message-only lozenge). */
  onAction?: () => void
  /** Fires once the lozenge auto-fades out (the caller drops it from state). */
  onExpire: () => void
  /** Auto-fade lifetime. Grill spec ~6s. */
  durationMs?: number
  /** Offset above the layout-viewport bottom. Floats above the dock (default matches the whisper 120). */
  bottom?: number
}

export default function UndoLozenge({ text, actionLabel = 'Undo', onAction, onExpire, durationMs = 6000, bottom = 120 }: UndoLozengeProps) {
  const reduced = usePrefersReducedMotion()
  const [leaving, setLeaving] = useState(false)
  const expiredRef = useRef(false)

  // Auto-fade: after durationMs start the exit crossfade, then hand back to the caller. A re-key (newest
  // replaces) remounts this fresh, so the timer always tracks the CURRENT lozenge.
  useEffect(() => {
    const fadeAt = window.setTimeout(() => setLeaving(true), durationMs)
    const dropAt = window.setTimeout(() => {
      if (!expiredRef.current) { expiredRef.current = true; onExpire() }
    }, durationMs + (reduced ? 0 : 260))
    return () => { window.clearTimeout(fadeAt); window.clearTimeout(dropAt) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, reduced])

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', zIndex: 45, pointerEvents: 'none' }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          margin: '0 16px', // safety on narrow screens
          padding: onAction ? '4px 6px 4px 14px' : '6px 14px',
          borderRadius: 14,
          background: 'rgba(12,19,34,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'rgba(0,0,0,0.4) 0px 12px 26px',
          pointerEvents: 'auto',
          opacity: leaving ? 0 : 1,
          transition: reduced ? 'none' : 'opacity 220ms ease',
        }}
      >
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 12.5, color: 'rgb(205,216,234)', whiteSpace: 'nowrap' }}>
          {text}
        </span>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="transition-transform active:scale-[0.94]"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 32,
              padding: '0 12px',
              border: 'none',
              borderRadius: 10,
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: INTER,
              fontWeight: 700,
              fontSize: 12.5,
              // accent orange — the one live control in the lozenge
              color: 'rgb(255,122,47)',
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
