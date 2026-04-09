'use client'

import { useState } from 'react'
import type { ComponentRow } from '@/app/lib/database.types'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'

interface ComponentListClientProps {
  components: ComponentRow[]
}

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const [selected, setSelected] = useState<ComponentRow | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search
    ? components.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : components

  return (
    <>
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      <div className="bg-bg-card rounded-2xl overflow-hidden border border-bg-border -mx-0">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-dim text-sm">No components match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          filtered.map((c) => (
            <ComponentCard
              key={c.id}
              component={c}
              showMenu
              onClick={() => setSelected(c)}
            />
          ))
        )}
      </div>

      {selected && (
        <ComponentDetailSheet
          component={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
