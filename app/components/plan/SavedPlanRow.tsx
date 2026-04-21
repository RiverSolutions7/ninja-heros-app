// ============================================================
// SavedPlanRow — canonical visual for a saved plan.
// ------------------------------------------------------------
// Tap → open the plan for editing.
// Long-press → bottom sheet of contextual actions.
//
// We replaced swipe-to-reveal with long-press because:
//   1. Swipe-gesture recognition on the web is fragile —
//      thresholds, timing, iOS Safari quirks — and it was
//      mis-firing on tap-and-hold.
//   2. iOS 17+ apps (Photos, Notes, Messages, Reminders) use
//      long-press context menus as the primary "more actions"
//      gesture. Matching that pattern = zero gesture-recognizer
//      bugs and a familiar UX.
// ============================================================

'use client'

import { useState } from 'react'
import type { PlanRow } from '@/app/lib/database.types'
import BottomSheet from '@/app/components/ui/BottomSheet'
import MenuList, { type MenuItem } from '@/app/components/ui/MenuList'
import useLongPress, { LONG_PRESS_STYLE } from '@/app/hooks/useLongPress'

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

// ── Icons for menu ───────────────────────────────────────────────────────────

const MOVE_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const DUPLICATE_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)
const DELETE_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── Props ────────────────────────────────────────────────────────────────────

interface SavedPlanRowProps {
  plan: PlanRow
  onOpen: () => void
  /** Opt-in contextual actions. When provided, long-press reveals them. */
  actions?: {
    onMove: () => void
    onDuplicate: () => void
    onDelete: () => void
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SavedPlanRow({ plan, onOpen, actions }: SavedPlanRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const longPress = useLongPress({
    onLongPress: () => { if (actions) setMenuOpen(true) },
  })

  const planItems = plan.items ?? []
  const itemCount = planItems.length
  const totalMin = planItems.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)

  const menuItems: MenuItem[] = actions ? [
    { icon: MOVE_ICON,      label: 'Move to another date',     onClick: () => { setMenuOpen(false); actions.onMove() } },
    { icon: DUPLICATE_ICON, label: 'Duplicate to another date', onClick: () => { setMenuOpen(false); actions.onDuplicate() } },
    { icon: DELETE_ICON,    label: 'Delete plan',               onClick: () => { setMenuOpen(false); actions.onDelete() }, destructive: true, dividerAbove: true },
  ] : []

  return (
    <>
      <div
        {...(actions ? longPress : {})}
        onClick={() => onOpen()}
        style={actions ? LONG_PRESS_STYLE : undefined}
        className="relative w-full text-left bg-bg-card border border-bg-border border-l-4 border-l-accent-fire rounded-xl pl-4 pr-10 py-3 transition-colors cursor-pointer active:bg-white/5"
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

      {actions && (
        <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={autoLabel(plan)}>
          <div className="pb-4">
            <MenuList items={menuItems} ariaLabel={`Actions for ${autoLabel(plan)}`} />
          </div>
        </BottomSheet>
      )}
    </>
  )
}
