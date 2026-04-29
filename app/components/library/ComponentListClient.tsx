'use client'

import { useState, useRef, useEffect } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'
import EmptyState from '@/app/components/ui/EmptyState'
import ChoiceSheet, { type ChoiceOption } from '@/app/components/ui/ChoiceSheet'

interface ComponentListClientProps {
  components: ComponentRow[]
}

const FILTER_OPTIONS: ChoiceOption[] = [
  { value: 'all',     label: 'All' },
  { value: 'station', label: 'Stations' },
  { value: 'game',    label: 'Games' },
]

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const [selected, setSelected] = useState<ComponentRow | null>(null)
  const [activeType, setActiveType] = useState<'all' | ComponentType>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const filtered = components
    .filter(c => c.type === 'station' || c.type === 'game')
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
              <span className="font-heading text-sm">{filterLabel} · {filtered.length}</span>
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
        <div className="flex flex-col gap-2">
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
    </>
  )
}
