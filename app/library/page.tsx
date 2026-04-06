import Link from 'next/link'
import { Suspense } from 'react'
import { fetchAllFullClasses, fetchFolders, fetchComponents } from '@/app/lib/queries'
import ClassCard from '@/app/components/library/ClassCard'
import ClassFilters from '@/app/components/library/ClassFilters'
import FolderBar from '@/app/components/library/FolderBar'
import LibraryToggle from '@/app/components/library/LibraryToggle'
import ComponentCard from '@/app/components/library/ComponentCard'
import ComponentTypeFilter from '@/app/components/library/ComponentTypeFilter'
import type { FullClass } from '@/app/lib/database.types'

interface LibraryPageProps {
  searchParams: Promise<{ q?: string; age?: string; folder?: string; dateRange?: string; view?: string; ctype?: string }>
}

function getDateCutoff(range: string): string | null {
  const days = range === 'last7' ? 7 : range === 'last30' ? 30 : range === 'last90' ? 90 : 0
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function ClassList({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; age?: string; folder?: string; dateRange?: string; view?: string; ctype?: string }>
}) {
  const { q: rawQ, age: rawAge, folder: rawFolder, dateRange: rawDateRange } = await searchParams
  let classes: FullClass[] = []

  try {
    classes = await fetchAllFullClasses()
  } catch (err) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load classes</p>
        <p className="text-text-muted text-sm mt-2">
          Check your Supabase environment variables
        </p>
      </div>
    )
  }

  const q = rawQ?.toLowerCase() ?? ''
  const age = rawAge ?? ''
  const folder = rawFolder ?? ''
  const cutoff = getDateCutoff(rawDateRange ?? '')

  const filtered = classes.filter((cls) => {
    const matchesAge = !age || cls.age_group === age
    const matchesQ =
      !q ||
      (cls.title?.toLowerCase().includes(q) ?? false) ||
      (cls.notes?.toLowerCase().includes(q) ?? false)
    const matchesFolder = !folder || cls.folder_id === folder
    const matchesDate = !cutoff || cls.class_date >= cutoff
    return matchesAge && matchesQ && matchesFolder && matchesDate
  })

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🥷</div>
        <p className="font-heading text-text-muted text-lg">
          {classes.length === 0 ? 'No classes logged yet' : 'No matches found'}
        </p>
        {classes.length === 0 && (
          <p className="text-text-dim text-sm mt-2">
            Tap &quot;+ Log Class&quot; to add your first class
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filtered.map((cls) => (
        <ClassCard key={cls.id} cls={cls} showActions={true} />
      ))}
    </div>
  )
}

async function ComponentList({ activeType }: { activeType: string }) {
  let components = []

  try {
    components = await fetchComponents(activeType || undefined)
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load components</p>
        <p className="text-text-muted text-sm mt-2">
          Check your Supabase environment variables
        </p>
      </div>
    )
  }

  if (components.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🧩</div>
        <p className="font-heading text-text-muted text-lg">No components yet</p>
        <p className="text-text-dim text-sm mt-2">
          Tap &quot;+ Log&quot; to add your first component
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {components.map((c) => (
        <ComponentCard key={c.id} component={c} />
      ))}
    </div>
  )
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams
  const view = params.view === 'components' ? 'components' : 'classes'
  const activeType = params.ctype ?? ''
  const folders = await fetchFolders().catch(() => [])

  return (
    <div>
      {/* Page header */}
      <div className="relative flex items-center justify-between mb-5 pt-2">
        {/* Subtle brand gradient wash */}
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">
            Class Library
          </h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
        </div>
        <Link
          href={view === 'components' ? '/library/log-component' : '/library/new'}
          className="inline-flex items-center gap-1.5 bg-accent-fire text-white font-heading text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {view === 'components' ? 'Log' : 'Log Class'}
        </Link>
      </div>

      {/* Classes / Components toggle */}
      <div className="mb-4">
        <LibraryToggle view={view} />
      </div>

      {view === 'classes' ? (
        <>
          {/* Folder bar */}
          <div className="mb-4">
            <Suspense fallback={null}>
              <FolderBar folders={folders} />
            </Suspense>
          </div>

          {/* Filters */}
          <div className="mb-5">
            <Suspense fallback={null}>
              <ClassFilters />
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
            <ClassList searchParams={searchParams} />
          </Suspense>
        </>
      ) : (
        <>
          {/* Component type filter */}
          <div className="mb-5">
            <ComponentTypeFilter activeType={activeType} />
          </div>

          {/* Component list */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ComponentList activeType={activeType} />
          </Suspense>
        </>
      )}
    </div>
  )
}
