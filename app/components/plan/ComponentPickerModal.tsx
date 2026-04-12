'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'

const TYPE_FILTERS: { label: string; value: ComponentType }[] = [
  { label: 'Warmups', value: 'warmup' },
  { label: 'Stations', value: 'station' },
  { label: 'Games', value: 'game' },
]

const TYPE_PLACEHOLDER: Record<ComponentType, string> = {
  warmup: 'bg-accent-gold/20',
  station: 'bg-accent-blue/20',
  game: 'bg-accent-green/20',
}

const TYPE_LABEL: Record<ComponentType, string> = {
  warmup: 'Warmup',
  station: 'Station',
  game: 'Game',
}

interface ComponentPickerModalProps {
  onSelect: (component: ComponentRow) => void
  onClose: () => void
  existingIds?: Set<string>
}

// ── Main modal ────────────────────────────────────────────────

export default function ComponentPickerModal({ onSelect, onClose, existingIds }: ComponentPickerModalProps) {
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ComponentType>('warmup')
  const [curriculumFilter, setCurriculumFilter] = useState('')
  const [search, setSearch] = useState('')
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [mounted, setMounted] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

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
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
  }, [])

  let filtered = components
  filtered = filtered.filter((c) => c.type === typeFilter)
  if (curriculumFilter) filtered = filtered.filter((c) => c.curriculum === curriculumFilter)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(q))
  }

  function handleItemSelect(component: ComponentRow) {
    if (existingIds?.has(component.id)) return
    onSelect(component)
  }

  function handlePhotoTap(e: React.MouseEvent, photos: string[]) {
    e.stopPropagation() // don't trigger the row's onSelect
    setLightbox({ photos, index: 0 })
  }

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
        <button
          type="button"
          onClick={onClose}
          className="font-heading text-sm text-accent-fire px-3 py-1.5 rounded-lg hover:bg-accent-fire/10 transition-colors"
        >
          Done
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      {/* Type sub-tabs */}
      <div className="flex border-b border-bg-border flex-shrink-0">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => { setTypeFilter(f.value); setSearch('') }}
            className={[
              'flex-1 py-2.5 text-sm font-heading transition-colors',
              typeFilter === f.value
                ? 'text-text-primary border-b-2 border-accent-fire -mb-px'
                : 'text-text-dim hover:text-text-muted',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Curriculum filter */}
      <div className="px-4 py-2 border-b border-bg-border flex-shrink-0">
        <div className="relative">
          <select
            value={curriculumFilter}
            onChange={(e) => setCurriculumFilter(e.target.value)}
            className="w-full appearance-none cursor-pointer bg-bg-input border border-bg-border rounded-lg pl-3 pr-7 py-2 text-sm text-text-muted focus:outline-none focus:border-accent-fire/50 transition-colors"
          >
            <option value="">All Curriculums</option>
            {curriculums.map((c) => (
              <option key={c.age_group} value={c.age_group}>{c.label}</option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
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
            {filtered.map((component) => {
              const inPlan = existingIds?.has(component.id) ?? false
              const photos = (component.photos ?? []).filter(Boolean)
              const hasPhoto = photos.length > 0
              const extraCount = photos.length - 1

              return (
                <li
                  key={component.id}
                  className={[
                    'flex items-center gap-3 px-4 border-b border-bg-border/50 transition-colors',
                    inPlan ? 'bg-accent-green/5' : '',
                  ].join(' ')}
                >
                  {/* Thumbnail — always tappable, lives outside the selection button */}
                  <div className="relative flex-shrink-0 py-3.5">
                    <button
                      type="button"
                      onClick={(e) => hasPhoto && handlePhotoTap(e, photos)}
                      className={[
                        'w-14 h-14 rounded-xl overflow-hidden block',
                        TYPE_PLACEHOLDER[component.type],
                        hasPhoto ? 'cursor-pointer active:opacity-75 transition-opacity' : 'cursor-default',
                      ].join(' ')}
                      tabIndex={hasPhoto ? 0 : -1}
                      aria-label={hasPhoto ? `View photos of ${component.title}` : undefined}
                    >
                      {hasPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photos[0]} alt={component.title} className="w-full h-full object-cover" />
                      ) : null}
                    </button>
                    {extraCount > 0 && (
                      <span className="absolute bottom-4 right-0 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
                        +{extraCount}
                      </span>
                    )}
                  </div>

                  {/* Row content — selection button (disabled when in plan) */}
                  <button
                    type="button"
                    onClick={() => handleItemSelect(component)}
                    disabled={inPlan}
                    className={[
                      'flex-1 flex items-center gap-2 py-3.5 text-left min-w-0 transition-colors',
                      inPlan ? 'cursor-default' : 'hover:opacity-80 active:opacity-60',
                    ].join(' ')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={['font-heading text-sm truncate', inPlan ? 'text-text-dim' : 'text-text-primary'].join(' ')}>
                        {component.title}
                      </p>
                      {component.curriculum && (
                        <p className="text-text-dim text-xs mt-0.5 truncate">{component.curriculum}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {inPlan ? (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-xs text-accent-green font-heading">In plan</span>
                        </div>
                      ) : (
                        <>
                          {component.duration_minutes && (
                            <span className="text-xs text-text-dim">{component.duration_minutes}m</span>
                          )}
                          <span className="text-xs text-text-dim font-medium">{TYPE_LABEL[component.type]}</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Photo lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )

  return createPortal(modal, document.body)
}
