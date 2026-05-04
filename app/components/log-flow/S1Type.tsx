'use client'

import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, Press, PrimaryBtn, StatusBarLog } from './atoms'

const OPTIONS: Array<{ id: ComponentType; label: string; sub: string; rippleColor: string }> = [
  { id: 'station', label: 'Station', sub: 'A setup coaches rotate through', rippleColor: `${LF.stationBlue}22` },
  { id: 'game', label: 'Game', sub: 'A group activity with rules', rippleColor: `${LF.gameGreen}22` },
]

export default function S1Type({
  value,
  onSelect,
  onNext,
  onClose,
  accent = ACCENT,
}: {
  value: ComponentType | null
  onSelect: (t: ComponentType) => void
  onNext: () => void
  onClose?: () => void
  accent?: string
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBarLog />
      <Chrome step={0} total={5} accent={accent} label="STEP · 01 / TYPE" onClose={onClose} />

      <div style={{ padding: '120px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            Pick a type. Two taps, then you talk.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 36 }}>
          {OPTIONS.map((t, i) => {
            const active = value === t.id
            return (
              <Press
                key={t.id}
                onClick={() => onSelect(t.id)}
                rippleColor={t.rippleColor}
                ariaLabel={`${t.label}: ${t.sub}${active ? ' (selected)' : ''}`}
                style={{
                  height: 140,
                  padding: 20,
                  border: `1.5px solid ${active ? accent : LF.hairlineStrong}`,
                  background: active ? `${accent}0a` : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  animation: `lf-rise-in 500ms ${100 + i * 80}ms both`,
                  boxShadow: active ? `0 0 32px ${accent}33` : 'none',
                  transition: 'border-color 240ms, background 240ms, box-shadow 360ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {t.id === 'station' ? (
                    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" stroke={active ? accent : '#fff'} strokeWidth="1.8" strokeLinecap="square">
                      <rect x="6" y="8" width="36" height="8" />
                      <rect x="6" y="20" width="36" height="8" />
                      <rect x="6" y="32" width="36" height="8" />
                    </svg>
                  ) : (
                    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" stroke={active ? accent : '#fff'} strokeWidth="1.8" strokeLinecap="square">
                      <circle cx="14" cy="14" r="6" />
                      <circle cx="34" cy="14" r="6" />
                      <circle cx="14" cy="34" r="6" />
                      <circle cx="34" cy="34" r="6" />
                      <path d="M14 14L34 34M34 14L14 34" opacity="0.5" />
                    </svg>
                  )}
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
                    }}
                  >
                    {active && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="square">
                        <path d="M5 12l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: LF.display, fontSize: 22, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                    {t.label}
                  </div>
                  <div style={{ fontFamily: LF.body, fontSize: 13, color: LF.muted, marginTop: 2 }}>{t.sub}</div>
                </div>
              </Press>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={!value}>
          Continue
        </PrimaryBtn>
      </div>
    </div>
  )
}
