import { Suspense } from 'react'
import { fetchHandoffClasses, fetchHandoffNotes } from '@/app/lib/queries'
import ClassCard from '@/app/components/library/ClassCard'
import ClassFilters from '@/app/components/library/ClassFilters'
import HandoffNotes from '@/app/components/handoff/HandoffNotes'
import type { FullClass } from '@/app/lib/database.types'

interface HandoffPageProps {
  searchParams: Promise<{ q?: string; age?: string; dateRange?: string }>
}

function getDateCutoff(range: string): string | null {
  const days = range === 'last7' ? 7 : range === 'last30' ? 30 : range === 'last90' ? 90 : 0
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function HandoffClassList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; age?: string; dateRange?: string }>
}) {
  const { q: rawQ, age: rawAge, dateRange: rawDateRange } = await searchParams
  let classes: FullClass[] = []

  try {
    classes = await fetchHandoffClasses()
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load classes</p>
      </div>
    )
  }

  const q = rawQ?.toLowerCase() ?? ''
  const age = rawAge ?? ''
  const cutoff = getDateCutoff(rawDateRange ?? '')

  const filtered = classes.filter((cls) => {
    const matchesAge = !age || cls.age_group === age
    const matchesQ =
      !q ||
      (cls.title?.toLowerCase().includes(q) ?? false) ||
      (cls.notes?.toLowerCase().includes(q) ?? false)
    const matchesDate = !cutoff || cls.class_date >= cutoff
    return matchesAge && matchesQ && matchesDate
  })

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📋</div>
        <p className="font-heading text-text-muted text-lg">
          {classes.length === 0 ? 'No classes on the board yet' : 'No matches found'}
        </p>
        {classes.length === 0 && (
          <p className="text-text-dim text-sm mt-2">
            From the Library, tap a class&apos;s pencil menu and choose &quot;Send to Handoff&quot;
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtered.map((cls) => (
        <ClassCard key={cls.id} cls={cls} showActions={false} showHandoffRemove={true} />
      ))}
    </div>
  )
}

export default async function HandoffPage({ searchParams }: HandoffPageProps) {
  const notes = await fetchHandoffNotes().catch(() => [])

  return (
    <div>
      {/* Page header */}
      <div className="mb-5 pt-2">
        <h1 className="font-heading text-2xl text-text-primary leading-none">
          Coach Handoff
        </h1>
        <p className="text-text-dim text-xs mt-1">
          Curated board for your team
        </p>
      </div>

      {/* Notes board */}
      <HandoffNotes initialNotes={notes} />

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-bg-border" />
        <span className="text-xs font-heading text-text-dim uppercase tracking-wider">Classes</span>
        <div className="h-px flex-1 bg-bg-border" />
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Suspense fallback={null}>
          <ClassFilters basePath="/handoff" />
        </Suspense>
      </div>

      {/* Class list */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <HandoffClassList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
