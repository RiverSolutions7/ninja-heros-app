'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow } from '@/app/lib/database.types'

export default function CurriculumSelector({ basePath = '/program' }: { basePath?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get('curriculum')
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])

  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
  }, [])

  return (
    <div className="flex gap-2 mb-5">
      {curriculums.map((c) => {
        const active = current === c.id
        return (
          <button
            key={c.id}
            onClick={() => router.push(`${basePath}?curriculum=${c.id}`)}
            className={`flex-1 py-2 rounded-full text-sm font-heading transition-all duration-200 border ${
              active
                ? 'bg-accent-fire/10 border-accent-fire/50 text-accent-fire shadow-glow-fire'
                : 'bg-bg-card border-bg-border text-text-dim hover:border-accent-fire/30 hover:text-text-muted'
            }`}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
