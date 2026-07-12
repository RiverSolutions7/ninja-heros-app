'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'
import EmptyState from '@/app/components/ui/EmptyState'
import ChoiceSheet, { type ChoiceOption } from '@/app/components/ui/ChoiceSheet'

interface ComponentListClientProps {
  components: ComponentRow[]
}

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const choiceOpen = searchParams.get('choice') === 'open'

  const [selected, setSelected] = useState<ComponentRow | null>(null)
  const [activeType, setActiveType] = useState<'all' | ComponentType>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  function dismissChoice() {
    router.replace('/library')
  }

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const validComponents = components.filter(c => c.type === 'station' || c.type === 'game')
  const stationCount = validComponents.filter(c => c.type === 'station').length
  const gameCount = validComponents.filter(c => c.type === 'game').length

  const FILTER_OPTIONS: ChoiceOption[] = [
    { value: 'all',     label: 'All Components', sublabel: 'Stations and games together', count: validComponents.length, dotClass: 'bg-accent-fire' },
    { value: 'station', label: 'Stations',        sublabel: 'Skill stations and circuits',  count: stationCount,          dotClass: 'bg-accent-blue' },
    { value: 'game',    label: 'Games',           sublabel: 'Group games and warm-ups',     count: gameCount,             dotClass: 'bg-accent-green' },
  ]

  const filtered = validComponents
    .filter(c => activeType === 'all' || c.type === activeType)
    .filter(c => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const filterLabel =
    activeType === 'all' ? 'All components' :
    activeType === 'station' ? 'Stations' : 'Games'

  function closeSearch() {
    setSearchOpen(false)
    setSearchQuery('')
  }

  function getEmptyTitle() {
    if (searchQuery) return `No results for "${searchQuery}"`
    if (activeType === 'station') return 'No stations logged yet'
    if (activeType === 'game') return 'No games logged yet'
    return 'No components yet'
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-4 min-h-[36px]">
        {searchOpen ? (
          <>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search components…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-dim outline-none"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="ml-3 p-1 text-text-dim active:text-text-muted transition-colors min-h-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-1.5 text-text-muted active:text-text-primary transition-colors min-h-0"
            >
              <span className="text-sm">{filterLabel} · {filtered.length}</span>
              <svg className="w-3.5 h-3.5 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-text-dim active:text-text-muted transition-colors min-h-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          compact
          title={getEmptyTitle()}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.10]">
          {filtered.map((c) => (
            <ComponentCard
              key={c.id}
              component={c}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {/* Type filter sheet */}
      <ChoiceSheet
        visible={filterOpen}
        title="Show"
        options={FILTER_OPTIONS}
        selectedValue={activeType}
        onSelect={(v) => { setActiveType(v as 'all' | ComponentType); setFilterOpen(false) }}
        onClose={() => setFilterOpen(false)}
      />

      {/* Detail sheet — tap any card to open */}
      {selected && (
        <ComponentDetailSheet
          component={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Logging choice overlay */}
      {choiceOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-end px-4"
          style={{
            background: 'rgba(8,12,26,0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          }}
          onClick={dismissChoice}
        >
          <div
            className="w-full max-w-sm flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Log One Component */}
            <button
              type="button"
              onClick={() => router.push('/log')}
              className="w-full text-left px-5 py-5 rounded-2xl bg-bg-card border border-white/[0.08] active:bg-white/[0.06] transition-colors"
            >
              <p className="font-heading text-text-primary text-[15px] tracking-wide uppercase">Log One Component</p>
              <p className="text-text-muted text-[12px] mt-1 leading-snug">Quick capture. One station, one game, one update.</p>
            </button>

            {/* Walkthrough My Gym */}
            <button
              type="button"
              onClick={() => router.push('/library/walkthrough')}
              className="w-full text-left px-5 py-5 rounded-2xl bg-bg-card border border-white/[0.08] active:bg-white/[0.06] transition-colors"
            >
              <p className="font-heading text-text-primary text-[15px] tracking-wide uppercase">Walkthrough My Gym</p>
              <p className="text-text-muted text-[12px] mt-1 leading-snug">Record multiple stations in one session. Best for setup days.</p>
            </button>
          </div>

        </div>
      )}
    </>
  )
}
