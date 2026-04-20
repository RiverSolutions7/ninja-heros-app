'use client'

import { useCallback, useRef, useState } from 'react'

// ── Thresholds ────────────────────────────────────────────────────────────────
// All values satisfy memory/MEMORY.md gesture spec minimums AND the stricter
// values chosen to prevent false triggers during iOS list scrolling:
//
//   CLAIM_DISTANCE ≥ 18 px   → we use 25 px
//   BIAS_RATIO     ≥ 2.5×    → we use 3.5× (25° off-vertical = not captured)
//   min moves      ≥ 2       → we use 3
//   MIN_CLAIM_VELOCITY        → NEW: requires deliberate horizontal speed
//
// Why velocity?  Distance + ratio alone cannot distinguish an intentional
// swipe from scroll drift.  An intentional swipe reaches 25 px in ≤ 200ms
// (≥ 0.125 px/ms); natural scroll drift reaches 25 px in 500 ms+ (≤ 0.05).
// A 0.08 px/ms threshold sits cleanly between them.
/** Exported so callers can size the delete zone div to match the gesture threshold. */
export const REVEAL_WIDTH_DEFAULT  = 80    // px — width of the revealed delete button
const FULL_SWIPE_PX                = 260   // px — past this on release → immediate delete
const CLAIM_DISTANCE               = 25    // px horizontal before we claim (was 18)
const BIAS_RATIO                   = 3.5   // vertical must be < 3.5× horizontal (was 2.5)
const MIN_SWIPE_MOVES              = 3     // min pointermove events before claiming (was 2)
const MIN_CLAIM_VELOCITY           = 0.08  // px/ms — rejects slow scroll drift
/** Exported so consumers can compose matching spring transitions (e.g. combining
 *  translateX with a simultaneous scale during long-press feedback). */
export const SPRING_MS             = 260   // spring-back / spring-open animation ms

export interface UseSwipeRevealOptions {
  /** Width in px of the revealed delete zone (default 80) */
  revealWidth?: number
  /** Called when the row is fully swiped or the delete button is tapped */
  onDelete: () => void
  /** Return true to skip gesture for this pointer target (e.g. drag handles) */
  shouldSkip?: (target: Element) => boolean
}

/**
 * iOS table-view swipe-to-delete for a list row.
 *
 * Layout contract (caller's responsibility):
 *   outer wrapper  →  relative + overflow-hidden
 *     delete zone  →  absolute inset-y-0 right-0, width = revealWidth
 *     foreground   →  {...handlers}  style={rowStyle}
 *
 * The foreground slides left, revealing the delete zone behind it.
 * Releasing past revealWidth/2 snaps open; releasing past FULL_SWIPE_PX*0.65
 * fires onDelete immediately.  Tap anywhere on the foreground while revealed
 * collapses it.
 */
