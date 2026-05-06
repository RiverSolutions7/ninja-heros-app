'use client'

import type { CurriculumRow } from '@/app/lib/database.types'
import { curriculumDotColor } from '@/app/lib/curriculumColors'
import { ACCENT, Chrome, LF, Press, PrimaryBtn } from './atoms'

export default function S2Curriculum({
  value,
  curriculums,
  onToggle,
  onNext,
  onBack,
  onClose,
  accent = ACCENT,
}: {
  value: string[]
  curriculums: CurriculumRow[]
  onToggle: (ageGroup: string) => void
  onNext: () => void
  onBack: () => void
  onClose?: () => void
  accent?: string
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Chrome step={1} total={5} accent={accent} onBack={onBack} onClose={onClose ?? onBack} />

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
            Who&apos;s it
            <br />
            for?
          </h1>
          <p style={{ fontFamily: LF.body, fontSize: 14, color: LF.muted, marginTop: 14, maxWidth: 300, lineHeight: 1.5 }}>
            Tap every age group this works with.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
          {curriculums.map((c, i) => {
            const active = value.includes(c.age_group)
            const dot = curriculumDotColor(c.age_group)
            return (
              <Press
                key={c.id}
                onClick={() => onToggle(c.age_group)}
                rippleColor={`${dot}22`}
                ariaLabel={`${c.label}${active ? ' (selected)' : ''}`}
                style={{
                  padding: '16px 18px',
                  border: `1.5px solid ${active ? accent : LF.hairlineStrong}`,
                  background: active ? `${accent}0a` : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  animation: `lf-rise-in 500ms ${120 + i * 70}ms both`,
                  boxShadow: active ? `0 0 24px ${accent}22` : 'none',
                  transition: 'border-color 240ms, background 240ms, box-shadow 360ms',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: dot,
                    boxShadow: active ? `0 0 12px ${dot}aa` : 'none',
                    transition: 'box-shadow 300ms',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: LF.display,
                      fontSize: 16,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {c.label}
                  </div>
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    border: `1.5px solid ${active ? accent : LF.hairlineStrong}`,
                    background: active ? accent : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 240ms',
                    flexShrink: 0,
                  }}
                >
                  {active && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="square">
                      <path d="M5 12l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </Press>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={value.length === 0}>
          Continue
        </PrimaryBtn>
      </div>
    </div>
  )
}
