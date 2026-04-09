'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow } from '@/app/lib/database.types'

const SELECT_CLS =
  'appearance-none cursor-pointer w-full bg-bg-input border border-bg-border rounded-xl pl-3 pr-7 py-2 text-xs text-text-muted focus:outline-none focus:border-accent-fire/50 transition-colors'

const Chevron = () => (
  <svg
    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

interface ClassFiltersProps {
  basePath?: string
}

export default function ClassFilters({ basePath = '/library' }: ClassFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const age = searchParams.get('age') ?? ''
  const dateRange = searchParams.get('dateRange') ?? ''

  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])

  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
  }, [])

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
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

      {/* 2 dropdowns in one row */}
      <div className="flex items-center gap-2">
        {/* Curriculum */}
        <div className="relative flex-1 min-w-0">
          <select
            value={age}
            onChange={(e) => update('age', e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Curriculum</option>
            {curriculums.map((c) => (
              <option key={c.age_group} value={c.age_group}>
                {c.label}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        {/* Date */}
        <div className="relative flex-1 min-w-0">
          <select
            value={dateRange}
            onChange={(e) => update('dateRange', e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">All Time</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
          </select>
          <Chevron />
        </div>
      </div>
    </div>
  )
}
