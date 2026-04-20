'use client'

import { useState } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'
import EmptyState from '@/app/components/ui/EmptyState'

interface ComponentListClientProps {
  components: ComponentRow[]
}

const SUB_TABS: { type: ComponentType; label: string }[] = [
  { type: 'station', label: 'Stations' },
  { type: 'game',   label: 'Games'    },
]

const EMPTY_MESSAGES: Record<ComponentType, string> = {
  game:    'No games logged yet',
  station: 'No stations logged yet',
}

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const [selected,   setSelected]   = useState<ComponentRow | null>(null)
  const [search,     setSearch]     = useState('')
  const [activeType, setActiveType] = useState<ComponentType>('station')

  const filtered = components
    .filter((c) => c.type === activeType)
    .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {/* Type sub-tabs */}
      <div className="flex border-b border-bg-border mb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => { setActiveType(tab.type); setSearch('') }}
            className={`flex-1 py-3 text-sm font-heading transition-colors min-h-[44px] active:bg-white/5 ${
              activeType === tab.type
                ? 'text-text-primary border-b-2 border-accent-fire -mb-px'
                : 'text-text-dim hover:text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${SUB_TABS.find((t) => t.type === activeType)?.label.toLowerCase()}...`}
          aria-label={`Search ${activeType}s`}
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          compact
          title={search ? `No results for "${search}"` : EMPTY_MESSAGES[activeType]}
          icon={search ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <ComponentCard
              key={c.id}
              component={c}
              showMenu
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

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
