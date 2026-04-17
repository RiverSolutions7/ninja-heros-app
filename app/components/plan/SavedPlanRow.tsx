// ============================================================
// SavedPlanRow — the single canonical visual for a saved plan.
// ------------------------------------------------------------
// Previously this same object rendered two ways: the dashboard's
// swipe-revealing green-stripe card (SavedPlanCard, inline in
// TodaysPlanClient) and the calendar-browse fire-tinted pill
// (PlanCard, inline in PlanCalendarSheet). Design inconsistency
// is the product's largest "AI-toy" tell — one source of truth
// now.
//
// Visual grammar (matches ComponentCard from Phase 2A):
//   • bg-bg-card neutral + border + 4px green left stripe
//   • meta-row above title (SAVED · 45 MIN · 3 ITEMS · 10:42)
//   • title as the lead
//   • right-edge chevron (quieter when non-interactive)
//
// Swipe-to-reveal actions are opt-in via the `swipeActions`
// prop. When present → iOS-Mail pattern with Options + Delete.
// When absent → static card that just dispatches onOpen on tap.
// ============================================================

'use client'

import { useRef, useState } from 'react'
import type { PlanRow } from '@/app/lib/database.types'

// ── Helpers (mirrored from TodaysPlanClient / PlanCalendarSheet) ─────────────

