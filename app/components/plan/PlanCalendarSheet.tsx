'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// ── Calendar helpers ──────────────────────────────────────────────────────────

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-first: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7
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

// ── Component ─────────────────────────────────────────────────────────────────

interface PlanCalendarSheetProps {
  /** 'save' = pick a date to save the plan to; 'browse' = pick a date to load a saved plan */
  mode: 'save' | 'browse'
  todayIso: string
  currentPlanDate: string | null
  datesWithPlans: Set<string>
  onConfirmDate: (date: string) => void
  onClose: () => void
}

export function PlanCalendarSheet({
  mode,
  todayIso,
  currentPlanDate,
  datesWithPlans,
  onConfirmDate,
  onClose,
}: PlanCalendarSheetProps) {
  const today = new Date(todayIso + 'T00:00:00')
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
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
    setSelectedIso(null)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedIso(null)
  }

  function handleDayTap(iso: string) {
    // In browse mode, only selectable days are those with plans
    if (mode === 'browse' && !datesWithPlans.has(iso)) return
    setSelectedIso(prev => prev === iso ? null : iso)
  }

  function handleConfirm() {
    if (!selectedIso) return
    onConfirmDate(selectedIso)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const cells = buildCalendarGrid(viewYear, viewMonth)
  const isOverwriting = mode === 'save' && !!selectedIso && datesWithPlans.has(selectedIso) && selectedIso !== currentPlanDate

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

        {/* Sheet label */}
        <p className="text-center text-[11px] font-heading uppercase tracking-wider text-text-dim px-4 pb-3 flex-shrink-0">
          {mode === 'save' ? 'Save to Calendar' : 'View Calendar'}
        </p>

        <div className="overflow-y-auto flex-1 px-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="font-heading text-base text-text-primary">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
              aria-label="Next month"
            >
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
              const isSavedDate = iso === currentPlanDate
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
                      : isSavedDate
                      ? 'bg-accent-fire/20 border border-accent-fire/40'
                      : isToday
                      ? 'border border-accent-fire/40'
                      : isInteractive
                      ? 'hover:bg-white/5 active:bg-white/10'
                      : 'opacity-35 cursor-default',
                  ].join(' ')}
                  aria-label={`${day} ${MONTH_NAMES[viewMonth]}`}
                >
                  <span className={[
                    'text-sm font-heading leading-none',
                    isSelected
                      ? 'text-white'
                      : isToday || isSavedDate
                      ? 'text-accent-fire'
                      : hasPlan
                      ? 'text-text-primary'
                      : 'text-text-muted',
                  ].join(' ')}>
                    {day}
                  </span>
                  {/* Plan dot */}
                  <span className={[
                    'w-1 h-1 rounded-full mt-1',
                    hasPlan
                      ? isSelected ? 'bg-white/70' : 'bg-accent-fire/60'
                      : 'invisible',
                  ].join(' ')} />
                </button>
              )
            })}
          </div>

          {/* Confirm area */}
          <div className="mt-5 pb-6">
            {isOverwriting && selectedIso && (
              <p className="text-xs text-accent-fire/80 text-center mb-2 leading-relaxed">
                Overwrites the existing plan for {formatConfirmDate(selectedIso)}
              </p>
            )}

            {selectedIso ? (
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full bg-accent-fire text-white font-heading text-base py-3.5 rounded-xl shadow-glow-fire active:scale-[0.98] transition-all min-h-[52px]"
              >
                {mode === 'save'
                  ? `Save to ${formatConfirmDate(selectedIso)}`
                  : `Load ${formatConfirmDate(selectedIso)}`}
              </button>
            ) : (
              <p className="text-center text-xs text-text-dim py-2">
                {mode === 'browse'
                  ? 'Tap a highlighted date to load a saved plan'
                  : 'Tap a date to save your plan there'}
              </p>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="mt-2 w-full text-sm text-text-dim/50 hover:text-text-dim transition-colors py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}
