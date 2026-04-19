// ============================================================
// BottomSheet — minimal reusable primitive.
// ------------------------------------------------------------
// Portal-based slide-up panel with a backdrop. Dismisses on
// backdrop tap, Esc key, and swipe-down on the drag handle.
// First consumer is MediaAddSheet; the existing in-app sheets
// (PlanItemSheet, PlanCalendarSheet, plan-options, delete-
// confirm, ComponentPickerModal) each roll their own backdrop +
// slide logic today and can be migrated to this primitive
// incrementally later.
// ============================================================

'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  /** Controls visibility. Parent owns the boolean. */
  visible: boolean
  /** Fired on any dismiss path: backdrop tap, Esc, swipe-down past threshold. */
  onClose: () => void
  /** Optional title rendered in the sheet header. */
  title?: string
  children: React.ReactNode
  /** Max height cap (default 92vh — leaves a slim peek of the page behind). */
  maxHeight?: string
  /** Disable swipe-down dismiss (useful for sheets with long scrollable content). */
  disableSwipeDismiss?: boolean
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = '92vh',
  disableSwipeDismiss = false,
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [swipeDy, setSwipeDy] = useState(0)
  const swipeStartRef = useRef<number | null>(null)

  // Mount on first show so the slide-in animation plays from offscreen.
  // Keep mounted while closing so the exit animation can run.
  useEffect(() => {
    if (visible) {
      setMounted(true)
      // Next frame: flip to the "in" position so the transition animates.
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    } else if (mounted) {
      setAnimateIn(false)
      // Unmount after the 300ms transition clears.
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [visible, mounted])

  // Esc to close.
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  // Swipe-down dismiss on the drag handle.
  function onHandlePointerDown(e: React.PointerEvent) {
    if (disableSwipeDismiss) return
    swipeStartRef.current = e.clientY
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (disableSwipeDismiss || swipeStartRef.current === null) return
    const dy = e.clientY - swipeStartRef.current
    // Only allow downward drag; rubber-band on upward.
    setSwipeDy(dy > 0 ? dy : dy * 0.2)
  }
  function onHandlePointerUp() {
    if (disableSwipeDismiss) return
    const dy = swipeDy
    swipeStartRef.current = null
    setSwipeDy(0)
    if (dy > 80) onClose()
  }

  if (!mounted || typeof window === 'undefined') return null

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300"
        style={{ zIndex: 9999, opacity: animateIn ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 bg-bg-card rounded-t-2xl flex flex-col ease-out"
        style={{
          zIndex: 10000,
          maxHeight,
          transform: animateIn ? `translateY(${swipeDy}px)` : 'translateY(100%)',
          transition: swipeStartRef.current !== null ? 'none' : 'transform 300ms ease-out',
        }}
      >
        {/* Drag handle — swipe-down dismiss target */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {title && (
          <p className="text-center text-[11px] font-heading uppercase tracking-wide text-text-dim pb-3 px-6 flex-shrink-0 break-words">
            {title}
          </p>
        )}

        <div className="overflow-y-auto flex-1 pb-safe">{children}</div>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}
