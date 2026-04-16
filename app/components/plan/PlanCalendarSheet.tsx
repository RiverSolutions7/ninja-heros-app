'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlanRow } from '@/app/lib/database.types'
import { fetchPlansForDate } from '@/app/lib/planQueries'

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

function formatSavedAt(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Auto-generate a readable label from component types when plan has no title. */
function autoLabel(plan: PlanRow): string {
  if (plan.title) return plan.title
  const items = plan.items ?? []
  const stations = items.filter(i => i.component.type === 'station').length
  const games = items.filter(i => i.component.type === 'game').length
  const parts = [
    stations > 0 && `${stations} station${stations > 1 ? 's' : ''}`,
    games > 0 && `${games} game${games > 1 ? 's' : ''}`,
  ].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' · ') : 'Class Plan'
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
  onSaveToCal: (date: string, title: string) => void
  onLoadPlan: (plan: PlanRow) => void
  onClose: () => void
  /** Override the initial view. Defaults to 'week' for browse, 'month' for save. */
  defaultView?: ViewMode
  /** Pre-fill the plan title field with a value the coach already typed. */
  initialTitle?: string
}

type ViewMode = 'week' | 'month'

// ── Plan card used in both week and month browse views ────────────────────────

function PlanCard({ plan, onLoad }: { plan: PlanRow; onLoad: () => void }) {
  return (
    <button
      type="button"
      onClick={onLoad}
      className="w-full text-left bg-accent-fire/10 border border-accent-fire/25 rounded-2xl px-4 py-3.5 active:bg-accent-fire/20 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-sm text-text-primary leading-snug truncate flex-1">
          {autoLabel(plan)}
        </p>
        <svg className="w-4 h-4 text-accent-fire flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-[11px] text-text-dim mt-0.5">
        {(plan.items ?? []).length} component{(plan.items ?? []).length !== 1 ? 's' : ''}
        {plan.updated_at && (
          <span className="text-text-dim/50"> · saved {formatSavedAt(plan.updated_at)}</span>
        )}
      </p>
    </button>
  )
}

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
}: PlanCalendarSheetProps) {
  const today = new Date(todayIso + 'T00:00:00')

  // Shared
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView ?? (mode === 'browse' ? 'week' : 'month'))
  const [visible, setVisible] = useState(false)

  // Month view
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [planTitle, setPlanTitle] = useState(initialTitle)
  const [browsePlans, setBrowsePlans] = useState<PlanRow[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  // Week view
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(todayIso))
  const [selectedWeekIso, setSelectedWeekIso] = useState<string>(todayIso)
  const [weekPlans, setWeekPlans] = useState<PlanRow[]>([])
  const [weekLoading, setWeekLoading] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

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
      if (plans.length === 1) {
        onLoadPlan(plans[0])
        setVisible(false)
        setTimeout(onClose, 300)
        return
      }
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
        style={{ zIndex: 10000, maxHeight: '92vh', transform: visible ? 'translateY(0)' : 'translateY(100%)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

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
                    <PlanCard key={plan.id} plan={plan} onLoad={() => handleLoadPlan(plan)} />
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

              {/* Browse mode: multiple plans */}
              {mode === 'browse' && !browseLoading && browsePlans.length > 1 && (
                <div className="mt-4 pb-6">
                  <p className="text-xs text-text-dim mb-3 text-center">
                    {browsePlans.length} plans on {formatConfirmDate(selectedIso!)}
                  </p>
                  <div className="space-y-2">
                    {browsePlans.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onLoad={() => { onLoadPlan(plan); setVisible(false); setTimeout(onClose, 300) }}
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
                    Tap a highlighted date to load a saved plan
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
    </>
  )

  return createPortal(sheet, document.body)
}
