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
  const [selected, setSelected] = useState<ComponentRow | null>(null)
  const [activeType, setActiveType] = useState<ComponentType>('station')

  const filtered = components.filter((c) => c.type === activeType)

  const countLabel = filtered.length === 1
    ? `1 ${activeType === 'station' ? 'STATION' : 'GAME'}`
    : `${filtered.length} ${activeType === 'station' ? 'STATIONS' : 'GAMES'}`

  return (
    <>
      {/* Type sub-tabs */}
      <div className="flex border-b border-bg-border mb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveType(tab.type)}
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

      {/* Count label */}
      <p className="section-label mb-3">{countLabel}</p>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          compact
          title={EMPTY_MESSAGES[activeType]}
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