function formatSavedAt(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "3 Stations · 2 Games" style fallback when plan.title is empty. */
function autoLabel(plan: PlanRow): string {
  if (plan.title) return plan.title
  const items = plan.items ?? []
  const stations = items.filter((i) => i.component.type === 'station').length
  const games = items.filter((i) => i.component.type === 'game').length
  const parts: string[] = []
  if (stations > 0) parts.push(`${stations} station${stations > 1 ? 's' : ''}`)
  if (games > 0) parts.push(`${games} game${games > 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(' · ') : 'Class Plan'
}

// ── Props ────────────────────────────────────────────────────────────────────

interface SavedPlanRowProps {
  plan: PlanRow
  onOpen: () => void
  /**
   * When provided, the row becomes swipeable (iOS Mail pattern — swipe left
   * reveals Options + Delete). When omitted, the row is a static tap-to-open
   * card with no gesture handling, matching the calendar-browse view.
   */
  swipeActions?: {
    onOptions: () => void
    onDelete: () => void
  }
}

// ── Swipe constants ──────────────────────────────────────────────────────────

const REVEAL_WIDTH = 144   // 72px × 2 buttons
const OPEN_THRESHOLD = 40  // drag past this → snap open

// ── Component ────────────────────────────────────────────────────────────────

export default function SavedPlanRow({ plan, onOpen, swipeActions }: SavedPlanRowProps) {
  const swipeable = Boolean(swipeActions)

  // Swipe state — always declared so hook order stays stable; the pointer
  // handlers bail early when `swipeable` is false so the card is a no-op.
  const swipeStartRef = useRef<{ x: number; y: number; baseDx: number } | null>(null)
  const swipeClaimedRef = useRef(false)
  const ignoreNextClickRef = useRef(false)
  const [swipeDx, setSwipeDx] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [swipeAnimating, setSwipeAnimating] = useState(false)

  const planItems = plan.items ?? []
  const itemCount = planItems.length
  const totalMin = planItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)

  function onRowPointerDown(e: React.PointerEvent) {
    if (!swipeable) return
    swipeStartRef.current = { x: e.clientX, y: e.clientY, baseDx: swipeDx }
    swipeClaimedRef.current = false
    setSwipeAnimating(false)
  }

  function onRowPointerMove(e: React.PointerEvent) {
    if (!swipeable || !swipeStartRef.current) return
    const dx = e.clientX - swipeStartRef.current.x
    const dy = e.clientY - swipeStartRef.current.y
    if (!swipeClaimedRef.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swipeClaimedRef.current = true
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
      } else if (Math.abs(dy) > 10) {
        swipeStartRef.current = null
        return
      }
    }
    if (swipeClaimedRef.current) {
      const raw = swipeStartRef.current.baseDx + dx
      let clamped: number
      if (raw > 0) clamped = Math.min(raw * 0.25, 8)
      else if (raw < -REVEAL_WIDTH) clamped = -REVEAL_WIDTH + (raw + REVEAL_WIDTH) * 0.2
      else clamped = raw
      setSwipeDx(clamped)
    }
  }

  function onRowPointerUp() {
    if (!swipeable) return
    if (swipeClaimedRef.current) {
      ignoreNextClickRef.current = true
      setSwipeAnimating(true)
      if (swipeDx < -OPEN_THRESHOLD) {
        setSwipeDx(-REVEAL_WIDTH)
        setIsRevealed(true)
      } else {
        setSwipeDx(0)
        setIsRevealed(false)
      }
    }
    swipeStartRef.current = null
    swipeClaimedRef.current = false
  }

  function closeSwipe() {
    setSwipeAnimating(true)
    setSwipeDx(0)
    setIsRevealed(false)
  }

  function handleOptionsTap() {
    closeSwipe()
    swipeActions?.onOptions()
  }

  function handleDeleteTap() {
    closeSwipe()
    swipeActions?.onDelete()
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* ── Revealed action panel (behind the row) — only when swipeable ── */}
      {swipeable && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
          <button
            type="button"
            onClick={handleOptionsTap}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1',
              'bg-white/10 text-text-muted font-heading text-[10px] uppercase tracking-wider',
              'active:bg-white/15 transition-colors',
              isRevealed ? 'pointer-events-auto' : 'pointer-events-none',
            ].join(' ')}
            aria-label="Plan options"
            tabIndex={isRevealed ? 0 : -1}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            Options
          </button>
          <button
            type="button"
            onClick={handleDeleteTap}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1',
              'bg-accent-fire text-white font-heading text-[10px] uppercase tracking-wider',
              'active:bg-accent-fire/90 transition-colors',
              isRevealed ? 'pointer-events-auto' : 'pointer-events-none',
            ].join(' ')}
            aria-label="Delete plan"
            tabIndex={isRevealed ? 0 : -1}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* ── Foreground card (translates with swipe when swipeable) ────────── */}
      <div
        onPointerDown={onRowPointerDown}
        onPointerMove={onRowPointerMove}
        onPointerUp={onRowPointerUp}
        onPointerCancel={onRowPointerUp}
        onClick={(e) => {
          if (ignoreNextClickRef.current) {
            ignoreNextClickRef.current = false
            e.stopPropagation()
            e.preventDefault()
            return
          }
          if (isRevealed) {
            e.stopPropagation()
            e.preventDefault()
            closeSwipe()
            return
          }
          onOpen()
        }}
        style={swipeable ? {
          transform: `translateX(${swipeDx}px)`,
          transition: swipeAnimating ? 'transform 180ms ease-out' : 'none',
        } : undefined}
        onTransitionEnd={() => setSwipeAnimating(false)}
        className={[
          'relative w-full text-left bg-bg-card border border-bg-border border-l-4 border-l-accent-green rounded-xl pl-4 pr-10 py-3 transition-colors cursor-pointer select-none',
          isRevealed ? '' : 'active:bg-white/5',
        ].join(' ')}
      >
        <div className="meta-row">
          <span className="text-accent-green">Saved</span>
          {totalMin > 0 && (
            <>
              <span className="sep">·</span>
              <span className="text-text-dim">{totalMin} min</span>
            </>
          )}
          {itemCount > 0 && (
            <>
              <span className="sep">·</span>
              <span className="text-text-dim">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </>
          )}
          {plan.updated_at && (
            <>
              <span className="sep">·</span>
              <span className="text-text-dim/60 normal-case tracking-normal">{formatSavedAt(plan.updated_at)}</span>
            </>
          )}
        </div>
        <p className="font-heading text-[15px] text-text-primary leading-tight mt-0.5 truncate">
          {autoLabel(plan)}
        </p>
        <svg className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-text-dim/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
