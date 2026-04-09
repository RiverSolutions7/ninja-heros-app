'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { BlockType, ComponentRow, CurriculumRow } from '@/app/lib/database.types'
import { supabase } from '@/app/lib/supabase'
import ComponentCard from '@/app/components/library/ComponentCard'
import { TYPE_META } from '@/app/components/library/ComponentCard'

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void
  onAddFromLibrary: (component: ComponentRow) => void
  ageGroup: string
  hero?: boolean
}

type MenuView = 'closed' | 'menu' | 'choose' | 'library' | 'preview'

const BUILD_OPTIONS: {
  type: BlockType
  label: string
  emoji: string
  textColor: string
  hoverBg: string
  description: string
  componentType: 'game' | 'warmup' | 'station'
}[] = [
  {
    type: 'warmup',
    label: 'Warm Up',
    emoji: '🔥',
    textColor: 'text-accent-gold',
    hoverBg: 'hover:bg-accent-gold/10',
    description: '',
    componentType: 'warmup',
  },
  {
    type: 'lane',
    label: 'Station',
    emoji: '📍',
    textColor: 'text-accent-fire',
    hoverBg: 'hover:bg-accent-fire/10',
    description: '',
    componentType: 'station',
  },
  {
    type: 'game',
    label: 'Game',
    emoji: '🎮',
    textColor: 'text-accent-green',
    hoverBg: 'hover:bg-accent-green/10',
    description: '',
    componentType: 'game',
  },
]

