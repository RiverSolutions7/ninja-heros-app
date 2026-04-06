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

type MenuView = 'closed' | 'menu' | 'library'

const BUILD_OPTIONS: {
  type: BlockType
  label: string
  textColor: string
  hoverBg: string
  description: string
}[] = [
  {
    type: 'warmup',
    label: 'Warm-Up & Stretches',
    textColor: 'text-accent-gold',
    hoverBg: 'hover:bg-accent-gold/10',
    description: 'Opening activity with time and skill focus',
  },
  {
    type: 'lane',
    label: 'Obstacle Course Lane',
    textColor: 'text-accent-fire',
    hoverBg: 'hover:bg-accent-fire/10',
    description: 'Lane with stations, skills, and coach',
  },
  {
    type: 'game',
    label: 'Game / Activity',
    textColor: 'text-accent-green',
    hoverBg: 'hover:bg-accent-green/10',
    description: 'Closing game with rules and video link',
  },
]

export default function AddBlockMenu({ onAdd, onAddFromLibrary, ageGroup }: AddBlockMenuProps) {
  const [view, setView] = useState<MenuView>('closed')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Library state
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [activeCurriculum, setActiveCurriculum] = useState<string>(ageGroup)
  const [activeType, setActiveType] = useState<'' | 'game' | 'warmup' | 'station'>('')

  function openMenu() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const DROPDOWN_HEIGHT = 300
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
    setActiveCurriculum(ageGroup)
    setActiveType('')
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
    function handleScroll() {
      close()
    }
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

  function handleSelectType(type: BlockType) {
    onAdd(type)
    close()
  }

  function handleSelectComponent(component: ComponentRow) {
    onAddFromLibrary(component)
    close()
  }

  // Filter components for library view
  const filtered = components.filter((c) => {
    const matchesCurriculum = !activeCurriculum || c.curriculum === activeCurriculum
    const matchesType = !activeType || c.type === activeType
    return matchesCurriculum && matchesType
  })

  // ── Dropdown (menu view) ─────────────────────────────────────
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
          Build New
        </p>
        {BUILD_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => handleSelectType(opt.type)}
            className={`w-full text-left px-4 py-3.5 flex flex-col gap-0.5 border-b border-bg-border transition-colors ${opt.hoverBg}`}
          >
            <span className={`font-heading text-sm ${opt.textColor}`}>
              {opt.label}
            </span>
            <span className="text-xs text-text-dim">{opt.description}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setView('library')}
          className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-2 border-t-2 border-bg-border hover:bg-accent-blue/5 transition-colors"
        >
          <span className="font-heading text-sm text-accent-blue">
            Choose from Library
          </span>
          <svg
            className="w-4 h-4 text-accent-blue flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    ) : null

  // ── Library picker (full-screen overlay) ─────────────────────
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
            onClick={close}
            className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="font-heading text-text-primary text-lg leading-none">
            Choose from Library
          </h2>
        </div>

        {/* Curriculum + type filters */}
        <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0">
          {/* Curriculum pills */}
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
          {/* Type pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['', 'game', 'warmup', 'station'] as const).map((t) => (
              <button
                key={t || 'all'}
                type="button"
                onClick={() => setActiveType(t)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
                  activeType === t
                    ? 'bg-accent-fire text-white shadow-glow-fire'
                    : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
                ].join(' ')}
              >
                {t === ''
                  ? 'All'
                  : t === 'game'
                    ? 'Games'
                    : t === 'warmup'
                      ? 'Warmups'
                      : 'Stations'}
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
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Block
      </button>

      {typeof window !== 'undefined' && dropdown
        ? createPortal(dropdown, document.body)
        : null}
      {typeof window !== 'undefined' && libraryPicker
        ? createPortal(libraryPicker, document.body)
        : null}
    </div>
  )
}
