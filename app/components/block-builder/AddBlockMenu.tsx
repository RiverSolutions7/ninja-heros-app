'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { BlockType } from '@/app/lib/database.types'

interface AddBlockMenuProps {
  onAdd: (type: BlockType) => void
}

const options: { type: BlockType; label: string; textColor: string; hoverBg: string; description: string }[] = [
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

export default function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Compute fixed position from button bounds when opening
  // Flips upward if not enough space below
  function openMenu() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const DROPDOWN_HEIGHT = 260 // approximate height of the 3-option menu
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const top = spaceBelow >= DROPDOWN_HEIGHT
        ? rect.bottom + 8
        : rect.top - DROPDOWN_HEIGHT - 8
      setDropdownPos({
        top: Math.max(8, top), // never go above viewport
        left: rect.left + rect.width / 2,
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    // Close on scroll so the dropdown doesn't drift from the button
    function handleScroll() {
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside)
      document.addEventListener('scroll', handleScroll, true)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleSelect(type: BlockType) {
    onAdd(type)
    setOpen(false)
  }

  const dropdown = open ? (
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
        Choose Block Type
      </p>
      {options.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => handleSelect(opt.type)}
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

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
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
    </div>
  )
}
