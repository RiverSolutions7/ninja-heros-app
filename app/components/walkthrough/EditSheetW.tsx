'use client'

import { useEffect, useRef, useState } from 'react'
import type { WalkthroughParsed, WalkthroughStation } from './types'

interface Props {
  station: WalkthroughStation
  onClose: () => void
  onSave: (parsed: WalkthroughParsed) => void
}

const ACCENT = '#ff5a1f'
const BG = '#0a1232'
const MUTED = '#8ea0c4'
const FAINT = '#3e4d70'
const DIM = '#6b7da3'
const HAIRLINE = 'rgba(255,255,255,0.08)'

type Field = 'title' | 'duration' | 'sequence' | 'skills' | null

function splitSteps(desc: string): string[] {
  if (!desc) return []
  return desc.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
}

function ClockIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  )
}

function SkillPill({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '7px 16px',
        borderRadius: 999,
        border: `1.5px solid ${ACCENT}`,
        color: ACCENT,
        fontFamily: 'var(--font-russo), sans-serif',
        fontSize: 12,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  )
}

function SequenceStep({ n, text, isLast }: { n: number; text: string; isLast: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        paddingBottom: isLast ? 0 : 14,
        position: 'relative',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          alignSelf: 'stretch',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: `1.5px solid ${ACCENT}`,
            color: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {n}
        </div>
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 0,
              borderLeft: `1.5px dotted ${ACCENT}66`,
              marginTop: 4,
              marginBottom: 4,
              minHeight: 12,
            }}
          />
        )}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: 'var(--font-nunito), sans-serif',
          fontSize: 14.5,
          color: '#fff',
          lineHeight: 1.5,
          paddingTop: 3,
        }}
      >
        {text}
      </div>
    </div>
  )
}

