'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const AGE_PILLS = [
  { label: 'All', value: '' },
  { label: 'Jr. Ninjas', value: 'Junior Ninjas (5-9)' },
  { label: 'Mini Ninjas', value: 'Mini Ninjas (3.5-5)' },
]

interface ClassFiltersProps {
  basePath?: string
}

export default function ClassFilters({ basePath = '/library' }: ClassFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const age = searchParams.get('age') ?? ''
  const dateRange = searchParams.get('dateRange') ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
  )

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search classes..."
          value={q}
          onChange={(e) => update('q', e.target.value)}
          className="field-input pl-10"
        />
      </div>

      {/* Age pills + Date dropdown on same row */}
      <div className="flex items-center gap-2">
        {/* Age group pills */}
        <div className="flex gap-1.5 flex-1">
          {AGE_PILLS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => update('age', value)}
              className={[
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                age === value
                  ? 'bg-accent-fire text-white shadow-glow-fire'
                  : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date range — pill-shaped select */}
        <div className="relative flex-shrink-0">
          <select
            value={dateRange}
            onChange={(e) => update('dateRange', e.target.value)}
            className="appearance-none cursor-pointer bg-bg-input border border-bg-border rounded-full pl-3 pr-7 py-1.5 text-xs text-text-muted focus:outline-none focus:border-accent-fire/50 transition-colors"
          >
            <option value="">All time</option>
            <option value="last7">Last 7d</option>
            <option value="last30">Last 30d</option>
            <option value="last90">Last 90d</option>
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
