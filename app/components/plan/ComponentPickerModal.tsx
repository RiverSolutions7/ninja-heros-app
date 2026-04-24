'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import ComponentDetailSheet from '@/app/components/library/ComponentDetailSheet'
import ComponentCard from '@/app/components/library/ComponentCard'
import ChoiceSheet, { type ChoiceOption } from '@/app/components/ui/ChoiceSheet'

const TYPE_FILTERS: { label: string; value: ComponentType }[] = [
  { label: 'Stations', value: 'station' },
  { label: 'Games', value: 'game' },
]

// Module-level variable so the last selected tab persists across modal open/close
let _lastTypeFilter: ComponentType = 'station'

interface ComponentPickerModalProps {
  onSelect: (component: ComponentRow) => void
  onClose: () => void
  existingIds?: Set<string>
}

// ── Main modal ────────────────────────────────────────────────

export default function ComponentPickerModal({ onSelect, onClose, existingIds }: ComponentPickerModalProps) {
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ComponentType>(_lastTypeFilter)
  const [curriculumFilter, setCurriculumFilter] = useState('')
  const [curriculumSheetOpen, setCurriculumSheetOpen] = useState(false)
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [mounted, setMounted] = useState(false)
  const [preview, setPreview] = useState<ComponentRow | null>(null)

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

  function handleTypeChange(tab: ComponentType) {
    _lastTypeFilter = tab
    setTypeFilter(tab)
  }

  const filtered = components
    .filter((c) => c.type === typeFilter)
    .filter((c) => !curriculumFilter || c.curriculum === curriculumFilter)

  function handleItemSelect(component: ComponentRow) {
    if (existingIds?.has(component.id)) return
    onSelect(component)
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
          Add to plan
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="font-heading text-sm text-accent-fire px-3 py-1.5 rounded-lg hover:bg-accent-fire/10 transition-colors"
        >
          Done
        </button>
      </div>

      {/* Type sub-tabs */}
      <div className="flex border-b border-bg-border flex-shrink-0">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleTypeChange(f.value)}
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
      <div className="px-4 pt-3 pb-3 flex-shrink-0 flex items-center gap-2 border-b border-bg-border/50">
        <button
          type="button"
          onClick={() => setCurriculumSheetOpen(true)}
          className="inline-flex items-center gap-1.5 bg-bg-input border border-bg-border rounded-xl pl-3 pr-2.5 py-2 text-sm text-text-muted hover:border-accent-fire/40 hover:text-text-primary transition-colors"
          aria-haspopup="dialog"
          aria-expanded={curriculumSheetOpen}
        >
          <span className="whitespace-nowrap">{curriculums.find((c) => c.age_group === curriculumFilter)?.label ?? 'All curricula'}</span>
          <svg className="w-3.5 h-3.5 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Library list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-heading text-text-muted">No components found</p>
            {curriculumFilter && (
              <p className="text-xs text-text-dim mt-1">Try clearing the curriculum filter</p>
            )}
          </div>
        ) : (
          <div className="px-3 py-3 flex flex-col gap-2">
            {filtered.map((component) => {
              const inPlan = existingIds?.has(component.id) ?? false
              return (
                <div key={component.id} className="flex items-stretch gap-2">
                  {/* Card body — taps to preview */}
                  <div className="flex-1 min-w-0">
                    <ComponentCard
                      component={component}
                      onClick={() => setPreview(component)}
                    />
                  </div>
                  {/* Add / in-plan toggle button */}
                  <button
                    type="button"
                    onClick={inPlan ? undefined : () => handleItemSelect(component)}
                    className={[
                      'flex-shrink-0 w-11 flex items-center justify-center rounded-xl border transition-all',
                      inPlan
                        ? 'border-accent-green/30 text-accent-green bg-accent-green/10 cursor-default'
                        : 'border-bg-border text-text-dim hover:border-accent-fire/50 hover:text-accent-fire active:scale-95',
                    ].join(' ')}
                    aria-label={inPlan ? 'Already in plan' : `Add ${component.title} to plan`}
                  >
                    {inPlan ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Component detail sheet — no onAdd so the CTA is hidden in picker context */}
      {preview && (
        <ComponentDetailSheet
          component={preview}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Curriculum choice sheet */}
      <ChoiceSheet
        visible={curriculumSheetOpen}
        title="Filter by curriculum"
        options={[
          { value: '', label: 'All curricula' },
          ...curriculums.map<ChoiceOption>((c) => ({ value: c.age_group, label: c.label, sublabel: c.age_group })),
        ]}
        selectedValue={curriculumFilter}
        onSelect={(v) => { setCurriculumFilter(v); setCurriculumSheetOpen(false) }}
        onClose={() => setCurriculumSheetOpen(false)}
      />
    </div>
  )

  return createPortal(modal, document.body)
}
