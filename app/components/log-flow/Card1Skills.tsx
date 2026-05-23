'use client'

import { useRef, useState } from 'react'
import { ACCENT, LF } from './atoms'

// ─── Animations ──────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes chipPopIn {
  0%   { transform: scale(0.85); box-shadow: 0 0 0 6px rgba(255,90,31,0.40); }
  100% { transform: scale(1);    box-shadow: 0 0 0 3px rgba(255,90,31,0.25); }
}
@keyframes card1CursorBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
`

// ─── Types ────────────────────────────────────────────────────────────────────
interface Card1SkillsProps {
  availableSkills: string[]
  initialSelected: string[]
  onApprove: (skills: string[]) => void
  onClose?: () => void
  /** Which card in the swipe deck this is (0-based). Default 0. */
  cardIndex?: number
  /** Total cards in the deck. Default 3. */
  totalCards?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Card1Skills({
  availableSkills,
  initialSelected,
  onApprove,
  onClose,
  cardIndex = 0,
  totalCards = 3,
}: Card1SkillsProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected)
  // Skills added this session — tracked separately so we can play pop-in once
  const [newlyAdded, setNewlyAdded] = useState<string[]>([])
  const [mode, setMode] = useState<'default' | 'adding'>('default')
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canCreate = inputValue.trim().length >= 2

  // All skills to show: available + any custom ones the coach added
  const allSkills = [
    ...availableSkills,
    ...selected.filter((s) => !availableSkills.includes(s)),
  ]

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleSkill = (skill: string) => {
    setSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const openInput = () => {
    setMode('adding')
    // Small delay so the element is mounted before focus
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const cancelInput = () => {
    setMode('default')
    setInputValue('')
  }

  const createSkill = () => {
    if (!canCreate) return
    const skill = inputValue.trim()
    setSelected((prev) => [...prev, skill])
    setNewlyAdded((prev) => [...prev, skill])
    setMode('default')
    setInputValue('')
    // Clear pop-in flag after animation finishes
    setTimeout(() => setNewlyAdded((prev) => prev.filter((s) => s !== skill)), 400)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') createSkill()
    if (e.key === 'Escape') cancelInput()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const accentFaded = 'rgba(255,90,31,0.52)'
  const accentTint = 'rgba(255,90,31,0.08)'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: LF.bg,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <style>{ANIM_CSS}</style>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 62,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 3,
          padding: '0 18px',
        }}
      >
        {Array.from({ length: totalCards }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i === cardIndex ? ACCENT : 'rgba(255,255,255,0.14)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* ── Close button ─────────────────────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 76,
            right: 16,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}

      {/* ── Scrollable content area ───────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 82,
          left: 0,
          right: 0,
          bottom: 90,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 20px',
        }}
      >
        {/* Title + subtitle */}
        <div style={{ paddingTop: 14, marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 66,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight: 0.88,
              color: '#fff',
              margin: 0,
              marginBottom: 10,
            }}
          >
            SKILLS
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ACCENT,
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <span
              style={{
                fontFamily: LF.body,
                fontSize: 13,
                color: mode === 'adding' ? LF.muted : 'rgba(255,255,255,0.50)',
                letterSpacing: '0.03em',
                lineHeight: 1.35,
                transition: 'color 0.15s ease',
              }}
            >
              {mode === 'adding' ? 'Adding new skill' : `${selected.length} selected`}
            </span>
          </div>
        </div>

        {/* Chip grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
            opacity: mode === 'adding' ? 0.5 : 1,
            transition: 'opacity 0.15s ease',
            pointerEvents: mode === 'adding' ? 'none' : 'auto',
          }}
        >
          {allSkills.map((skill) => {
            const isSelected = selected.includes(skill)
            const isNew = newlyAdded.includes(skill)
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                style={{
                  fontFamily: LF.display,
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  padding: '7px 13px 6px',
                  borderRadius: 100,
                  background: isSelected ? ACCENT : 'transparent',
                  color: isSelected ? '#fff' : ACCENT,
                  border: `1.5px solid ${isSelected ? ACCENT : accentFaded}`,
                  cursor: 'pointer',
                  animation: isNew ? 'chipPopIn 300ms ease-out forwards' : 'none',
                  transition: isNew ? 'none' : 'background 0.12s ease, color 0.12s ease',
                  lineHeight: 1,
                }}
              >
                {skill}
              </button>
            )
          })}

          {/* + CREATE NEW SKILL chip */}
          {mode === 'default' && (
            <button
              onClick={openInput}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: LF.display,
                fontSize: 13,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                padding: '10px 14px',
                borderRadius: 14,
                background: 'transparent',
                color: ACCENT,
                border: `1.5px dashed ${accentFaded}`,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  lineHeight: 1,
                  fontFamily: 'system-ui',
                  fontWeight: 400,
                }}
              >
                +
              </span>
              CREATE NEW SKILL
            </button>
          )}
        </div>

        {/* Input mode — create a new skill */}
        {mode === 'adding' && (
          <div style={{ marginTop: 4 }}>
            {/* Input row */}
            <div
              style={{
                borderRadius: 14,
                padding: '12px 14px',
                background: accentTint,
                border: `1px solid ${ACCENT}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color: ACCENT,
                  fontSize: 18,
                  opacity: 0.65,
                  flexShrink: 0,
                  fontFamily: 'system-ui',
                }}
              >
                +
              </span>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skill name…"
                style={{
                  fontFamily: LF.body,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  flex: 1,
                  minWidth: 0,
                }}
              />
            </div>

            {/* Cancel / Create */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={cancelInput}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontFamily: LF.body,
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={createSkill}
                disabled={!canCreate}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  background: ACCENT,
                  border: 'none',
                  fontFamily: LF.body,
                  fontSize: 15,
                  fontWeight: 700,
                  color: LF.bg,
                  cursor: canCreate ? 'pointer' : 'not-allowed',
                  opacity: canCreate ? 1 : 0.5,
                  transition: 'opacity 0.15s ease',
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Bottom padding so last chip isn't hidden behind the CTA */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom bar — Approve Skills ───────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 18px max(12px, env(safe-area-inset-bottom))',
          background: `linear-gradient(180deg, rgba(8,12,26,0) 0%, ${LF.bg} 32%)`,
          zIndex: 8,
        }}
      >
        <button
          onClick={() => onApprove(selected)}
          disabled={selected.length === 0}
          aria-label={`Approve ${selected.length} selected skills`}
          style={{
            width: '100%',
            height: 54,
            borderRadius: 12,
            background: selected.length === 0 ? `rgba(255,90,31,0.35)` : ACCENT,
            border: 'none',
            fontFamily: LF.display,
            fontSize: 16,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: selected.length === 0 ? 'rgba(255,255,255,0.4)' : LF.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
            paddingTop: 2,
          }}
        >
          APPROVE SKILLS
          {selected.length > 0 && (
            <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <path
                d="M2 9h18M14 2l7 7-7 7"
                stroke={LF.bg}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
