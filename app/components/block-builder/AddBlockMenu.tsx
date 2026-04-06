'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { BlockType, ComponentRow, CurriculumRow } from '@/app/lib/database.types'
import { supabase } from '@/app/lib/supabase'
import ComponentCard from '@/app/components/library/ComponentCard'

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void
  onAddFromLibrary: (component: ComponentRow) => void
  ageGroup: string
}

type MenuView = 'closed' | 'menu' | 'choose' | 'library'

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
    label: 'Warm-Up & Stretches',
    emoji: '🔥',
    textColor: 'text-accent-gold',
    hoverBg: 'hover:bg-accent-gold/10',
    description: 'Opening activity with time and skill focus',
    componentType: 'warmup',
  },
  {
    type: 'lane',
    label: 'Obstacle Course Lane',
    emoji: '🏃',
    textColor: 'text-accent-fire',
    hoverBg: 'hover:bg-accent-fire/10',
    description: 'Lane with stations, skills, and coach',
    componentType: 'station',
  },
  {
    type: 'game',
    label: 'Game / Activity',
    emoji: '🎮',
    textColor: 'text-accent-green',
    hoverBg: 'hover:bg-accent-green/10',
    description: 'Closing game with rules and video link',
    componentType: 'game',
  },
]

export default function AddBlockMenu({ onAdd, onAddFromLibrary, ageGroup }: AddBlockMenuProps) {
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
    onAddFromLibrary(component)
    close()
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
          width: '288px',
          zIndex: 9999,
        }}
        className="bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
      >
        <p className="px-4 py-2.5 text-xs font-heading text-text-dim uppercase tracking-wider border-b border-bg-border">
          Add Block
        </p>
        {BUILD_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => handlePickType(opt)}
            className={`w-full text-left px-4 py-3.5 flex flex-col gap-0.5 border-b border-bg-border last:border-b-0 transition-colors ${opt.hoverBg}`}
          >
            <span className={`font-heading text-sm ${opt.textColor}`}>
              {opt.label}
            </span>
            <span className="text-xs text-text-dim">{opt.description}</span>
          </button>
        ))}
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

  return (
    <div className="flex justify-center">
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

      {typeof window !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null}
      {typeof window !== 'undefined' && chooseScreen
        ? createPortal(chooseScreen, document.body)
        : null}
      {typeof window !== 'undefined' && libraryPicker
        ? createPortal(libraryPicker, document.body)
        : null}
    </div>
  )
}
