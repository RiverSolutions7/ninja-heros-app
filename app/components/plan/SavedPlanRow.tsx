// ============================================================
// SavedPlanRow — the single canonical visual for a saved plan.
// ------------------------------------------------------------
// Previously this same object rendered two ways: the dashboard's
// swipe-revealing green-stripe card and the calendar-browse
// fire-tinted pill. Design inconsistency is the product's
// largest "AI-toy" tell — one source of truth now.
//
// Swipe-to-reveal actions are opt-in via the `swipeActions`
// prop. When present → iOS-Mail pattern via useSwipeReveal().
// When absent → static card that just dispatches onOpen on tap.
// ============================================================

'use client'

import type { PlanRow } from '@/app/lib/database.types'
import useSwipeReveal, { SWIPE_ROW_STYLE } from '@/app/hooks/useSwipeReveal'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSavedAt(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

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
  swipeActions?: {
    onOptions: () => void
    onDelete: () => void
  }
}

const REVEAL_WIDTH = 144 // 72 × 2 buttons

// ── Component ────────────────────────────────────────────────────────────────

export default function SavedPlanRow({ plan, onOpen, swipeActions }: SavedPlanRowProps) {
  const swipeable = Boolean(swipeActions)
  const swipe = useSwipeReveal({ revealWidth: REVEAL_WIDTH })

  const planItems = plan.items ?? []
  const itemCount = planItems.length
  const totalMin = planItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)

  function handleOptionsTap() {
    swipe.close()
    swipeActions?.onOptions()
  }

  function handleDeleteTap() {
    swipe.close()
    swipeActions?.onDelete()
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Revealed action panel (behind the row) — only when swipeable */}
      {swipeable && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
          <button
            type="button"
            onClick={handleOptionsTap}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-1',
              'bg-white/10 text-text-muted font-heading text-[10px] uppercase tracking-wider',
              'active:bg-white/15 transition-colors',
              swipe.isRevealed ? 'pointer-events-auto' : 'pointer-events-none',
            ].join(' ')}
            aria-label="Plan options"
            tabIndex={swipe.isRevealed ? 0 : -1}
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
              swipe.isRevealed ? 'pointer-events-auto' : 'pointer-events-none',
            ].join(' ')}
            aria-label="Delete plan"
            tabIndex={swipe.isRevealed ? 0 : -1}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Foreground card (translates with swipe when swipeable) */}
      <div
        {...(swipeable ? swipe.handlers : {})}
        onClick={(e) => {
          // A click right after a claimed swipe gesture is always spurious.
          if (swipe.consumeClickIfSwiped()) {
            e.stopPropagation()
            e.preventDefault()
            return
          }
          // When revealed, a tap on the foreground closes the swipe rather
          // than opening the plan.
          if (swipe.isRevealed) {
            e.stopPropagation()
            e.preventDefault()
            swipe.close()
            return
          }
          onOpen()
        }}
        style={swipeable ? {
          ...SWIPE_ROW_STYLE,
          transform: `translateX(${swipe.swipeDx}px)`,
          transition: swipe.swipeAnimating ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        } : undefined}
        className={[
          'relative w-full text-left bg-bg-card border border-bg-border border-l-4 border-l-accent-green rounded-xl pl-4 pr-10 py-3 transition-colors cursor-pointer',
          swipe.isRevealed ? '' : 'active:bg-white/5',
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
