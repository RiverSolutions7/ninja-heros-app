'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlanRow } from '@/app/lib/database.types'
import { fetchPlansForDate } from '@/app/lib/planQueries'

// ── Calendar helpers ──────────────────────────────────────────────────────────

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday-first
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatConfirmDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlanCalendarSheetProps {
  mode: 'save' | 'browse'
  todayIso: string
  datesWithPlans: Set<string>
  /** save mode: coach picked a date + optional name → save */
  onSaveToCal: (date: string, title: string) => void
  /** browse mode: coach picked a specific plan to load */
  onLoadPlan: (plan: PlanRow) => void
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanCalendarSheet({
  mode,
  todayIso,
  datesWithPlans,
  onSaveToCal,
  onLoadPlan,
  onClose,
}: PlanCalendarSheetProps) {
  const today = new Date(todayIso + 'T00:00:00')
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [planTitle, setPlanTitle] = useState('')
  const [browsePlans, setBrowsePlans] = useState<PlanRow[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    resetSelection()
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    resetSelection()
  }

  function resetSelection() {
    setSelectedIso(null)
    setPlanTitle('')
    setBrowsePlans([])
  }

  async function handleDayTap(iso: string) {
    if (mode === 'browse') {
      if (!datesWithPlans.has(iso)) return
      setBrowseLoading(true)
      setSelectedIso(iso)
      setBrowsePlans([])
      const plans = await fetchPlansForDate(iso)
      setBrowseLoading(false)
      if (plans.length === 1) {
        // Only one plan — load it immediately, no extra tap needed
        onLoadPlan(plans[0])
        setVisible(false)
        setTimeout(onClose, 300)
        return
      }
      setBrowsePlans(plans)
    } else {
      // Save mode: toggle selection
      if (selectedIso === iso) {
        resetSelection()
      } else {
        setSelectedIso(iso)
        setPlanTitle('')
      }
    }
  }

  function handleSaveConfirm() {
    if (!selectedIso) return
    onSaveToCal(selectedIso, planTitle.trim())
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const cells = buildCalendarGrid(viewYear, viewMonth)

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300"
        style={{ zIndex: 9999, opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 bg-bg-card rounded-t-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{
          zIndex: 10000,
          maxHeight: '92vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <p className="text-center text-[11px] font-heading uppercase tracking-wider text-text-dim px-4 pb-3 flex-shrink-0">
          {mode === 'save' ? 'Add to Calendar' : 'View Calendar'}
        </p>

        <div className="overflow-y-auto flex-1 px-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
              aria-label="Previous month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="font-heading text-base text-text-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button type="button" onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
              aria-label="Next month">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map(label => (
              <div key={label} className="text-center text-[11px] font-heading text-text-dim py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />
              const iso = toIso(viewYear, viewMonth, day)
              const isToday = iso === todayIso
              const isSelected = iso === selectedIso
              const hasPlan = datesWithPlans.has(iso)
              const isInteractive = mode === 'save' || (mode === 'browse' && hasPlan)

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayTap(iso)}
                  disabled={!isInteractive}
                  className={[
                    'flex flex-col items-center py-2 rounded-xl transition-all select-none',
                    isSelected
                      ? 'bg-accent-fire'
                      : isToday
                      ? 'border border-accent-fire/40'
                      : isInteractive
                      ? 'hover:bg-white/5 active:bg-white/10'
                      : 'opacity-30 cursor-default',
                  ].join(' ')}
                  aria-label={`${day} ${MONTH_NAMES[viewMonth]}`}
                >
                  <span className={[
                    'text-sm font-heading leading-none',
                    isSelected ? 'text-white' : isToday ? 'text-accent-fire' : hasPlan ? 'text-text-primary' : 'text-text-muted',
                  ].join(' ')}>
                    {day}
                  </span>
                  <span className={[
                    'w-1 h-1 rounded-full mt-1',
                    hasPlan ? (isSelected ? 'bg-white/70' : 'bg-accent-fire/60') : 'invisible',
                  ].join(' ')} />
                </button>
              )
            })}
          </div>

          {/* ── Save mode: title input + confirm ── */}
          {mode === 'save' && selectedIso && (
            <div className="mt-4 pb-6">
              <input
                type="text"
                value={planTitle}
                onChange={e => setPlanTitle(e.target.value)}
                placeholder="Plan name (optional) — e.g. Tiny Ninjas, Coach Mike"
                maxLength={60}
                className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors mb-3"
              />
              <button
                type="button"
                onClick={handleSaveConfirm}
                className="w-full bg-accent-fire text-white font-heading text-base py-3.5 rounded-xl shadow-glow-fire active:scale-[0.98] transition-all min-h-[52px]"
              >
                Add to {formatConfirmDate(selectedIso)}
              </button>
              <button type="button" onClick={handleClose}
                className="mt-2 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                Cancel
              </button>
            </div>
          )}

          {/* ── Save mode: no date selected yet ── */}
          {mode === 'save' && !selectedIso && (
            <div className="mt-4 pb-6">
              <p className="text-center text-xs text-text-dim py-2">Tap a date to schedule this plan</p>
              <button type="button" onClick={handleClose}
                className="mt-1 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                Cancel
              </button>
            </div>
          )}

          {/* ── Browse mode: loading ── */}
          {mode === 'browse' && browseLoading && (
            <div className="mt-4 flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* ── Browse mode: multiple plans to pick from ── */}
          {mode === 'browse' && !browseLoading && browsePlans.length > 1 && (
            <div className="mt-4 pb-6">
              <p className="text-xs text-text-dim mb-3 text-center">
                {browsePlans.length} plans on {formatConfirmDate(selectedIso!)} — choose one to edit
              </p>
              <div className="space-y-2">
                {browsePlans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => { onLoadPlan(plan); setVisible(false); setTimeout(onClose, 300) }}
                    className="w-full text-left bg-bg-input border border-bg-border rounded-xl px-4 py-3 active:bg-white/5 transition-colors"
                  >
                    <p className="font-heading text-sm text-text-primary leading-snug">
                      {plan.title || 'Untitled Plan'}
                    </p>
                    <p className="text-xs text-text-dim mt-0.5">
                      {(plan.items ?? []).length} component{(plan.items ?? []).length !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
              <button type="button" onClick={handleClose}
                className="mt-3 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                Cancel
              </button>
            </div>
          )}

          {/* ── Browse mode: no date selected yet ── */}
          {mode === 'browse' && !browseLoading && browsePlans.length === 0 && !selectedIso && (
            <div className="mt-4 pb-6">
              <p className="text-center text-xs text-text-dim py-2">
                Tap a highlighted date to load a saved plan
              </p>
              <button type="button" onClick={handleClose}
                className="mt-1 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}
