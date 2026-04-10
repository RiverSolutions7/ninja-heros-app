'use client'

import { useState } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'

interface ComponentListClientProps {
  components: ComponentRow[]
}

const SUB_TABS: { type: ComponentType; label: string }[] = [
  { type: 'game', label: 'Games' },
  { type: 'warmup', label: 'Warmups' },
  { type: 'station', label: 'Stations' },
]

const EMPTY_MESSAGES: Record<ComponentType, string> = {
  game: 'No games logged yet',
  warmup: 'No warmups logged yet',
  station: 'No stations logged yet',
}

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const [selected, setSelected] = useState<ComponentRow | null>(null)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<ComponentType>('game')

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
            className={`flex-1 py-2.5 text-sm font-heading transition-colors ${
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
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-dim text-sm">
            {search ? `No results for "${search}"` : EMPTY_MESSAGES[activeType]}
          </p>
        </div>
      ) : (
        <div>
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

      {selected && (
        <ComponentDetailSheet
          component={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
