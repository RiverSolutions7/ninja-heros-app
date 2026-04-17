// ============================================================
// useSwipeReveal — iOS-grade swipe-to-reveal gesture hook.
// ------------------------------------------------------------
// Single shared implementation for every swipe row in the app.
// Previously SortablePlanItem and SavedPlanRow each rolled their
// own, with subtle differences and sloppy thresholds that let
// tap-and-hold accidentally trigger the reveal.
//
// Gesture contract (models Apple's list-swipe gesture):
//   1. Pointer down arms the gesture but does NOT claim.
//   2. Claim requires ALL of:
//        a. ≥ 18 px of displacement (CLAIM_DISTANCE)
//        b. horizontal dominance: |dx| ≥ |dy| * 2.5 (HORIZONTAL_BIAS)
//        c. claim decision made within 600 ms of pointer down
//           (CLAIM_WINDOW_MS) — after that, treat as long-press
//        d. ≥ 2 pointer-move events observed (MIN_MOVES) — a
//           single jittery sample can't claim
//   3. Once claimed, the row translates with the pointer,
//      rubber-banding past the revealed position and past zero.
//   4. On release: if swipeDx < -OPEN_THRESHOLD, snap open;
//      otherwise snap closed. Never auto-commit the destructive
//      action — the coach must tap the revealed button.
//
// CSS hardening applied by the consumer:
//   - touch-action: pan-y  (vertical scroll still works)
//   - user-select: none    (no text selection on long-press)
//   - -webkit-touch-callout: none  (no iOS context popup)
//   - -webkit-tap-highlight-color: transparent  (no tap flash)
// ============================================================

'use client'

import { useCallback, useRef, useState } from 'react'

// ── Tuning constants ────────────────────────────────────────────────────────

const CLAIM_DISTANCE = 18        // px of horizontal travel before we claim
const HORIZONTAL_BIAS = 2.5      // |dx| must be this multiple of |dy|
const CLAIM_WINDOW_MS = 600      // after this many ms of press, no more claim
const MIN_MOVES = 2              // consecutive move events before claiming
const VERTICAL_ABANDON = 10      // vertical movement that's enough to bail

// ── Hook ────────────────────────────────────────────────────────────────────

interface UseSwipeRevealOptions {
  /** Width of the action panel behind the row (px). */
  revealWidth: number
  /** How far the row must be dragged to snap open on release (px). */
  openThreshold?: number
  /**
   * Called when a pointerdown fires; return true to bail (e.g. the target
   * is a drag handle). Passed the DOM target so the consumer can sniff
   * data attributes. Return false / void to proceed normally.
   */
  shouldSkip?: (target: HTMLElement) => boolean
}

export interface SwipeRevealState {
  swipeDx: number
  isRevealed: boolean
  swipeAnimating: boolean
}

export interface SwipeRevealHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onTransitionEnd: () => void
}

export interface SwipeRevealControls extends SwipeRevealState {
  handlers: SwipeRevealHandlers
  close: () => void
  /**
   * Call at the top of the row's onClick. If a swipe gesture just ended,
   * this returns true (and swallows the latch) — the caller should
   * preventDefault + stopPropagation + return early so the click doesn't
   * also fire the row's default tap handler. Returns false on a real tap.
   */
  consumeClickIfSwiped: () => boolean
}

export default function useSwipeReveal({
  revealWidth,
  openThreshold = Math.min(40, revealWidth * 0.3),
  shouldSkip,
}: UseSwipeRevealOptions): SwipeRevealControls {
  const [swipeDx, setSwipeDx] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [swipeAnimating, setSwipeAnimating] = useState(false)

  const startRef = useRef<{
    x: number
    y: number
    t: number
    baseDx: number
    moveCount: number
  } | null>(null)
  const claimedRef = useRef(false)
  const ignoreNextClickRef = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (shouldSkip && shouldSkip(e.target as HTMLElement)) return
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      baseDx: swipeDx,
      moveCount: 0,
    }
    claimedRef.current = false
    setSwipeAnimating(false)
  }, [shouldSkip, swipeDx])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    start.moveCount += 1

    if (!claimedRef.current) {
      // Time-window guard: a slow "press and then drift" shouldn't claim —
      // that's a long-press, not a swipe.
      if (Date.now() - start.t > CLAIM_WINDOW_MS) {
        startRef.current = null
        return
      }
      // Require multiple pointermove samples so a single stale jump can't
      // claim. Real swipes produce many consecutive moves.
      if (start.moveCount < MIN_MOVES) return

      // Vertical dominance → let the page scroll, abandon swipe.
      if (Math.abs(dy) > VERTICAL_ABANDON && Math.abs(dy) > Math.abs(dx)) {
        startRef.current = null
        return
      }

      // Claim only if horizontal displacement AND strong horizontal bias.
      if (Math.abs(dx) >= CLAIM_DISTANCE && Math.abs(dx) >= Math.abs(dy) * HORIZONTAL_BIAS) {
        claimedRef.current = true
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
      }
    }

    if (claimedRef.current) {
      // Prevent scrolling from fighting us once we've claimed.
      try { e.preventDefault() } catch { /* passive listeners can throw */ }

      const raw = start.baseDx + dx
      // Clamp between -revealWidth and 0, with gentle rubber-band at both bounds.
      let clamped: number
      if (raw > 0) {
        clamped = Math.min(raw * 0.25, 8)
      } else if (raw < -revealWidth) {
        clamped = -revealWidth + (raw + revealWidth) * 0.2
      } else {
        clamped = raw
      }
      setSwipeDx(clamped)
    }
  }, [revealWidth])

  const onPointerEnd = useCallback(() => {
    if (claimedRef.current) {
      ignoreNextClickRef.current = true
      setSwipeAnimating(true)
      if (swipeDx < -openThreshold) {
        setSwipeDx(-revealWidth)
        setIsRevealed(true)
      } else {
        setSwipeDx(0)
        setIsRevealed(false)
      }
    }
    startRef.current = null
    claimedRef.current = false
  }, [swipeDx, openThreshold, revealWidth])

  const close = useCallback(() => {
    setSwipeAnimating(true)
    setSwipeDx(0)
    setIsRevealed(false)
  }, [])

  // Reads the ref at call time (inside the click handler), so it's never
  // stale — unlike reading ignoreNextClickRef.current at render time.
  const consumeClickIfSwiped = useCallback((): boolean => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false
      return true
    }
    return false
  }, [])

  return {
    swipeDx,
    isRevealed,
    swipeAnimating,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onTransitionEnd: () => setSwipeAnimating(false),
    },
    close,
    consumeClickIfSwiped,
  }
}

// ── Shared CSS to apply to the draggable foreground row ─────────────────────

/**
 * Inline style fragment consumers should spread onto the swipeable element.
 * Locks iOS behaviors that otherwise make the row feel "glitchy":
 *   - pan-y: browser handles vertical scroll; we own horizontal
 *   - user-select: no text-selection callout on long-press
 *   - touch-callout: no iOS "copy/share" menu bubble
 *   - tap-highlight: no grey flash box
 */
export const SWIPE_ROW_STYLE: React.CSSProperties = {
  touchAction: 'pan-y',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
}
