import Link from 'next/link'
import { Suspense } from 'react'
import { fetchComponents, countComponents } from '@/app/lib/queries'
import ComponentListClient from '@/app/components/library/ComponentListClient'

interface LibraryPageProps {
  searchParams: Promise<{
    dismiss?: string
  }>
}

async function ComponentList() {
  let components = []

  try {
    components = await fetchComponents()
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
        <p className="font-heading text-text-muted text-lg">No components yet</p>
        <p className="text-text-dim text-sm mt-2">
          Tap &quot;+&quot; to add your first game or station
        </p>
      </div>
    )
  }

  return <ComponentListClient components={components} />
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams

  // Welcome screen for first-run (no components yet)
  if (params.dismiss !== '1') {
    try {
      const componentCount = await countComponents()
      if (componentCount === 0) {
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
                  <p className="font-heading text-sm text-text-primary">Log Components</p>
                  <p className="text-xs text-text-dim mt-0.5">Add games and stations</p>
                </div>
              </div>

              <div className="card flex items-center gap-3 p-4 border-l-4 border-accent-fire">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-fire/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm text-text-primary">Track Skills</p>
                  <p className="text-xs text-text-dim mt-0.5">See which skills need attention</p>
                </div>
              </div>

              <div className="card flex items-center gap-3 p-4 border-l-4 border-accent-fire">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-fire/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm text-text-primary">Plan Classes</p>
                  <p className="text-xs text-text-dim mt-0.5">Build plans in Today&apos;s Plan tab</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="w-full max-w-sm space-y-3 text-center">
              <Link
                href="/log"
                className="block w-full bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire text-center min-h-[52px]"
              >
                Log Your First Component
              </Link>
              <Link
                href="/library?dismiss=1"
                className="inline-block text-sm text-text-dim hover:text-text-muted transition-colors"
              >
                Skip for now
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
      <div className="mb-7 pt-4">
        <h1
          className="font-heading uppercase text-text-primary"
          style={{ fontSize: 'clamp(32px, 9.5vw, 36px)', lineHeight: 1.1 }}
        >
          <span className="block">Component</span>
          <span className="block">Library</span>
        </h1>
      </div>

      {/* Component list */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ComponentList />
      </Suspense>
    </div>
  )
}
