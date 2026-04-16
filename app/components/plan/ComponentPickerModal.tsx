'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import ComponentDetailSheet from '@/app/components/library/ComponentDetailSheet'

type TabValue = ComponentType | 'custom'

const TYPE_FILTERS: { label: string; value: TabValue }[] = [
  { label: 'Stations', value: 'station' },
  { label: 'Games', value: 'game' },
  { label: 'Create Your Own', value: 'custom' },
]

const TYPE_PLACEHOLDER: Record<ComponentType, string> = {
  station: 'bg-accent-blue/20',
  game: 'bg-accent-green/20',
}

const TYPE_ICON_COLOR: Record<ComponentType, string> = {
  station: 'text-accent-blue',
  game: 'text-accent-green',
}

const TYPE_ICONS: Record<ComponentType, React.ReactNode> = {
  game: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  station: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
}

const TYPE_LABEL: Record<ComponentType, string> = {
  station: 'Station',
  game: 'Game',
}

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
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  // Detail preview — delegated to the unified ComponentDetailSheet
  const [preview, setPreview] = useState<ComponentRow | null>(null)
  // Create Your Own state
  const [adHocTitle, setAdHocTitle] = useState('')
  const [adHocDescription, setAdHocDescription] = useState('')
  const [adHocDuration, setAdHocDuration] = useState<number | null>(null)
  const { voiceState, transcript, startRecording, stopRecording, parseComponent, reset: resetVoice } = useVoiceNote()

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

  function handlePhotoTap(e: React.MouseEvent, photos: string[]) {
    e.stopPropagation()
    setLightbox({ photos, index: 0 })
  }

  function openPreview(e: React.MouseEvent, component: ComponentRow) {
    e.stopPropagation()
    setPreview(component)
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

      {/* Search — hidden on Create Your Own tab */}
      {typeFilter !== 'custom' && (
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
          />
        </div>
      )}

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

      {/* Curriculum filter — hidden on Create Your Own tab */}
      {typeFilter !== 'custom' && (
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
      )}

      {/* List — hidden on Create Your Own tab */}
      {typeFilter === 'custom' ? (
        /* ── Create Your Own UI ─────────────────────────────────── */
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-6 pt-8 pb-6 gap-5">
          {/* Mic button */}
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={voiceState === 'processing'}
            className={[
              'w-20 h-20 rounded-full flex items-center justify-center transition-all flex-shrink-0',
              voiceState === 'recording'
                ? 'bg-accent-fire text-white shadow-lg shadow-accent-fire/30 scale-110 animate-pulse'
                : voiceState === 'processing'
                ? 'bg-bg-card border-2 border-bg-border text-text-dim cursor-not-allowed'
                : 'bg-bg-card border-2 border-bg-border text-text-dim hover:border-accent-fire/50 hover:text-accent-fire',
            ].join(' ')}
            aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start recording'}
          >
            {voiceState === 'processing' ? (
              <div className="w-6 h-6 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Status label */}
          {voiceState === 'recording' && (
            <p className="text-xs text-accent-fire font-heading animate-pulse -mt-2">Listening…</p>
          )}
          {voiceState === 'processing' && (
            <p className="text-xs text-text-dim font-heading -mt-2">Generating…</p>
          )}
          {voiceState === 'idle' && (
            <p className="text-xs text-text-dim/50 -mt-2">Tap mic and describe the activity</p>
          )}

          {/* Live transcript preview */}
          {voiceState === 'recording' && transcript && (
            <p className="text-xs text-text-dim italic text-center leading-relaxed -mt-2">{transcript}</p>
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
            <div className="w-full flex items-center gap-2">
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
              'w-full py-3.5 rounded-xl font-heading text-sm transition-all',
              adHocTitle.trim()
                ? 'bg-accent-fire text-white hover:opacity-90 active:opacity-75'
                : 'bg-bg-card text-text-dim border border-bg-border cursor-not-allowed',
            ].join(' ')}
          >
            Add to Plan
          </button>
        </div>
      ) : (
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
                    {/* Thumbnail */}
                    {(() => {
                      const hasVideoFile = !!component.video_url
                      const hasVideoLink = !!component.video_link
                      const isInteractive = hasPhoto || hasVideoFile || hasVideoLink
                      function handleThumbClick(e: React.MouseEvent) {
                        e.stopPropagation()
                        if (hasPhoto) handlePhotoTap(e, photos)
                        else if (hasVideoFile) setVideoPreview(component.video_url!)
                        else if (hasVideoLink) window.open(component.video_link!, '_blank', 'noopener,noreferrer')
                      }
                      return (
                        <div className="relative flex-shrink-0 py-3.5">
                          <button
                            type="button"
                            onClick={isInteractive ? handleThumbClick : undefined}
                            className={[
                              'w-14 h-14 rounded-xl overflow-hidden block',
                              isInteractive ? 'cursor-pointer active:opacity-75 transition-opacity' : 'cursor-default',
                            ].join(' ')}
                            tabIndex={isInteractive ? 0 : -1}
                            aria-label={
                              hasPhoto ? `View photos of ${component.title}` :
                              hasVideoFile ? `Watch video of ${component.title}` :
                              hasVideoLink ? `Open video link for ${component.title}` :
                              undefined
                            }
                          >
                            {hasPhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photos[0]} alt={component.title} className="w-full h-full object-cover" />
                            ) : hasVideoFile || hasVideoLink ? (
                              <div className="w-full h-full flex items-center justify-center bg-black/60">
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5.14v14l11-7-11-7z" />
                                </svg>
                              </div>
                            ) : (
                              <div className={['w-full h-full flex items-center justify-center', TYPE_PLACEHOLDER[component.type]].join(' ')}>
                                <span className={TYPE_ICON_COLOR[component.type]}>
                                  {TYPE_ICONS[component.type]}
                                </span>
                              </div>
                            )}
                          </button>
                          {extraCount > 0 && (
                            <span className="absolute bottom-4 right-0 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
                              +{extraCount}
                            </span>
                          )}
                          {/* Play overlay badge when there's both a photo and a video */}
                          {hasPhoto && (hasVideoFile || hasVideoLink) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (hasVideoFile) setVideoPreview(component.video_url!)
                                else window.open(component.video_link!, '_blank', 'noopener,noreferrer')
                              }}
                              className="absolute bottom-4 right-0 bg-black/70 hover:bg-black/90 text-white rounded p-0.5 transition-colors"
                              aria-label={`Watch video of ${component.title}`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5.14v14l11-7-11-7z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })()}

                    {/* Row content — tap to open detail preview */}
                    <button
                      type="button"
                      onClick={(e) => openPreview(e, component)}
                      className="flex-1 flex items-center gap-2 py-3.5 text-left min-w-0 hover:opacity-80 active:opacity-60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className={['font-heading text-sm truncate', inPlan ? 'text-text-dim' : 'text-text-primary'].join(' ')}>
                          {component.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={['text-[10px] font-heading uppercase tracking-wide flex-shrink-0', TYPE_ICON_COLOR[component.type]].join(' ')}>
                            {TYPE_LABEL[component.type]}
                          </span>
                          {component.curriculum && (
                            <>
                              <span className="text-text-dim/30 text-[10px] flex-shrink-0">·</span>
                              <span className="text-[10px] text-text-dim truncate">{component.curriculum}</span>
                            </>
                          )}
                        </div>
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
                            {component.duration_minutes ? (
                              <span className="text-xs text-text-dim">{component.duration_minutes}m</span>
                            ) : null}
                            <svg className="w-4 h-4 text-text-dim/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
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
      )}

      {/* Photo lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Inline video preview */}
      {videoPreview && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
          className="bg-black flex flex-col"
          onClick={() => setVideoPreview(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setVideoPreview(null)}
              className="text-white/70 hover:text-white transition-colors p-1.5 -ml-1.5"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={videoPreview}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full"
            />
          </div>
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
