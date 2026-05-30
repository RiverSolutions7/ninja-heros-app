'use client'

import { useState } from 'react'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF } from './atoms'
import S1AgeSheet from './S1AgeSheet'

// ─── Exact values lifted from Daniel's iterated Claude Design export ──────────
// (Downloads/Choose a curriculum_files/_bootstrap.html, Ctrl+S 5/30). The export
// is the source of truth for this screen and WINS over the older handoff .md.
// Notably the export's orange is #f97316 (not the app's #ff5a1f ACCENT), the type
// pills are stacked rows + radio (Daniel's newer iteration), and there are NO age
// chips / "tap to edit" row on the main screen in this iteration.
const DESIGN = {
  orange: '#f97316',
  textPrimary: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#475569',
  glowOrange: '0 0 28px rgba(249,115,22,0.40), 0 6px 18px rgba(249,115,22,0.22)',
} as const

const TYPE_OPTIONS: Array<{ id: ComponentType; label: string; sub: string }> = [
  { id: 'station', label: 'Station', sub: 'Drill / skill / obstacle' },
  { id: 'game', label: 'Game', sub: 'Game or activity' },
]

/**
 * S1Setup — merged first screen of the log-component flow ("Pills + sheet"),
 * rebuilt to EXACTLY match Daniel's iterated Claude Design export.
 *
 *   • Title "WHAT ARE YOU LOGGING?" + subtitle "Pick a type. Then choose who it's for."
 *   • Two Type pills, stacked full-width rows (label + sublabel on the left, a radio
 *     indicator on the right). Single-select. Tapping one selects it AND auto-opens
 *     the age-group sheet.
 *   • Bottom sheet (screen-local S1AgeSheet — the export's exact surface + motion)
 *     multi-selects age groups, sourced from the live `curriculums` table.
 *   • Continue enables only when a Type AND ≥1 age group are selected.
 *
 * Divergences from the OLD shipped version, all driven by the export:
 *   • No on-screen age chips / "Age groups · tap to edit" row — this iteration drops
 *     them. Re-opening the sheet is done by re-tapping a Type pill.
 *   • Orange is #f97316 (export) rather than #ff5a1f. The `accent` prop is kept for
 *     contract stability but the screen paints itself in the export's orange.
 *
 * Preserved from the shipped version: the shared `Chrome` top bar (back / X /
 * progress), a11y (radiogroup/radio + aria-checked on type pills; checkbox +
 * aria-checked on age rows; role=button + aria-disabled on disabled Continue/Done),
 * and the data-driven `curriculums` prop contract (page.tsx needs no change).
 */
export default function S1Setup({
  type,
  curriculums,
  selectedCurricula,
  onSelectType,
  onToggleCurriculum,
  onNext,
  onClose,
  // Accepted for prop-contract stability (page.tsx may pass it); the screen itself
  // renders in the export's orange (#f97316), so this is intentionally unused.
  accent: _accent = ACCENT,
}: {
  type: ComponentType | null
  curriculums: CurriculumRow[]
  selectedCurricula: string[]
  onSelectType: (t: ComponentType) => void
  onToggleCurriculum: (ageGroup: string) => void
  onNext: () => void
  onClose?: () => void
  accent?: string
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const anyAge = selectedCurricula.length > 0
  const canContinue = type !== null && anyAge

  const selectType = (t: ComponentType) => {
    onSelectType(t)
    setSheetOpen(true) // tapping a Type pill opens the age-group sheet
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: DESIGN.textPrimary, display: 'flex', flexDirection: 'column' }}>
      {/* Soft fire bleed at the top — matches the export's .screen::before */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: 280,
          background: 'linear-gradient(to bottom, rgba(249,115,22,0.08), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Shared Chrome — back / X / progress. step 0 of 3 (setup → photo → reveal),
          painted in the export's orange so the progress bar matches the design. */}
      <Chrome step={0} total={3} accent={DESIGN.orange} onClose={onClose} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: 'calc(env(safe-area-inset-top, 0px) + 76px) 20px 0',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ animation: 'lf-rise-in 600ms both' }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 26,
              lineHeight: 1.08,
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 400,
              color: DESIGN.textPrimary,
            }}
          >
            What are you
            <br />
            logging?
          </h1>
          <p
            style={{
              fontFamily: LF.body,
              fontSize: 15,
              lineHeight: 1.5,
              color: DESIGN.textMuted,
              margin: '12px 0 0',
              maxWidth: '30ch',
            }}
          >
            Pick a type. Then choose who it&apos;s for.
          </p>
        </div>

        {/* Type pills — single-select stacked rows; tapping one opens the age sheet */}
        <div role="radiogroup" aria-label="Component type" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 30 }}>
          {TYPE_OPTIONS.map((t) => {
            const active = type === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectType(t.id)}
                role="radio"
                aria-checked={active}
                aria-label={`${t.label}: ${t.sub}`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  textAlign: 'left',
                  width: '100%',
                  minHeight: 72,
                  padding: '20px 18px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  background: active ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.045)',
                  border: `1px solid ${active ? 'rgba(249,115,22,0.45)' : 'rgba(255,255,255,0.10)'}`,
                  color: DESIGN.textPrimary,
                  transition: 'background 0.18s ease, border-color 0.18s ease',
                }}
              >
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ fontFamily: LF.display, fontSize: 17, letterSpacing: '0.01em', color: DESIGN.textPrimary }}>
                    {t.label}
                  </span>
                  <span
                    style={{
                      fontFamily: LF.body,
                      fontSize: 13,
                      lineHeight: 1.35,
                      color: active ? DESIGN.textMuted : DESIGN.textDim,
                      transition: 'color 0.18s ease',
                    }}
                  >
                    {t.sub}
                  </span>
                </span>
                {/* Radio indicator — fills orange when selected */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 99,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${active ? DESIGN.orange : 'rgba(255,255,255,0.20)'}`,
                    background: active ? DESIGN.orange : 'transparent',
                    transition: 'border-color 0.18s ease, background 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 99,
                      background: '#fff',
                      opacity: active ? 1 : 0,
                      transform: active ? 'scale(1)' : 'scale(0.4)',
                      transition: 'opacity 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer — single Continue button (export styling: Russo One, orange glow) */}
      <div style={{ position: 'relative', zIndex: 5, padding: '16px 20px 30px' }}>
        <button
          type="button"
          onClick={canContinue ? onNext : undefined}
          disabled={!canContinue}
          role="button"
          aria-disabled={!canContinue || undefined}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 16,
            border: 'none',
            fontFamily: LF.display,
            fontSize: 16,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            background: canContinue ? DESIGN.orange : 'rgba(255,255,255,0.06)',
            color: canContinue ? '#fff' : DESIGN.textDim,
            boxShadow: canContinue ? DESIGN.glowOrange : 'none',
            transition: 'background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease',
          }}
        >
          Continue
        </button>
      </div>

      {/* Age-group bottom sheet — screen-local, export's exact surface + motion */}
      <S1AgeSheet
        open={sheetOpen}
        curriculums={curriculums}
        selectedCurricula={selectedCurricula}
        onToggle={onToggleCurriculum}
        onDone={() => setSheetOpen(false)}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
