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

interface ComponentFiltersProps {
  activeCurriculum: string
}

export default function ComponentFilters({ activeCurriculum }: ComponentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
      router.push(`/library?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex items-center gap-2">
      {/* Curriculum */}
      <div className="relative min-w-0" style={{ maxWidth: 220 }}>
        <select
          value={activeCurriculum}
          onChange={(e) => update('ccurriculum', e.target.value)}
          className={SELECT_CLS}
        >
          <option value="">All Curricula</option>
          {curriculums.map((c) => (
            <option key={c.age_group} value={c.age_group}>
              {c.label}
            </option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  )
}
