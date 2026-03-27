'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CURRICULUMS } from '@/app/lib/curriculums'

export default function CurriculumSelector() {
  const router = useRouter()
  const params = useSearchParams()
  const current = params.get('curriculum')

  return (
    <div className="flex gap-2 mb-5">
      {CURRICULUMS.map((c) => {
        const active = current === c.id
        return (
          <button
            key={c.id}
            onClick={() => router.push(`/skills?curriculum=${c.id}`)}
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
