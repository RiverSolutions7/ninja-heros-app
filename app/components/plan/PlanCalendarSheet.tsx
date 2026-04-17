'use client'

import { useEffect, useState } from 'react'
import type { PlanRow } from '@/app/lib/database.types'
import { fetchPlansForDate } from '@/app/lib/planQueries'
import BottomSheet from '@/app/components/ui/BottomSheet'
import SavedPlanRow from './SavedPlanRow'

// ── Date helpers ──────────────────────────────────────────────────────────────

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

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(isoDate: string): Date {
  const d = new Date(isoDate + 'T00:00:00')
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  d.setDate(d.getDate() + diff)
  return d
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + n)
  return result
}

function formatConfirmDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${startStr} – ${endStr}`
}

// formatSavedAt + autoLabel now live in SavedPlanRow (shared with dashboard)

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
  onSaveToCal: (date: string, title: string) => void
  onLoadPlan: (plan: PlanRow) => void
  onClose: () => void
  /** Override the initial view. Defaults to 'week' for browse, 'month' for save. */
  defaultView?: ViewMode
  /** Pre-fill the plan title field with a value the coach already typed. */
  initialTitle?: string
  /**
   * Pre-select a date on open (save mode only). The calendar jumps to that
   * month and the confirm button ("Add to {date}") is immediately active —
   * one tap to save when the coach already signaled which date they're
   * planning for (e.g. by tapping "Plan for Sat, Apr 18" on the dashboard).
   */
  initialSelectedDate?: string
}

type ViewMode = 'week' | 'month'

// Calendar-browse list uses the shared SavedPlanRow (imported at top).
// Keeping the one-place-for-everything card grammar in lockstep with the
// dashboard so the same conceptual object doesn't render two ways.

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanCalendarSheet({
  mode,
  todayIso,
  datesWithPlans,
  onSaveToCal,
  onLoadPlan,
  onClose,
  defaultView,
  initialTitle = '',
  initialSelectedDate,
}: PlanCalendarSheetProps) {
  const today = new Date(todayIso + 'T00:00:00')

  // If the caller pre-seeded a date (save mode only), anchor the month view
  // to that date and start with it selected so the coach can confirm in one
  // tap without scrolling.
  const seededIso = mode === 'save' && initialSelectedDate ? initialSelectedDate : null
  const seededDate = seededIso ? new Date(seededIso + 'T00:00:00') : today

  // Shared
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView ?? (mode === 'browse' ? 'week' : 'month'))
  // Starts true so BottomSheet animates in immediately on mount.
  const [visible, setVisible] = useState(true)

  // Month view
  const [viewYear, setViewYear] = useState(seededDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(seededDate.getMonth())
  const [selectedIso, setSelectedIso] = useState<string | null>(seededIso)
  const [planTitle, setPlanTitle] = useState(initialTitle)
  const [browsePlans, setBrowsePlans] = useState<PlanRow[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  // Week view
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(todayIso))
  const [selectedWeekIso, setSelectedWeekIso] = useState<string>(todayIso)
  const [weekPlans, setWeekPlans] = useState<PlanRow[]>([])
  const [weekLoading, setWeekLoading] = useState(false)


  // Load plans when a week day is selected (browse + week view)
  // Always list plans as cards — never auto-load on passive selection. The week
  // view is for browsing; explicit tap on a card is required to open a plan.
  useEffect(() => {
    if (mode !== 'browse' || viewMode !== 'week') return
    if (!datesWithPlans.has(selectedWeekIso)) {
      setWeekPlans([])
      return
    }
    setWeekLoading(true)
    setWeekPlans([])
    fetchPlansForDate(selectedWeekIso).then(plans => {
      setWeekLoading(false)
      setWeekPlans(plans)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekIso, viewMode])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // ── Month view handlers ────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    resetMonthSelection()
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    resetMonthSelection()
  }

  function resetMonthSelection() {
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
      // Always list plans as cards — never auto-load on date tap. Browse = explore,
      // load requires an explicit card tap.
      setBrowsePlans(plans)
    } else {
      if (selectedIso === iso) resetMonthSelection()
      else { setSelectedIso(iso); setPlanTitle('') }
    }
  }

  function handleSaveConfirm() {
    if (!selectedIso) return
    onSaveToCal(selectedIso, planTitle.trim())
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // ── Week view handlers ─────────────────────────────────────────────────────

  function prevWeek() {
    const newStart = addDays(weekStart, -7)
    setWeekStart(newStart)
    setSelectedWeekIso(dateToIso(newStart))
    setWeekPlans([])
  }

  function nextWeek() {
    const newStart = addDays(weekStart, 7)
    setWeekStart(newStart)
    setSelectedWeekIso(dateToIso(newStart))
    setWeekPlans([])
  }

  function handleWeekDayTap(iso: string) {
    if (iso === selectedWeekIso) return
    setWeekPlans([])
    setSelectedWeekIso(iso)
  }

  function handleLoadPlan(plan: PlanRow) {
    onLoadPlan(plan)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const cells = buildCalendarGrid(viewYear, viewMonth)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const iso = dateToIso(d)
    return { iso, dayLabel: DAY_LABELS[i], dayNum: d.getDate() }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  // Swipe-dismiss is disabled so the nested calendar-grid scroll doesn't fight
  // the sheet's drag handle. Re-enable in a follow-up after mobile QA.
  return (
    <BottomSheet visible={visible} onClose={handleClose} maxHeight="92vh" disableSwipeDismiss>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim">
            {mode === 'save' ? 'Add to Calendar' : 'View Calendar'}
          </p>
          {/* Week / Month toggle — browse mode only */}
          {mode === 'browse' && (
            <div className="flex items-center bg-bg-input border border-bg-border rounded-lg p-0.5">
              {(['week', 'month'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setViewMode(v)}
                  className={[
                    'px-3 py-1 rounded-md text-[11px] font-heading capitalize transition-colors',
                    viewMode === v
                      ? 'bg-accent-fire text-white'
                      : 'text-text-dim hover:text-text-muted',
                  ].join(' ')}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-4">

          {/* ──────────────────────────── WEEK VIEW ──────────────────────── */}
          {viewMode === 'week' && (
            <div className="pb-safe">
              {/* Week nav */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevWeek}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Previous week">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-xs font-heading text-text-dim">{formatWeekRange(weekStart)}</p>
                <button type="button" onClick={nextWeek}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
                  aria-label="Next week">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day strip */}
              <div className="grid grid-cols-7 gap-1 mb-5">
                {weekDays.map(({ iso, dayLabel, dayNum }) => {
                  const isSelected = iso === selectedWeekIso
                  const isToday = iso === todayIso
                  const hasPlan = datesWithPlans.has(iso)
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => handleWeekDayTap(iso)}
                      className={[
                        'flex flex-col items-center py-2.5 rounded-xl transition-all select-none',
                        isSelected
                          ? 'bg-accent-fire'
                          : isToday
                          ? 'border border-accent-fire/40'
                          : 'hover:bg-white/5 active:bg-white/10',
                      ].join(' ')}
                    >
                      <span className={[
                        'text-[10px] font-heading uppercase tracking-wide leading-none mb-1',
                        isSelected ? 'text-white/70' : 'text-text-dim',
                      ].join(' ')}>{dayLabel}</span>
                      <span className={[
                        'text-sm font-heading leading-none',
                        isSelected ? 'text-white' : isToday ? 'text-accent-fire' : 'text-text-muted',
                      ].join(' ')}>{dayNum}</span>
                      <span className={[
                        'w-1 h-1 rounded-full mt-1.5',
                        hasPlan ? (isSelected ? 'bg-white/70' : 'bg-accent-fire/60') : 'invisible',
                      ].join(' ')} />
                    </button>
                  )
                })}
              </div>

              {/* Plans for selected day */}
              {weekLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!weekLoading && weekPlans.length > 0 && (
                <div className="space-y-2 mb-4">
                  {weekPlans.length > 1 && (
                    <p className="text-[11px] text-text-dim px-0.5 mb-2">
                      {weekPlans.length} plans for {formatConfirmDate(selectedWeekIso)}
                    </p>
                  )}
                  {weekPlans.map(plan => (
                    <SavedPlanRow key={plan.id} plan={plan} onOpen={() => handleLoadPlan(plan)} />
                  ))}
                </div>
              )}

              {!weekLoading && weekPlans.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-text-dim/50">
                    {datesWithPlans.has(selectedWeekIso)
                      ? 'Loading…'
                      : `No plans saved for ${formatConfirmDate(selectedWeekIso)}`}
                  </p>
                </div>
              )}

              <button type="button" onClick={handleClose}
                className="mt-2 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2 pb-6">
                Cancel
              </button>
            </div>
          )}

          {/* ─────────────────────────── MONTH VIEW ─────────────────────── */}
          {viewMode === 'month' && (
            <div>
              {/* Month nav */}
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

              {/* Save mode: title input + confirm */}
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

              {/* Save mode: no date selected */}
              {mode === 'save' && !selectedIso && (
                <div className="mt-4 pb-6">
                  <p className="text-center text-xs text-text-dim py-2">Tap a date to schedule this plan</p>
                  <button type="button" onClick={handleClose}
                    className="mt-1 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                    Cancel
                  </button>
                </div>
              )}

              {/* Browse mode: loading */}
              {mode === 'browse' && browseLoading && (
                <div className="mt-4 flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Browse mode: plans for selected date */}
              {mode === 'browse' && !browseLoading && browsePlans.length > 0 && (
                <div className="mt-4 pb-6">
                  <p className="text-xs text-text-dim mb-3 text-center">
                    {browsePlans.length === 1
                      ? formatConfirmDate(selectedIso!)
                      : `${browsePlans.length} plans on ${formatConfirmDate(selectedIso!)}`}
                  </p>
                  <div className="space-y-2">
                    {browsePlans.map(plan => (
                      <SavedPlanRow
                        key={plan.id}
                        plan={plan}
                        onOpen={() => { onLoadPlan(plan); setVisible(false); setTimeout(onClose, 300) }}
                      />
                    ))}
                  </div>
                  <button type="button" onClick={handleClose}
                    className="mt-3 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                    Cancel
                  </button>
                </div>
              )}

              {/* Browse mode: no date selected */}
              {mode === 'browse' && !browseLoading && browsePlans.length === 0 && !selectedIso && (
                <div className="mt-4 pb-6">
                  <p className="text-center text-xs text-text-dim py-2">
                    Tap a highlighted date to view saved plans
                  </p>
                  <button type="button" onClick={handleClose}
                    className="mt-1 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </BottomSheet>
  )
}
