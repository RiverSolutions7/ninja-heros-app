'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'

const TYPE_FILTERS: { label: string; value: ComponentType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Warmup', value: 'warmup' },
  { label: 'Station', value: 'station' },
  { label: 'Game', value: 'game' },
]

const TYPE_DOT: Record<ComponentType, string> = {
  warmup: 'bg-accent-gold',
  station: 'bg-accent-blue',
  game: 'bg-accent-green',
}

const TYPE_LABEL: Record<ComponentType, string> = {
  warmup: 'Warmup',
  station: 'Station',
  game: 'Game',
}

interface ComponentPickerModalProps {
  onSelect: (component: ComponentRow) => void
  onClose: () => void
}

export default function ComponentPickerModal({ onSelect, onClose }: ComponentPickerModalProps) {
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ComponentType | 'all'>('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase
      .from('components')
      .select('*')
      .order('title')
      .then(({ data }) => {
        setComponents((data as ComponentRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = typeFilter === 'all'
    ? components
    : components.filter((c) => c.type === typeFilter)

  if (!mounted) return null

  const modal = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      className="bg-bg-primary flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-border flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="font-heading text-lg text-text-primary leading-none flex-1">
          Pick a Component
        </h2>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-bg-border flex-shrink-0">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-heading transition-all',
              typeFilter === f.value
                ? 'bg-accent-fire text-white shadow-glow-fire'
                : 'text-text-muted hover:text-text-primary hover:bg-white/5',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heading text-text-muted">No components found</p>
          </div>
        ) : (
          <ul>
            {filtered.map((component) => (
              <li key={component.id}>
                <button
                  type="button"
                  onClick={() => onSelect(component)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-bg-border/50 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  <span className={['w-2.5 h-2.5 rounded-full flex-shrink-0', TYPE_DOT[component.type]].join(' ')} />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-text-primary text-sm truncate">{component.title}</p>
                    {component.curriculum && (
                      <p className="text-text-dim text-xs mt-0.5 truncate">{component.curriculum}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {component.duration_minutes && (
                      <span className="text-xs text-text-dim">{component.duration_minutes}m</span>
                    )}
                    <span className="text-xs text-text-dim font-medium">{TYPE_LABEL[component.type]}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