export function useSwipeReveal({
  revealWidth = REVEAL_WIDTH_DEFAULT,
  onDelete,
  shouldSkip,
}: UseSwipeRevealOptions) {
  const [offset,    setOffset]    = useState(0)
  const [animating, setAnimating] = useState(false)
  const [revealed,  setRevealed]  = useState(false)

  const startX      = useRef(0)
  const startY      = useRef(0)
  const startTime   = useRef(0)   // performance.now() at pointerdown, for velocity
  const startOffset = useRef(0)
  const claimed     = useRef(false)
  const moveCount   = useRef(0)   // must see ≥ MIN_SWIPE_MOVES events before claiming

  // ── Snap helpers ─────────────────────────────────────────────────────────────
  const snapTo = useCallback((target: number, done?: () => void) => {
    setAnimating(true)
    setOffset(target)
    const id = setTimeout(() => { setAnimating(false); done?.() }, SPRING_MS)
    return () => clearTimeout(id)
  }, [])

  const openReveal  = useCallback(() => { setRevealed(true);  snapTo(-revealWidth) }, [revealWidth, snapTo])
  const closeReveal = useCallback(() => { setRevealed(false); snapTo(0)            }, [snapTo])

  // ── Pointer handlers ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (shouldSkip?.((e.target as Element))) return

      startX.current      = e.clientX
      startY.current      = e.clientY
      startTime.current   = performance.now()
      startOffset.current = offset
      claimed.current     = false
      moveCount.current   = 0

      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[gesture:swipereveal] event=pointerdown x=%d y=%d revealed=%s',
          Math.round(e.clientX), Math.round(e.clientY), revealed,
        )
      }
    },
    [offset, revealed, shouldSkip],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (shouldSkip?.((e.target as Element))) return

      moveCount.current += 1

      const dx  = e.clientX - startX.current
      const dy  = e.clientY - startY.current
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)

      if (!claimed.current) {
        if (moveCount.current < MIN_SWIPE_MOVES) return  // wait for direction to stabilise
        if (ady > adx * BIAS_RATIO)              return  // vertical scroll wins
        if (!revealed && dx > 0)                 return  // only claim leftward swipes
        if (adx < CLAIM_DISTANCE)                return  // not far enough yet

        // Velocity gate: reject slow scroll drift.  An intentional swipe covers
        // CLAIM_DISTANCE in well under 200ms; natural scroll drift takes 400ms+.
        const elapsed   = Math.max(performance.now() - startTime.current, 1)
        const hVelocity = adx / elapsed  // px/ms
        if (hVelocity < MIN_CLAIM_VELOCITY) return

        claimed.current = true

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[gesture:swipereveal] event=claim dx=%d dy=%d moves=%d velocity=%s px/ms',
            Math.round(dx), Math.round(dy), moveCount.current, hVelocity.toFixed(3),
          )
        }
      }

      e.stopPropagation()
      const clamped = Math.max(-FULL_SWIPE_PX, Math.min(0, startOffset.current + dx))
      setOffset(clamped)
      setAnimating(false)
    },
    [revealed, shouldSkip],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return

      if (!claimed.current) {
        // Plain tap while revealed → collapse, unless the tap target is
        // explicitly skipped (e.g. a kebab menu button that should open
        // independently while the row stays revealed).
        if (revealed && !shouldSkip?.((e.target as Element))) closeReveal()
        return
      }

      claimed.current = false

      if (process.env.NODE_ENV === 'development') {
        console.log('[gesture:swipereveal] event=pointerup offset=%d', Math.round(offset))
      }

      if (offset < -(FULL_SWIPE_PX * 0.65)) {
        // Full swipe → fly off and delete
        snapTo(-window.innerWidth, onDelete)
      } else if (offset < -(revealWidth * 0.5)) {
        // Past halfway → snap open
        openReveal()
      } else {
        // Not far enough → snap closed
        closeReveal()
      }
    },
    [revealed, offset, revealWidth, shouldSkip, snapTo, onDelete, openReveal, closeReveal],
  )

  const onPointerCancel = useCallback((_e?: React.PointerEvent) => {
    if (!claimed.current && !revealed) return
    claimed.current = false
    closeReveal()

    if (process.env.NODE_ENV === 'development') {
      console.log('[gesture:swipereveal] event=pointercancel')
    }
  }, [revealed, closeReveal])

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    /** Spread onto the sliding foreground element */
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } as const,
    /** True when the delete button is fully visible */
    revealed,
    /** Programmatically collapse the reveal (e.g. after a parent list action) */
    closeReveal,
    /** Raw translateX offset in px — use when composing with other transforms
     *  (e.g. combining with a long-press scale). Negative = slid left. */
    offset,
    /** True while a spring snap animation is in progress */
    animating,
    /** Convenience style for simple cases (no transform composition needed).
     *  When composing transforms, use `offset` and `animating` directly. */
    rowStyle: {
      transform:   `translateX(${offset}px)`,
      transition:  animating ? `transform ${SPRING_MS}ms cubic-bezier(0.25, 1, 0.5, 1)` : 'none',
      touchAction: 'pan-y',   // allow vertical scroll; we own horizontal
      willChange:  'transform',
    } satisfies React.CSSProperties,
  }
}