export default function EditSheetW({ station, onClose, onSave }: Props) {
  const initial = station.parsed!
  const [title, setTitle] = useState(initial.title)
  const [durationStr, setDurationStr] = useState(initial.durationMinutes ? String(initial.durationMinutes) : '')
  const [desc, setDesc] = useState(initial.description)
  const [skills, setSkills] = useState<string[]>(initial.skills)

  const [activeField, setActiveField] = useState<Field>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const durRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const skillRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeField === 'title' && titleRef.current) titleRef.current.focus()
    if (activeField === 'duration' && durRef.current) durRef.current.focus()
    if (activeField === 'sequence' && descRef.current) descRef.current.focus()
    if (activeField === 'skills' && skillRef.current) skillRef.current.focus()
  }, [activeField])

  const steps = splitSteps(desc)
  const hasDuration = durationStr.trim().length > 0

  function handleSave() {
    const minutes = Number.parseInt(durationStr, 10)
    onSave({
      title: title.trim(),
      description: desc.trim(),
      skills,
      durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    })
  }

  function sectionStyle(id: Field): React.CSSProperties {
    const isActive = activeField === id
    return {
      position: 'relative',
      padding: '12px 14px',
      marginLeft: -14,
      marginRight: -14,
      background: isActive ? `${ACCENT}0d` : 'transparent',
      borderLeft: `2px solid ${isActive ? ACCENT : 'transparent'}`,
      transition: 'background 160ms, border-color 160ms',
      cursor: isActive ? 'text' : 'pointer',
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.62)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: BG,
          borderRadius: '14px 14px 0 0',
          borderTop: `1px solid ${ACCENT}44`,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'lbSlideUp 380ms cubic-bezier(.22,1,.36,1) both',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 5,
            padding: 6,
            display: 'flex',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Close edit sheet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="square">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div style={{ position: 'relative', height: 220, marginTop: 6, overflow: 'hidden', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={station.photoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(6,10,28,0) 55%, rgba(6,10,28,0.65) 100%)',
            }}
          />
        </div>

        <div
          style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 0' }}
          onClick={() => setActiveField(null)}
        >
          <div
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 10,
              letterSpacing: '0.26em',
              color: ACCENT,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Station
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation()
              setActiveField('title')
            }}
            style={sectionStyle('title')}
          >
            {activeField === 'title' ? (
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 30,
                  lineHeight: 1.0,
                  letterSpacing: '-0.01em',
                  color: '#fff',
                  textTransform: 'uppercase',
                  padding: 0,
                }}
              />
            ) : (
              <div
                style={{
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 30,
                  lineHeight: 1.0,
                  letterSpacing: '-0.01em',
                  color: '#fff',
                  textTransform: 'uppercase',
                }}
              >
                {title || 'Untitled'}
              </div>
            )}
          </div>

          <div style={{ height: 14 }} />

          <div
            onClick={(e) => {
              e.stopPropagation()
              setActiveField('skills')
            }}
            style={sectionStyle('skills')}
          >
            {activeField === 'skills' ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  ref={skillRef}
                  value={skills.join(', ')}
                  onChange={(e) => setSkills(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="Add skills, comma separated"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${ACCENT}66`,
                    outline: 'none',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    fontSize: 14,
                    color: '#fff',
                    padding: '10px 12px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {skills.map((s, i) => (
                    <SkillPill key={i} label={s} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skills.length === 0 ? (
                  <div
                    style={{
                      fontFamily: 'var(--font-nunito), sans-serif',
                      fontSize: 13,
                      color: DIM,
                      fontStyle: 'italic',
                    }}
                  >
                    Tap to add skills
                  </div>
                ) : (
                  skills.map((s, i) => <SkillPill key={i} label={s} />)
                )}
              </div>
            )}
          </div>

          {hasDuration || activeField === 'duration' ? (
            <>
              <div style={{ height: 16 }} />
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveField('duration')
                }}
                style={sectionStyle('duration')}
              >
                {activeField === 'duration' ? (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ClockIcon color={ACCENT} size={16} />
                    <input
                      ref={durRef}
                      value={durationStr}
                      onChange={(e) => setDurationStr(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Minutes"
                      inputMode="numeric"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${ACCENT}66`,
                        outline: 'none',
                        fontFamily: 'var(--font-nunito), sans-serif',
                        fontSize: 15,
                        color: '#fff',
                        padding: '6px 0',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClockIcon color={MUTED} size={16} />
                    <span
                      style={{
                        fontFamily: 'var(--font-nunito), sans-serif',
                        fontSize: 15,
                        color: '#fff',
                      }}
                    >
                      {hasDuration ? `${durationStr} min` : 'Tap to add duration'}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ height: 16 }} />
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveField('duration')
                }}
                style={sectionStyle('duration')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClockIcon color={MUTED} size={16} />
                  <span
                    style={{
                      fontFamily: 'var(--font-nunito), sans-serif',
                      fontSize: 13,
                      color: DIM,
                      fontStyle: 'italic',
                    }}
                  >
                    Tap to add duration
                  </span>
                </div>
              </div>
            </>
          )}

          <div style={{ height: 16 }} />

          <div
            onClick={(e) => {
              e.stopPropagation()
              setActiveField('sequence')
            }}
            style={sectionStyle('sequence')}
          >
            {activeField === 'sequence' ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  ref={descRef}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={Math.max(4, steps.length + 1)}
                  placeholder="One sentence per step. Each sentence becomes a numbered step."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${ACCENT}66`,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'var(--font-nunito), sans-serif',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: '#fff',
                    padding: 12,
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'var(--font-russo), sans-serif',
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    color: FAINT,
                    textTransform: 'uppercase',
                  }}
                >
                  {steps.length} step{steps.length === 1 ? '' : 's'} · split on sentence
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {steps.length === 0 ? (
                  <div
                    style={{
                      fontFamily: 'var(--font-nunito), sans-serif',
                      fontSize: 13,
                      color: DIM,
                      fontStyle: 'italic',
                    }}
                  >
                    Tap to add the steps for this station.
                  </div>
                ) : (
                  steps.map((s, i) => (
                    <SequenceStep key={i} n={i + 1} text={s} isLast={i === steps.length - 1} />
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ height: 24 }} />
        </div>

        <div
          style={{
            padding: '12px 20px 26px',
            flexShrink: 0,
            borderTop: `1px solid ${HAIRLINE}`,
            background: BG,
          }}
        >
          <button
            type="button"
            onClick={handleSave}
            style={{
              width: '100%',
              height: 54,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 32px ${ACCENT}55`,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-russo), sans-serif',
                fontSize: 13,
                letterSpacing: '0.22em',
                color: '#000',
                textTransform: 'uppercase',
              }}
            >
              Save changes
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
