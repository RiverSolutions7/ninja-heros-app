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
      <div className="space-y-3">
        {components.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c)}
            className="w-full text-left active:scale-[0.98] transition-transform"
          >
            <ComponentCard component={c} showMenu />
          </button>
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
