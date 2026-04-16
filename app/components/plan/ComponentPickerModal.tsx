'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import ComponentDetailSheet from '@/app/components/library/ComponentDetailSheet'
import ComponentCard from '@/app/components/library/ComponentCard'

type TabValue = ComponentType | 'custom'

const TYPE_FILTERS: { label: string; value: TabValue }[] = [
  { label: 'Stations', value: 'station' },
  { label: 'Games', value: 'game' },
  { label: 'Custom', value: 'custom' },
]

// Module-level variable so the last selected tab persists across modal open/close
let _lastTypeFilter: TabValue = 'station'

interface ComponentPickerModalProps {
  onSelect: (component: ComponentRow) => void
  onAdHocSelect: (title: string, description?: string, durationMinutes?: number) => void
  onClose: () => void
  existingIds?: Set<string>
}

// ── Main modal ────────────────────────────────────────────────

export default function ComponentPickerModal({ onSelect, onAdHocSelect, onClose, existingIds }: ComponentPickerModalProps) {
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TabValue>(_lastTypeFilter)
  const [curriculumFilter, setCurriculumFilter] = useState('')
  const [search, setSearch] = useState('')
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [mounted, setMounted] = useState(false)
  // Detail preview — delegated to the unified ComponentDetailSheet
  const [preview, setPreview] = useState<ComponentRow | null>(null)
  // Create Your Own state
  const [adHocTitle, setAdHocTitle] = useState('')
  const [adHocDescription, setAdHocDescription] = useState('')
  const [adHocDuration, setAdHocDuration] = useState<number | null>(null)
  const { voiceState, transcript, startRecording, stopRecording, parseComponent, reset: resetVoice, isSupported, errorMessage } = useVoiceNote()

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

  function handleTypeChange(tab: TabValue) {
    _lastTypeFilter = tab
    setTypeFilter(tab)
    setSearch('')
    if (tab !== 'custom') resetVoice()
  }

  async function handleMicToggle() {
    if (voiceState === 'idle' || voiceState === 'error' || voiceState === 'done') {
      resetVoice()
      setAdHocTitle('')
      setAdHocDescription('')
      setAdHocDuration(null)
      startRecording()
    } else if (voiceState === 'recording') {
      stopRecording()
      const result = await parseComponent('station', [])
      if (result.title) setAdHocTitle(result.title)
      if (result.description) setAdHocDescription(result.description)
      setAdHocDuration(result.durationMinutes ?? null)
    }
  }

  function handleAdHocAdd() {
    const t = adHocTitle.trim()
    if (!t) return
    onAdHocSelect(t, adHocDescription.trim() || undefined, adHocDuration ?? undefined)
    setAdHocTitle('')
    setAdHocDescription('')
    setAdHocDuration(null)
    resetVoice()
  }

  let filtered = components
  if (typeFilter !== 'custom') {
    filtered = filtered.filter((c) => c.type === (typeFilter as ComponentType))
    if (curriculumFilter) filtered = filtered.filter((c) => c.curriculum === curriculumFilter)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(q))
    }
  }

  function handleItemSelect(component: ComponentRow) {
    if (existingIds?.has(component.id)) return
    onSelect(component)
  }

  // ── Compact mic icon (matches PlanItemSheet) ────────────────────────
  const micIcon = () => {
    if (voiceState === 'recording') {
      return (
        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z"/>
        </svg>
      )
    }
    if (voiceState === 'processing') {
      return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    }
    if (voiceState === 'done') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    if (voiceState === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z"/>
      </svg>
    )
  }

  const micColors: Record<string, string> = {
    idle: 'bg-bg-input border border-bg-border text-text-muted hover:bg-white/5',
    recording: 'bg-accent-fire text-white shadow-glow-fire',
    processing: 'bg-bg-input border border-bg-border text-text-dim',
    done: 'bg-accent-green/20 border border-accent-green/40 text-accent-green',
    error: 'bg-red-900/30 border border-red-500/40 text-red-400',
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

      {/* Search + curriculum filter — hidden on Custom tab */}
      {typeFilter !== 'custom' && (
        <div className="px-4 pt-3 pb-3 flex-shrink-0 flex items-center gap-2 border-b border-bg-border/50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
          />
          <div className="relative flex-shrink-0">
            <select
              value={curriculumFilter}
              onChange={(e) => setCurriculumFilter(e.target.value)}
              className="appearance-none cursor-pointer bg-bg-input border border-bg-border rounded-xl pl-3 pr-7 py-2 text-sm text-text-muted focus:outline-none focus:border-accent-fire/50 transition-colors"
            >
              <option value="">All</option>
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
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Custom tab                                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {typeFilter === 'custom' ? (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-3">
          {/* Compact mic row — matches PlanItemSheet pattern */}
          {isSupported && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={voiceState === 'processing'}
                className={[
                  'w-11 h-11 flex items-center justify-center rounded-full transition-all flex-shrink-0',
                  micColors[voiceState],
                  voiceState === 'processing' ? 'cursor-not-allowed' : '',
                ].join(' ')}
                aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                {micIcon()}
              </button>
              <div className="flex-1 min-w-0">
                {voiceState === 'recording' && (
                  <p className="text-xs text-accent-fire animate-pulse">Listening… tap mic to stop</p>
                )}
                {voiceState === 'processing' && (
                  <p className="text-xs text-text-dim">Generating…</p>
                )}
                {voiceState === 'done' && (
                  <p className="text-xs text-accent-green">Filled ✓</p>
                )}
                {voiceState === 'error' && errorMessage && (
                  <p className="text-xs text-red-400">{errorMessage}</p>
                )}
                {voiceState === 'idle' && (
                  <p className="text-xs text-text-dim">Tap mic and describe the activity — or fill fields below</p>
                )}
              </div>
            </div>
          )}

          {/* Live transcript preview while recording */}
          {voiceState === 'recording' && transcript && (
            <p className="text-xs text-text-dim italic leading-relaxed px-1">
              &ldquo;{transcript}&rdquo;
            </p>
          )}

          {/* Title input */}
          <input
            type="text"
            value={adHocTitle}
            onChange={(e) => setAdHocTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleAdHocAdd() }}
            placeholder="Activity name…"
            className="w-full bg-bg-input border border-bg-border rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
          />

          {/* Description textarea */}
          <textarea
            value={adHocDescription}
            onChange={(e) => setAdHocDescription(e.target.value)}
            placeholder="Coaching cues… (optional)"
            rows={3}
            className="w-full bg-bg-input border border-bg-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors resize-none leading-relaxed"
          />

          {/* Duration chip — only shown if voice extracted one */}
          {adHocDuration && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-heading text-text-dim">Duration</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-fire/10 border border-accent-fire/20 rounded-full text-xs font-heading text-accent-fire">
                {adHocDuration} min
                <button
                  type="button"
                  onClick={() => setAdHocDuration(null)}
                  className="text-accent-fire/60 hover:text-accent-fire transition-colors"
                  aria-label="Clear duration"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
          )}

          {/* Add to Plan button */}
          <button
            type="button"
            onClick={handleAdHocAdd}
            disabled={!adHocTitle.trim()}
            className={[
              'mt-1 w-full py-3.5 rounded-xl font-heading text-base transition-all min-h-[52px]',
              adHocTitle.trim()
                ? 'bg-accent-fire text-white shadow-glow-fire active:scale-[0.98]'
                : 'bg-bg-card text-text-dim border border-bg-border cursor-not-allowed',
            ].join(' ')}
          >
            Add to plan
          </button>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════ */
        /* Library list                                                */
        /* ═══════════════════════════════════════════════════════════ */
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-heading text-text-muted">No components found</p>
              {(search || curriculumFilter) && (
                <p className="text-xs text-text-dim mt-1">Try clearing filters or search</p>
              )}
            </div>
          ) : (
            <div className="px-3 py-3 flex flex-col gap-2">
              {filtered.map((component) => {
                const inPlan = existingIds?.has(component.id) ?? false
                return (
                  <div
                    key={component.id}
                    className={inPlan ? 'opacity-60 pointer-events-none' : ''}
                  >
                    <ComponentCard
                      component={component}
                      onClick={inPlan ? undefined : () => setPreview(component)}
                      trailing={
                        inPlan ? (
                          <div className="flex items-center gap-1 text-accent-green">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-[10px] font-heading uppercase tracking-wide">In plan</span>
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Component detail sheet — unified editorial view ─────────── */}
      {preview && (
        <ComponentDetailSheet
          component={preview}
          onClose={() => setPreview(null)}
          onAdd={() => { handleItemSelect(preview); setPreview(null) }}
          isInPlan={existingIds?.has(preview.id) ?? false}
        />
      )}
    </div>
  )

  return createPortal(modal, document.body)
}