export default function AddBlockMenu({ onAdd, onAddFromLibrary, ageGroup, hero = false }: AddBlockMenuProps) {
  const [view, setView] = useState<MenuView>('closed')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedOption, setSelectedOption] = useState<(typeof BUILD_OPTIONS)[0] | null>(null)

  // Library state
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [activeCurriculum, setActiveCurriculum] = useState<string>(ageGroup)
  const [previewComponent, setPreviewComponent] = useState<ComponentRow | null>(null)

  function openMenu() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const DROPDOWN_HEIGHT = 260
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top =
        spaceBelow >= DROPDOWN_HEIGHT
          ? rect.bottom + 8
          : rect.top - DROPDOWN_HEIGHT - 8
      setDropdownPos({
        top: Math.max(8, top),
        left: rect.left + rect.width / 2,
      })
    }
    setView('menu')
  }

  function close() {
    setView('closed')
    setSelectedOption(null)
    setActiveCurriculum(ageGroup)
    setPreviewComponent(null)
  }

  // Close dropdown on outside click or scroll
  useEffect(() => {
    if (view !== 'menu') return
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    function handleScroll() { close() }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [view])

  // Fetch components + curriculums when library opens
  useEffect(() => {
    if (view !== 'library') return
    setLoadingLibrary(true)
    setActiveCurriculum(ageGroup)
    Promise.all([
      supabase.from('components').select('*').order('created_at', { ascending: false }),
      supabase.from('curriculums').select('*').order('sort_order').order('created_at'),
    ]).then(([compRes, currRes]) => {
      setComponents((compRes.data ?? []) as ComponentRow[])
      setCurriculums((currRes.data ?? []) as CurriculumRow[])
      setLoadingLibrary(false)
    })
  }, [view, ageGroup])

  function handlePickType(option: typeof BUILD_OPTIONS[0]) {
    setSelectedOption(option)
    setView('choose')
  }

  function handleCreateOwn() {
    if (!selectedOption) return
    onAdd(selectedOption.type)
    close()
  }

  function handleOpenLibrary() {
    setView('library')
  }

  function handleSelectComponent(component: ComponentRow) {
    setPreviewComponent(component)
    setView('preview')
  }

  function handleAddToClass() {
    if (previewComponent) {
      onAddFromLibrary(previewComponent)
      close()
    }
  }

  // Filter components: locked to the type matching the selected block
  const filtered = components.filter((c) => {
    const matchesCurriculum = !activeCurriculum || c.curriculum === activeCurriculum
    const matchesType = !selectedOption || c.type === selectedOption.componentType
    return matchesCurriculum && matchesType
  })

  // ── Dropdown ─────────────────────────────────────────────────
  const dropdown =
    view === 'menu' ? (
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          transform: 'translateX(-50%)',
          width: '320px',
          zIndex: 9999,
        }}
        className="animate-slide-up"
      >
        <div className="flex flex-col gap-3 p-3 bg-bg-secondary border border-bg-border rounded-3xl shadow-2xl">
          {BUILD_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => handlePickType(opt)}
              className={`w-full flex items-center gap-4 px-5 py-5 rounded-2xl border border-bg-border bg-bg-card active:scale-[0.97] transition-all duration-150 ${opt.hoverBg}`}
            >
              <span className="text-4xl leading-none">{opt.emoji}</span>
              <span className={`font-heading text-2xl tracking-wide ${opt.textColor}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    ) : null

  // ── Choose screen ────────────────────────────────────────────
  const chooseScreen =
    view === 'choose' && selectedOption ? (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        className="bg-bg-primary flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-border flex-shrink-0">
          <button
            type="button"
            onClick={() => setView('menu')}
            className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className={`font-heading text-lg leading-none ${selectedOption.textColor}`}>
              {selectedOption.label}
            </h2>
            <p className="text-text-dim text-xs mt-0.5">How do you want to add it?</p>
          </div>
        </div>

        {/* Two-option cards */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            {/* Create Your Own */}
            <button
              type="button"
              onClick={handleCreateOwn}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-bg-border hover:border-accent-fire/50 hover:bg-accent-fire/5 active:scale-95 transition-all duration-150 min-h-[140px]"
            >
              <span className="text-3xl font-heading text-text-muted">+</span>
              <span className="font-heading text-sm text-text-primary text-center leading-tight">
                Create Your Own
              </span>
            </button>

            {/* Choose from Library */}
            <button
              type="button"
              onClick={handleOpenLibrary}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-bg-border hover:border-accent-blue/50 hover:bg-accent-blue/5 active:scale-95 transition-all duration-150 min-h-[140px]"
            >
              <span className="text-3xl">📚</span>
              <span className="font-heading text-sm text-text-primary text-center leading-tight">
                Choose from Library
              </span>
            </button>
          </div>
        </div>
      </div>
    ) : null

  // ── Library picker ───────────────────────────────────────────
  const libraryPicker =
    view === 'library' ? (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        className="bg-bg-primary flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-border flex-shrink-0">
          <button
            type="button"
            onClick={() => setView('choose')}
            className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="font-heading text-text-primary text-lg leading-none">
            Choose from Library
          </h2>
        </div>

        {/* Curriculum filter only — type is fixed by block selection */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap">
            {[{ label: 'All', value: '' }, ...curriculums.map((c) => ({ label: c.label, value: c.age_group }))].map(({ label, value }) => (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => setActiveCurriculum(value)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                  activeCurriculum === value
                    ? 'bg-accent-fire text-white shadow-glow-fire'
                    : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Component list */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3">
          {loadingLibrary ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🧩</div>
              <p className="font-heading text-text-muted">
                {components.length === 0
                  ? 'No components in library yet'
                  : 'No matches found'}
              </p>
              {components.length === 0 && (
                <p className="text-text-dim text-sm mt-2">
                  Log a component or save a full class to build your library
                </p>
              )}
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectComponent(c)}
                className="w-full text-left active:scale-[0.98] transition-transform"
              >
                <ComponentCard component={c} />
              </button>
            ))
          )}
        </div>
      </div>
    ) : null

  // ── Preview screen ───────────────────────────────────────────
  const previewScreen =
    view === 'preview' && previewComponent ? (() => {
      const meta = TYPE_META[previewComponent.type]
      const photos = previewComponent.photos ?? []
      return (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          className="bg-bg-primary flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-border flex-shrink-0">
            <button
              type="button"
              onClick={() => setView('library')}
              className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h2 className={`font-heading text-lg leading-none ${meta.textColor}`}>
                {previewComponent.title}
              </h2>
              {previewComponent.curriculum && (
                <p className="text-text-dim text-xs mt-0.5">{previewComponent.curriculum}</p>
              )}
            </div>
            <span className={['text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', meta.badge].join(' ')}>
              {meta.label}
            </span>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Photos */}
            {photos.length > 0 && (
              <div className="flex overflow-x-auto gap-2 px-4 py-4" style={{ scrollSnapType: 'x mandatory' }}>
                {photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`${previewComponent.title} photo ${i + 1}`}
                    className="flex-shrink-0 h-48 w-auto rounded-xl object-cover border border-bg-border"
                    style={{ scrollSnapAlign: 'start' }}
                  />
                ))}
              </div>
            )}

            <div className="px-4 py-4 space-y-4">
              {/* Skills */}
              {(previewComponent.skills?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewComponent.skills!.map((skill) => (
                      <span key={skill} className="badge badge-skill">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment / Lane Name */}
              {previewComponent.equipment && (
                <div>
                  <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Lane Name</p>
                  <p className="text-sm font-bold text-accent-blue">{previewComponent.equipment}</p>
                </div>
              )}

              {/* Description */}
              {previewComponent.description && (
                <div>
                  <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {previewComponent.description}
                  </p>
                </div>
              )}

              {/* Duration */}
              {previewComponent.duration_minutes != null && (
                <div>
                  <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm text-text-primary">{previewComponent.duration_minutes} minutes</p>
                </div>
              )}

              {/* Video link */}
              {previewComponent.video_link && (
                <div>
                  <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Video</p>
                  <a
                    href={previewComponent.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue hover:bg-accent-blue/20 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Watch video
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Bottom action buttons */}
          <div className="px-4 py-4 border-t border-bg-border flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setView('library')}
              className="flex-1 py-3.5 rounded-xl border border-bg-border text-text-muted font-heading text-sm hover:bg-white/5 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleAddToClass}
              className="flex-1 py-3.5 rounded-xl bg-accent-fire text-white font-heading text-sm active:scale-95 transition-all shadow-lg shadow-accent-fire/25"
            >
              Add to Class
            </button>
          </div>
        </div>
      )
    })() : null

  return (
    <div className={hero ? 'w-full' : 'flex justify-center'}>
      {hero ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (view === 'menu' ? close() : openMenu())}
          className="w-full flex flex-col items-center justify-center gap-3 py-14 rounded-3xl border-2 border-dashed border-accent-fire/30 hover:border-accent-fire/60 bg-accent-fire/[0.04] hover:bg-accent-fire/[0.08] active:scale-[0.97] transition-all duration-200"
        >
          <span className="text-7xl font-heading text-accent-fire/70 leading-none select-none">+</span>
          <span className="font-heading text-xl text-accent-fire/80 tracking-wide">Add Block</span>
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => (view === 'menu' ? close() : openMenu())}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-accent-fire/20 text-text-dim hover:border-accent-fire/50 hover:text-accent-fire hover:bg-accent-fire/5 transition-all duration-150 font-heading text-sm active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Block
        </button>
      )}

      {typeof window !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null}
      {typeof window !== 'undefined' && chooseScreen
        ? createPortal(chooseScreen, document.body)
        : null}
      {typeof window !== 'undefined' && libraryPicker
        ? createPortal(libraryPicker, document.body)
        : null}
      {typeof window !== 'undefined' && previewScreen
        ? createPortal(previewScreen, document.body)
        : null}
    </div>
  )
}
