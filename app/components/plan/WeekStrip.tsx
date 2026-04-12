'use client'

import { useEffect, useRef } from 'react'

interface WeekStripProps {
  selectedDate: string        // ISO date string 'YYYY-MM-DD'
  todayIso: string            // today's ISO date string
  datesWithPlans: Set<string>
  onSelectDate: (iso: string) => void
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekStrip({ selectedDate, todayIso, datesWithPlans, onSelectDate }: WeekStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Build 29 days: today − 14 … today + 14
  const days = Array.from({ length: 29 }, (_, i) => {
    const iso = offsetDate(todayIso, i - 14)
    const d = new Date(iso + 'T00:00:00')
    return {
      iso,
      dayLabel: DAY_LABELS[d.getDay()],
      dateNum: d.getDate(),
    }
  })

  const selectedIdx = days.findIndex((d) => d.iso === selectedDate)

  // Scroll selected chip into centre view
  useEffect(() => {
    const container = scrollRef.current
    const chip = chipRefs.current[selectedIdx]
    if (!container || !chip) return
    const containerWidth = container.offsetWidth
    const chipLeft = chip.offsetLeft
    const chipWidth = chip.offsetWidth
    container.scrollTo({
      left: chipLeft - containerWidth / 2 + chipWidth / 2,
      behavior: 'smooth',
    })
  }, [selectedIdx])

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide border-b border-bg-border/50 flex-shrink-0"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {days.map((day, i) => {
        const isToday = day.iso === todayIso
        const isSelected = day.iso === selectedDate
        const hasPlan = datesWithPlans.has(day.iso)

        let chipClass = 'w-12 h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-all active:scale-95 relative '

        if (isSelected && isToday) {
          chipClass += 'bg-accent-fire text-white'
        } else if (isSelected) {
          chipClass += 'border-2 border-accent-fire text-text-primary bg-transparent'
        } else if (isToday) {
          chipClass += 'border border-accent-fire/40 text-accent-fire bg-transparent'
        } else {
          chipClass += 'border border-bg-border text-text-dim bg-transparent'
        }

        return (
          <button
            key={day.iso}
            ref={(el) => { chipRefs.current[i] = el }}
            type="button"
            onClick={() => onSelectDate(day.iso)}
            className={chipClass}
            aria-label={day.iso}
            aria-pressed={isSelected}
          >
            <span className="text-[10px] font-heading uppercase leading-none opacity-80">
              {day.dayLabel}
            </span>
            <span className="text-base font-heading leading-none">
              {day.dateNum}
            </span>
            {/* Dot indicator for days with plans (not shown when selected) */}
            {hasPlan && !isSelected && (
              <span className="absolute bottom-2 w-1 h-1 rounded-full bg-accent-fire opacity-70" />
            )}
          </button>
        )
      })}
    </div>
  )
}
