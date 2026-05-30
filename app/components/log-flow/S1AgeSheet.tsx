'use client'

/**
 * @design-locked — built verbatim from the Claude Design export (Choose a curriculum.html).
 * The export is the visual source of truth; see "The Fidelity Law" in stack.md.
 * polish-audit: do NOT flag divergence from shared primitives as drift — flag only a11y / tap-targets / state / gesture / bugs.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CurriculumRow } from '@/app/lib/database.types'
import { LF } from './atoms'

// ─── Exact values lifted from Daniel's Claude Design export ───────────────────
// (Choose a curriculum_files/_bootstrap.html). This sheet reproduces the export's
// surface + motion verbatim; only the BEHAVIOR (portal, Esc, scrim-tap close,
// handle-only swipe-down) + scroll-lock are borrowed from the shared BottomSheet.
const DESIGN = {
  orange: '#f97316',
  sheetBg: '#0f1629', // --bg-secondary
  textPrimary: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#475569',
  scrim: 'rgba(2,4,10,0.62)',
  glowOrange: '0 0 28px rgba(249,115,22,0.40), 0 6px 18px rgba(249,115,22,0.22)',
} as const

// Open / close transition duration for the sheet slide — kept in lockstep with
// the unmount timeout below so the panel stays mounted for the whole exit.
const SLIDE_MS = 280

const IconCheck = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
)

/**
 * S1AgeSheet — screen-local age-group bottom sheet for S1Setup.
 *
 * Why screen-local (not the shared BottomSheet): the shared primitive's surface
 * + motion (420ms spring, 40% black scrim, 20px glass-blur, 16px radius) diverge
 * from Daniel's iterated Claude Design. This component keeps the proven BEHAVIOR
 * of BottomSheet but paints the export's exact look: slide translateY(115%)→0 at
 * 0.28s cubic-bezier(.4,0,.2,1), scrim rgba(2,4,10,0.62) @ 0.25s, solid #0f1629
 * surface (no blur), 26px top radius.
 *
 * Data-driven: `curriculums` come from the live Supabase fetch (never hardcoded);
 * the export supplied only styling. The export's age sublabels ("Ages 3–5") are
 * mock data with no column in CurriculumRow, so they are intentionally omitted —
 * each age row shows the real label + a check, matching the export's treatment.
 */
export default function S1AgeSheet({
  open,
  curriculums,
  selectedCurricula,
  onToggle,
  onDone,
  onClose,
}: {
  open: boolean
  curriculums: CurriculumRow[]
  selectedCurricula: string[]
  onToggle: (ageGroup: string) => void
  /** Done button — only enabled with ≥1 age selected. */
  onDone: () => void
  /** Any dismiss path: scrim tap, Esc, swipe-down past threshold. */
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [swipeDy, setSwipeDy] = useState(0)
  const swipeStartRef = useRef<number | null>(null)

  const hasAny = selectedCurricula.length > 0

  // ── Mount lifecycle ────────────────────────────────────────────────────────
  // When opening: mount immediately. When closing: keep mounted for the exit
  // slide, then unmount after SLIDE_MS (lockstep with the transform duration).
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (!mounted) return
    const t = setTimeout(() => setMounted(false), SLIDE_MS)
    return () => clearTimeout(t)
  }, [open, mounted])

  // ── Slide direction ────────────────────────────────────────────────────────
  // Drive animateIn purely from (open && mounted). Kept in its own effect so a
  // fast close→reopen (while still mounted) reliably re-arms the open transition
  // instead of getting stuck behind a cancelled rAF. On open we flip animateIn
  // true on the next frame so the panel transitions from its offscreen start.
  useEffect(() => {
    if (open && mounted) {
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    }
    setAnimateIn(false)
  }, [open, mounted])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Body scroll-lock while the sheet is open (added vs the shared BottomSheet).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Handle-only swipe-down dismiss (matches BottomSheet's threshold).
  function onHandlePointerDown(e: React.PointerEvent) {
    swipeStartRef.current = e.clientY
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (swipeStartRef.current === null) return
    const dy = e.clientY - swipeStartRef.current
    setSwipeDy(dy > 0 ? dy : dy * 0.2) // downward only; rubber-band upward
  }
  function onHandlePointerUp() {
    const dy = swipeDy
    swipeStartRef.current = null
    setSwipeDy(0)
    if (dy > 80) onClose()
  }

  if (!mounted || typeof window === 'undefined') return null

  const sheet = (
    <>
      {/* Scrim — exact export color + fade */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: DESIGN.scrim,
          opacity: animateIn ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Sheet surface — solid #0f1629, 26px top radius, no blur */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Who's it for?"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          background: DESIGN.sheetBg,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -20px 50px rgba(0,0,0,0.5)',
          padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 30px)',
          color: DESIGN.textPrimary,
          transform: animateIn ? `translateY(${swipeDy}px)` : 'translateY(115%)',
          transition: swipeStartRef.current !== null
            ? 'none'
            : `transform ${SLIDE_MS / 1000}s cubic-bezier(0.4,0,0.2,1)`,
        }}
      >
        {/* Grab handle — swipe-down dismiss target (44px tall hit area, 5px visual) */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 22,
            marginBottom: 18,
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <div style={{ width: 40, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        <h2 style={{ fontFamily: LF.display, fontSize: 22, margin: 0, color: DESIGN.textPrimary, textTransform: 'uppercase' }}>
          Who&apos;s it for?
        </h2>
        <p style={{ fontFamily: LF.body, fontSize: 14, color: DESIGN.textMuted, margin: '10px 0 0' }}>
          Tap every age group this works with.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '22px 0 24px' }}>
          {curriculums.map((c) => {
            const sel = selectedCurricula.includes(c.age_group)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.age_group)}
                role="checkbox"
                aria-checked={sel}
                aria-label={c.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  minHeight: 44,
                  padding: '17px 18px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: sel ? 'rgba(249,115,22,0.10)' : 'rgba(255,255,255,0.045)',
                  border: `1px solid ${sel ? 'rgba(249,115,22,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  color: DESIGN.textPrimary,
                  transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease',
                }}
              >
                <span style={{ fontFamily: LF.display, fontSize: 17, flex: 1, textTransform: 'uppercase' }}>{c.label}</span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: sel ? DESIGN.orange : 'transparent',
                    opacity: sel ? 1 : 0,
                    transform: sel ? 'scale(1)' : 'scale(0.6)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                  }}
                >
                  <IconCheck size={20} />
                </span>
              </button>
            )
          })}
        </div>

        {/* Done — primary button styled to the export (Russo One, orange glow) */}
        <button
          type="button"
          onClick={hasAny ? onDone : undefined}
          disabled={!hasAny}
          role="button"
          aria-disabled={!hasAny || undefined}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 16,
            border: 'none',
            fontFamily: LF.display,
            fontSize: 16,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: hasAny ? 'pointer' : 'not-allowed',
            background: hasAny ? DESIGN.orange : 'rgba(255,255,255,0.06)',
            color: hasAny ? '#fff' : DESIGN.textDim,
            boxShadow: hasAny ? DESIGN.glowOrange : 'none',
            transition: 'background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease',
          }}
        >
          Done
        </button>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}
