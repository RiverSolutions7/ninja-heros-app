import Link from 'next/link'
import { Suspense } from 'react'
import { fetchAllFullClasses, fetchComponents, countClasses, countComponents } from '@/app/lib/queries'
import ClassCard from '@/app/components/library/ClassCard'
import ClassFilters from '@/app/components/library/ClassFilters'
import LibraryToggle from '@/app/components/library/LibraryToggle'
import ComponentFilters from '@/app/components/library/ComponentFilters'
import ComponentListClient from '@/app/components/library/ComponentListClient'
import type { FullClass } from '@/app/lib/database.types'

interface LibraryPageProps {
  searchParams: Promise<{
    q?: string
    age?: string
    dateRange?: string
    view?: string
    ctype?: string
    ccurriculum?: string
    dismiss?: string
  }>
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
  searchParams: Promise<{
    q?: string
    age?: string
    dateRange?: string
    view?: string
    ctype?: string
    ccurriculum?: string
  }>
}) {
  const { q: rawQ, age: rawAge, dateRange: rawDateRange } = await searchParams
  let classes: FullClass[] = []

  try {
    classes = await fetchAllFullClasses()
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load classes</p>
        <p className="text-text-muted text-sm mt-2">Check your Supabase environment variables</p>
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
    <div className="-mx-4">
      {filtered.map((cls) => (
        <ClassCard key={cls.id} cls={cls} showActions={true} />
      ))}
    </div>
  )
}

async function ComponentList({
  activeType,
  activeCurriculum,
}: {
  activeType: string
  activeCurriculum: string
}) {
  let components = []

  try {
    components = await fetchComponents(activeType || undefined, activeCurriculum || undefined)
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load components</p>
        <p className="text-text-muted text-sm mt-2">Check your Supabase environment variables</p>
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

  return <ComponentListClient components={components} />
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams
  const view = params.view === 'classes' ? 'classes' : 'components'
  const activeType = params.ctype ?? ''
  const activeCurriculum = params.ccurriculum ?? ''

  // Welcome screen for first-run (no data yet)
  if (params.dismiss !== '1') {
    try {
      const [classCount, componentCount] = await Promise.all([countClasses(), countComponents()])
      if (classCount === 0 && componentCount === 0) {
        return (
          <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 -mt-4">
            {/* Branded header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-fire/15 mb-4">
                <svg className="w-8 h-8 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="font-heading text-2xl text-text-primary leading-tight">Ninja H.E.R.O.S.</h1>
              <p className="text-text-dim text-xs mt-1">Just Tumble · Coach Hub</p>
            </div>

            {/* Feature cards */}
            <div className="w-full max-w-sm space-y-3 mb-8">
              <div className="card flex items-center gap-3 p-4 border-l-4 border-accent-fire">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-fire/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm text-text-primary">Log Classes</p>
                  <p className="text-xs text-text-dim mt-0.5">Capture your class in 60 seconds</p>
                </div>
              </div>

              <div className="card flex items-center gap-3 p-4 border-l-4 border-accent-green">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm text-text-primary">Track Skills</p>
                  <p className="text-xs text-text-dim mt-0.5">See which skills need attention</p>
                </div>
              </div>

              <div className="card flex items-center gap-3 p-4 border-l-4 border-accent-blue">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-blue/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm text-text-primary">Share Plans</p>
                  <p className="text-xs text-text-dim mt-0.5">Send today&apos;s plan to coaches</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="w-full max-w-sm space-y-3 text-center">
              <Link
                href="/library/new"
                className="block w-full bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire text-center min-h-[52px]"
              >
                Log Your First Class
              </Link>
              <Link
                href="/library?dismiss=1"
                className="inline-block text-sm text-text-dim hover:text-text-muted transition-colors"
              >
                Explore the app
              </Link>
            </div>
          </div>
        )
      }
    } catch {
      // If count fails, fall through to normal library UI
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="relative flex items-center justify-between mb-5 pt-2">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">Class Library</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/library/new"
            className="text-sm text-text-dim hover:text-text-muted transition-colors underline underline-offset-2 min-h-[44px] flex items-center"
          >
            + Log Class
          </Link>
          <Link
            href="/library/log-component"
            className="inline-flex items-center gap-1.5 bg-accent-fire text-white font-heading text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log Component
          </Link>
        </div>
      </div>

      {/* Classes / Components toggle */}
      <div className="mb-4">
        <LibraryToggle view={view} />
      </div>

      {view === 'classes' ? (
        <>
          {/* Search + 3 filter dropdowns */}
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
          {/* 2 filter dropdowns */}
          <div className="mb-5">
            <Suspense fallback={null}>
              <ComponentFilters activeType={activeType} activeCurriculum={activeCurriculum} />
            </Suspense>
          </div>

          {/* Component list */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <ComponentList activeType={activeType} activeCurriculum={activeCurriculum} />
          </Suspense>
        </>
      )}
    </div>
  )
}
