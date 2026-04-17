// ============================================================
// useSwipeReveal — iOS-grade swipe-to-reveal gesture hook.
// ------------------------------------------------------------
// Models Apple's UIPanGestureRecognizer for list-row swipe:
// a gesture is a *quick, horizontally-dominant* finger motion
// started soon after touchdown. A stationary tap-and-hold, a
// slow drift, or a diagonal motion cannot qualify — full stop.
//
// State machine:
//   (idle) ── pointerdown ──▶ (armed, t0 = now)
//   (armed) ── no movement ≥ 5 px within FIRST_MOVE_WINDOW ──▶ (dead)
//   (armed) ── vertical movement dominates ──▶ (dead) [browser scrolls]
//   (armed) ── quick horizontal motion satisfies all thresholds
//              within CLAIM_WINDOW ──▶ (claimed) [pointer captured]
//   (claimed) ── finger tracks row until pointerup
//   (*) ── pointerup ──▶ snap open or closed
//
// Thresholds are deliberately strict. A swipe that feels
// "intentional" on a 6-inch phone moves ≥ 30 px in the first
// half-second. Everything shorter or slower is rejected.
// ============================================================

'use client'

import { useCallback, useRef, useState } from 'react'

// ── Tuning constants ────────────────────────────────────────────────────────

const CLAIM_DISTANCE = 30         // px of horizontal travel before we claim
const HORIZONTAL_BIAS = 3         // |dx| must be ≥ this × |dy| (≈ 18° cone)
const FIRST_MOVE_WINDOW_MS = 250  // finger must move ≥ 5px within this window
const FIRST_MOVE_EPSILON = 5      // minimum displacement that counts as "moving"
const CLAIM_WINDOW_MS = 500       // after this many ms of press, no claim allowed
const MIN_MOVES = 3               // number of pointermove events before claim
const VERTICAL_ABANDON = 8        // vertical movement that defeats the swipe

// ── Types ───────────────────────────────────────────────────────────────────

interface UseSwipeRevealOptions {
  revealWidth: number
  openThreshold?: number
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
  onContextMenu: (e: React.SyntheticEvent) => void
  onTransitionEnd: () => void
}

export interface SwipeRevealControls extends SwipeRevealState {
  handlers: SwipeRevealHandlers
  close: () => void
  /**
   * Call at the top of the row's onClick. Returns true if a swipe gesture
   * just ended — caller should preventDefault + stopPropagation + return.
   */
  consumeClickIfSwiped: () => boolean
}

// ── Internal gesture record ─────────────────────────────────────────────────

interface GestureStart {
  x: number
  y: number
  t: number
  baseDx: number
  moveCount: number
  hasMoved: boolean // crossed FIRST_MOVE_EPSILON at least once
}

// ── Hook ────────────────────────────────────────────────────────────────────

export default function useSwipeReveal({
  revealWidth,
  openThreshold = Math.min(40, revealWidth * 0.3),
  shouldSkip,
}: UseSwipeRevealOptions): SwipeRevealControls {
  const [swipeDx, setSwipeDx] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [swipeAnimating, setSwipeAnimating] = useState(false)

  const startRef = useRef<GestureStart | null>(null)
  const claimedRef = useRef(false)
  const ignoreNextClickRef = useRef(false)

  const abandon = useCallback(() => {
    startRef.current = null
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (shouldSkip && shouldSkip(e.target as HTMLElement)) return
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      baseDx: swipeDx,
      moveCount: 0,
      hasMoved: false,
    }
    claimedRef.current = false
    setSwipeAnimating(false)
  }, [shouldSkip, swipeDx])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = startRef.current
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const elapsed = Date.now() - start.t
    start.moveCount += 1

    if (!claimedRef.current) {
      // Register when the finger first actually moves (>5px Manhattan).
      // If this never happens within FIRST_MOVE_WINDOW_MS, it's a press.
      if (!start.hasMoved) {
        if (Math.abs(dx) > FIRST_MOVE_EPSILON || Math.abs(dy) > FIRST_MOVE_EPSILON) {
          start.hasMoved = true
        } else if (elapsed > FIRST_MOVE_WINDOW_MS) {
          // Too slow to be a swipe — abandon. Further finger motion is a
          // drift on an already-pressing finger, not an intentional swipe.
          abandon()
          return
        }
      }

      // Hard time ceiling: claim cannot happen after this window.
      if (elapsed > CLAIM_WINDOW_MS) {
        abandon()
        return
      }

      // Need enough samples to reject a single stale/coalesced event.
      if (start.moveCount < MIN_MOVES) return

      // Vertical movement defeats the swipe immediately — let the page scroll.
      if (Math.abs(dy) >= VERTICAL_ABANDON && Math.abs(dy) > Math.abs(dx)) {
        abandon()
        return
      }

      // Claim only on strong horizontal intent: distance + narrow angle cone.
      if (Math.abs(dx) >= CLAIM_DISTANCE && Math.abs(dx) >= Math.abs(dy) * HORIZONTAL_BIAS) {
        claimedRef.current = true
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
      }
    }

    if (claimedRef.current) {
      // Prevent the browser from also scrolling once we own the gesture.
      try { e.preventDefault() } catch { /* passive listeners can throw */ }

      const raw = start.baseDx + dx
      let clamped: number
      if (raw > 0) clamped = Math.min(raw * 0.25, 8)
      else if (raw < -revealWidth) clamped = -revealWidth + (raw + revealWidth) * 0.2
      else clamped = raw
      setSwipeDx(clamped)
    }
  }, [revealWidth, abandon])

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

  const consumeClickIfSwiped = useCallback((): boolean => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false
      return true
    }
    return false
  }, [])

  // Block the iOS long-press context menu that fires at ~500 ms. Otherwise
  // the system UI interferes with our gesture and can make the row feel
  // "possessed" during a hold.
  const onContextMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
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
      onContextMenu,
      onTransitionEnd: () => setSwipeAnimating(false),
    },
    close,
    consumeClickIfSwiped,
  }
}

// ── Shared CSS for every swipeable row ──────────────────────────────────────

/**
 * Inline styles the consumer MUST spread onto the draggable foreground.
 * Locks iOS default gestures that otherwise fight the swipe recognizer:
 *   - pan-y:          browser handles vertical scroll; we own horizontal
 *   - user-select:    no text-selection callout on long press
 *   - touch-callout:  no iOS "copy/share" bubble
 *   - tap-highlight:  no grey flash on tap
 *   - user-drag:      no native drag-and-drop initiation
 */
export const SWIPE_ROW_STYLE: React.CSSProperties = {
  touchAction: 'pan-y',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
  WebkitUserDrag: 'none',
} as React.CSSProperties
