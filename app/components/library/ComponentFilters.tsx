'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow } from '@/app/lib/database.types'
import ChoiceSheet, { type ChoiceOption } from '@/app/components/ui/ChoiceSheet'

interface ComponentFiltersProps {
  activeCurriculum: string
}

export default function ComponentFilters({ activeCurriculum }: ComponentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [open, setOpen] = useState(false)

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

  const options: ChoiceOption[] = [
    { value: '', label: 'All Curricula' },
    ...curriculums.map((c) => ({ value: c.age_group, label: c.label, sublabel: c.age_group })),
  ]

  const activeLabel =
    options.find((o) => o.value === activeCurriculum)?.label ?? 'All Curricula'

  return (
    <div className="flex items-center gap-2">
      {/* Trigger — matches the rest of the app's pill buttons */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-bg-input border border-bg-border rounded-xl pl-3 pr-2.5 py-2 text-xs text-text-muted hover:border-accent-fire/40 hover:text-text-primary transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <svg className="w-3 h-3 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ChoiceSheet
        visible={open}
        title="Filter by curriculum"
        options={options}
        selectedValue={activeCurriculum}
        onSelect={(v) => { update('ccurriculum', v); setOpen(false) }}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
