'use client'

import { useCallback, useRef, useState } from 'react'

// ── Thresholds ────────────────────────────────────────────────────────────────
// All values satisfy memory/MEMORY.md gesture spec:
//   CLAIM_DISTANCE ≥ 18 px  |  BIAS_RATIO ≥ 2.5×  |  min events before claim ≥ 2
const REVEAL_WIDTH_DEFAULT = 80   // px — width of the revealed delete button
const FULL_SWIPE_PX        = 260  // px — past this on release → immediate delete
const CLAIM_DISTANCE       = 18   // px horizontal movement before we claim
const BIAS_RATIO           = 2.5  // horizontal must be 2.5× vertical to claim
const SPRING_MS            = 260  // spring-back / spring-open animation ms

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
  const startOffset = useRef(0)
  const claimed     = useRef(false)
  const moveCount   = useRef(0)   // must see ≥ 2 moves before claiming

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
        if (moveCount.current < 2)         return  // ≥ 2 events before claiming
        if (ady > adx * BIAS_RATIO)        return  // vertical scroll wins
        if (!revealed && dx > 0)           return  // only claim leftward swipes
        if (adx < CLAIM_DISTANCE)          return  // not far enough yet

        claimed.current = true

        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[gesture:swipereveal] event=claim dx=%d dy=%d moves=%d',
            Math.round(dx), Math.round(dy), moveCount.current,
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
        // Plain tap while revealed → collapse
        if (revealed) closeReveal()
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
    [revealed, offset, revealWidth, snapTo, onDelete, openReveal, closeReveal],
  )

  const onPointerCancel = useCallback(() => {
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
    /** Inline style to merge onto the sliding element */
    rowStyle: {
      transform:   `translateX(${offset}px)`,
      transition:  animating ? `transform ${SPRING_MS}ms cubic-bezier(0.25, 1, 0.5, 1)` : 'none',
      touchAction: 'pan-y',   // allow vertical scroll; we own horizontal
      willChange:  'transform',
    } satisfies React.CSSProperties,
  }
}
