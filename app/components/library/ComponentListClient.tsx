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

  return (
    <>
      <div className="bg-bg-card rounded-2xl overflow-hidden border border-bg-border -mx-0">
        {components.map((c) => (
          <ComponentCard
            key={c.id}
            component={c}
            showMenu
            onClick={() => setSelected(c)}
          />
        ))}
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
