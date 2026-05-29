'use client'

import { useState } from 'react'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { curriculumDotColor } from '@/app/lib/curriculumColors'
import { ACCENT, Chrome, LF, Press, PrimaryBtn } from './atoms'
import BottomSheet from '@/app/components/ui/BottomSheet'

const TYPE_OPTIONS: Array<{ id: ComponentType; label: string; sub: string; rippleColor: string }> = [
  { id: 'station', label: 'Station', sub: 'Drill / skill / obstacle', rippleColor: `${LF.stationBlue}22` },
  { id: 'game', label: 'Game', sub: 'Game or activity', rippleColor: `${LF.gameGreen}22` },
]

/**
 * S1Setup — merged first screen of the log-component flow ("Pills + sheet").
 * Combines the old Type (S1) + Curriculum (S2) screens into one:
 *   • Two Type pills (single-select). Tapping one selects it AND auto-opens the
 *     age-group bottom sheet.
 *   • Bottom sheet (built on the shared BottomSheet primitive) multi-selects age
 *     groups, sourced from the live `curriculums` table (never hardcoded).
 *   • Chosen ages return as chips under "Age groups · tap to edit"; tapping
 *     "tap to edit" reopens the sheet.
 *   • Continue enables only when a Type AND ≥1 age group are selected.
 *
 * Top chrome is the shared `Chrome` atom (same back / X / progress bar as every
 * other flow screen), at step 0 of the merged 4-step flow.
 */
export default function S1Setup({
  type,
  curriculums,
  selectedCurricula,
  onSelectType,
  onToggleCurriculum,
  onNext,
  onClose,
  accent = ACCENT,
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

  // Chips render in the curriculum table's own order
  const chosenRows = curriculums.filter((c) => selectedCurricula.includes(c.age_group))

  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Chrome step={0} total={4} accent={accent} onClose={onClose} />

      <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 76px) 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ animation: 'lf-rise-in 600ms both' }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 36,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 400,
            }}
          >
            What are
            <br />
            you logging?
          </h1>
          <p
            style={{
              fontFamily: LF.body,
              fontSize: 14,
              color: LF.muted,
              marginTop: 14,
              maxWidth: 300,
              lineHeight: 1.5,
            }}
          >
            Pick a type. Then choose who it&apos;s for.
          </p>
        </div>

        {/* Type pills — single-select; tapping one also opens the age sheet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 32 }}>
          {TYPE_OPTIONS.map((t, i) => {
            const active = type === t.id
            return (
              <Press
                key={t.id}
                onClick={() => selectType(t.id)}
                rippleColor={t.rippleColor}
                ariaLabel={`${t.label}: ${t.sub}${active ? ' (selected)' : ''}`}
                style={{
                  padding: '20px 22px',
                  border: `1.5px solid ${active ? accent : LF.hairlineStrong}`,
                  background: active ? `${accent}0a` : 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 14,
                  animation: `lf-rise-in 500ms ${100 + i * 80}ms both`,
                  boxShadow: active ? `0 0 32px ${accent}33` : 'none',
                  transition: 'border-color 240ms, background 240ms, box-shadow 360ms',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: LF.display, fontSize: 22, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    {t.label}
                  </div>
                  <div style={{ fontFamily: LF.body, fontSize: 13, color: LF.muted, marginTop: 2 }}>{t.sub}</div>
                </div>
                {/* Radio indicator — filled orange when selected */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: `2px solid ${active ? accent : LF.hairlineStrong}`,
                    background: active ? accent : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 240ms',
                  }}
                >
                  {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </Press>
            )
          })}
        </div>

        {/* Chosen age groups */}
        {anyAge && (
          <div style={{ animation: 'lf-rise-in 360ms both' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                fontFamily: LF.display,
                fontSize: 13,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: LF.muted,
                margin: '26px 0 12px',
              }}
            >
              <span>Age groups ·</span>
              <Press
                onClick={() => setSheetOpen(true)}
                ariaLabel="Edit age groups"
                ripple={false}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  // Visible text stays inline; padding + negative margin extend the
                  // hit area to ~44px tall without shifting the baseline row.
                  padding: '14px 12px',
                  margin: '-14px -12px',
                }}
              >
                <span style={{ color: accent, textTransform: 'none', fontFamily: LF.body, fontWeight: 700, fontSize: 13 }}>
                  tap to edit
                </span>
              </Press>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {chosenRows.map((c) => {
                const dot = curriculumDotColor(c.age_group)
                return (
                  <span
                    key={c.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      background: `${accent}0a`,
                      border: `1px solid ${accent}`,
                      color: '#fff',
                      borderRadius: 999,
                      padding: '7px 13px',
                      fontFamily: LF.body,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    {c.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={!canContinue}>
          Continue
        </PrimaryBtn>
      </div>

      {/* Age-group bottom sheet — multi-select, built on the shared BottomSheet */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Who's it for?">
        <div style={{ padding: '4px 24px 8px' }}>
          <p style={{ fontFamily: LF.body, fontSize: 13.5, color: LF.muted, margin: '0 0 18px', textAlign: 'center' }}>
            Tap every age group this works with.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {curriculums.map((c) => {
              const sel = selectedCurricula.includes(c.age_group)
              const dot = curriculumDotColor(c.age_group)
              return (
                <Press
                  key={c.id}
                  onClick={() => onToggleCurriculum(c.age_group)}
                  rippleColor={sel ? 'rgba(0,0,0,0.18)' : `${dot}22`}
                  ariaLabel={`${c.label}${sel ? ' (selected)' : ''}`}
                  role="checkbox"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    borderRadius: 16,
                    padding: 16,
                    minHeight: 44,
                    background: sel ? '#fff' : 'rgba(255,255,255,0.06)',
                    color: sel ? '#0e1428' : '#fff',
                    boxShadow: sel ? `0 0 28px ${accent}33` : 'none',
                    transition: 'background 180ms ease, color 180ms ease, box-shadow 180ms ease',
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <span style={{ fontFamily: LF.body, fontWeight: 700, fontSize: 15 }}>{c.label}</span>
                </Press>
              )
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            <PrimaryBtn accent={accent} onClick={() => setSheetOpen(false)} disabled={!anyAge}>
              Done
            </PrimaryBtn>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
