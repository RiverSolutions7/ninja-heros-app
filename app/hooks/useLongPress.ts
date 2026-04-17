// ============================================================
// useLongPress — iOS-style press-and-hold detector.
// ------------------------------------------------------------
// Replaces swipe-to-reveal across plan rows. Long-press fires
// after DELAY_MS of continuous finger contact at approximately
// the same point. Quick taps are unaffected; small jitters
// don't cancel.
//
// Why this instead of swipe:
//   - Swipe-to-reveal requires gesture-recognizer tuning
//     (thresholds, timing, horizontal bias, pointer capture)
//     that's fragile across iOS Safari versions.
//   - Long-press is a single-event contract. It either fires
//     at DELAY_MS or it doesn't. No threshold drift, no state
//     machine bugs.
//   - Matches the iOS 17+ pattern used by Photos, Notes,
//     Messages, Reminders for per-row contextual actions.
// ============================================================

'use client'

import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_DELAY_MS = 500
const MOVEMENT_CANCEL_PX = 12 // finger drift that cancels the press

interface UseLongPressOptions {
  /** Called when the press completes without being cancelled. */
  onLongPress: () => void
  /** How long to hold before firing. Default 500ms — iOS standard. */
  delayMs?: number
  /** Opt-out: return true from pointerdown target to skip (e.g. drag handle). */
  shouldSkip?: (target: HTMLElement) => boolean
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onContextMenu: (e: React.SyntheticEvent) => void
}

export default function useLongPress({
  onLongPress,
  delayMs = DEFAULT_DELAY_MS,
  shouldSkip,
}: UseLongPressOptions): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => cancel, [cancel])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (shouldSkip && shouldSkip(e.target as HTMLElement)) return
    startRef.current = { x: e.clientX, y: e.clientY }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onLongPress()
      // Clear immediately so a subsequent pointerup doesn't also fire a click.
      startRef.current = null
      timerRef.current = null
    }, delayMs)
  }, [shouldSkip, onLongPress, delayMs])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    // If the finger drifts meaningfully before the timer fires, it's not a
    // long-press — it's either a scroll or a swipe. Cancel so the page/native
    // gesture can handle it normally.
    if (Math.sqrt(dx * dx + dy * dy) > MOVEMENT_CANCEL_PX) {
      cancel()
    }
  }, [cancel])

  const onPointerEnd = useCallback(() => {
    cancel()
  }, [cancel])

  // Block the iOS ~500ms long-press system context menu (copy/share bubble).
  // Our own onLongPress fires at the same time and we want our UI, not iOS's.
  const onContextMenu = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault()
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onContextMenu,
  }
}

/** Inline CSS that consumers should spread onto long-press target elements. */
export const LONG_PRESS_STYLE: React.CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
  WebkitUserDrag: 'none',
} as React.CSSProperties
