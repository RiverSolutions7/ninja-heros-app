'use client'

import { useState } from 'react'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, Press, PrimaryBtn, StatusBarLog } from './atoms'
import EditSheet, { type EditDraft } from './EditSheet'

export interface RevealDraft {
  title: string
  description: string
  skills: string[]
  durationMinutes: number | null
}

export default function RevealScreen({
  type,
  curricula,
  curriculumRows,
  photoPreviewUrl,
  draft,
  onUpdateDraft,
  onSave,
  onSpeakMore,
  onBack,
  saving,
  accent = ACCENT,
}: {
  type: ComponentType
  curricula: string[]
  curriculumRows: CurriculumRow[]
  photoPreviewUrl: string | null
  draft: RevealDraft
  onUpdateDraft: (next: RevealDraft) => void
  onSave: () => void
  onSpeakMore: () => void
  onBack: () => void
  saving?: boolean
  accent?: string
}) {
  const [editOpen, setEditOpen] = useState(false)

  const typeLabel = type === 'game' ? 'Game' : 'Station'
  const currLabels = curricula
    .map((id) => curriculumRows.find((c) => c.age_group === id)?.label)
    .filter((x): x is string => Boolean(x))
  const durationLabel = draft.durationMinutes ? `${draft.durationMinutes} min` : null
  const metaParts = [durationLabel, ...currLabels, typeLabel].filter(Boolean) as string[]
  const metaLine = metaParts.join(' · ')

  const handleCommit = (next: EditDraft) => {
    onUpdateDraft({
      title: next.title,
      description: next.description,
      skills: next.skills,
      durationMinutes: next.durationMinutes,
    })
  }

  const titleDisplay = draft.title.trim() || 'Untitled component'
  const descDisplay = draft.description.trim()
  const skillList = draft.skills.filter(Boolean)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: LF.bg,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <StatusBarLog />
      <Chrome step={4} total={5} accent={accent} label="STEP · 05 / REVIEW" onBack={onBack} onClose={onBack} />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 40% at 50% 25%, ${accent}14 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          padding: '88px 0 0',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '0 24px 16px', animation: 'lf-rise-in 400ms both', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: LF.display,
              fontSize: 11,
              letterSpacing: '0.28em',
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            CAPTURED
          </div>
          <div
            style={{
              fontFamily: LF.display,
              fontSize: 26,
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Here&apos;s what
            <br />
            I heard.
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 8px' }}>
          <Press
            onClick={() => setEditOpen(true)}
            ariaLabel="Edit component details"
            style={{
              background: LF.card,
              borderRadius: 12,
              overflow: 'hidden',
              animation: 'lf-slide-up 440ms cubic-bezier(.22,1,.36,1) both',
              display: 'block',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 180,
                overflow: 'hidden',
                borderRadius: '12px 12px 0 0',
                background: '#091230',
              }}
            >
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt={titleDisplay}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'rgba(6,10,28,0.65)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 2,
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="square">
                  <path d="M11 4H4v16h16v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span
                  style={{
                    fontFamily: LF.display,
                    fontSize: 8,
                    letterSpacing: '0.2em',
                    color: accent,
                    textTransform: 'uppercase',
                  }}
                >
                  Tap to edit
                </span>
              </div>
            </div>

            <div style={{ padding: '14px 16px 16px' }}>
              <div
                style={{
                  fontFamily: LF.display,
                  fontSize: 26,
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: '#fff',
                }}
              >
                {titleDisplay}
              </div>
              {metaLine && (
                <div style={{ fontFamily: LF.body, fontSize: 12, color: LF.muted, marginTop: 7, letterSpacing: '0.01em' }}>
                  {metaLine}
                </div>
              )}
              {descDisplay && (
                <div
                  style={{
                    fontFamily: LF.body,
                    fontSize: 13.5,
                    color: 'rgba(255,255,255,0.70)',
                    marginTop: 12,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {descDisplay}
                </div>
              )}
              {skillList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                  {skillList.map((s) => (
                    <div
                      key={s}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 9px',
                        border: `1px solid ${accent}55`,
                        background: `${accent}14`,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                      <span
                        style={{
                          fontFamily: LF.display,
                          fontSize: 9,
                          letterSpacing: '0.2em',
                          color: accent,
                          textTransform: 'uppercase',
                        }}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Press>
        </div>

        <div
          style={{
            padding: '12px 20px 24px',
            borderTop: `1px solid ${LF.hairline}`,
            flexShrink: 0,
            animation: 'lf-rise-in 400ms 400ms both',
          }}
        >
          <PrimaryBtn accent={accent} onClick={onSave} disabled={saving || !draft.title.trim()}>
            {saving ? 'Saving…' : 'Save to library'}
          </PrimaryBtn>
          <Press
            onClick={onSpeakMore}
            ariaLabel="Speak to add more"
            style={{
              marginTop: 10,
              width: '100%',
              height: 44,
              border: `1px solid ${LF.hairlineStrong}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'transparent',
              transition: 'all 200ms',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.8">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0014 0" strokeLinecap="square" />
              <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="square" />
            </svg>
            <span
              style={{
                fontFamily: LF.display,
                fontSize: 11,
                letterSpacing: '0.2em',
                color: LF.muted,
                textTransform: 'uppercase',
              }}
            >
              Speak to add more
            </span>
          </Press>
        </div>
      </div>

      {editOpen && (
        <EditSheet
          accent={accent}
          draft={{
            title: draft.title,
            description: draft.description,
            skills: draft.skills,
            durationMinutes: draft.durationMinutes,
          }}
          photoPreviewUrl={photoPreviewUrl}
          onClose={() => setEditOpen(false)}
          onCommit={handleCommit}
        />
      )}
    </div>
  )
}
