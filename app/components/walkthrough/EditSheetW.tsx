'use client'

import { useEffect, useRef, useState } from 'react'
import type { WalkthroughParsed, WalkthroughStation } from './types'
import { useSwipeReveal, REVEAL_WIDTH_DEFAULT } from '../../hooks/useSwipeReveal'

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

type Field = 'title' | 'duration' | 'skills' | null

function splitSteps(desc: string): string[] {
  if (!desc) return []
  // Strip a single leading bullet, then split on newlines or bullet markers.
  const normalized = desc.replace(/^\s*[•·\-]\s*/, '')
  const parts = normalized
    .split(/\n+|\s+[•·]\s+/g)
    .map((s) => s.replace(/^[•·\-]\s*/, '').trim())
    .filter(Boolean)
  if (parts.length > 1) return parts
  // No multi-item structure detected — try sentence splitting on the
  // bullet-stripped string so the first sentence isn't prefixed with •.
  const sentences = normalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  return sentences.length > 0 ? sentences : []
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

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

interface StepRowProps {
  n: number
  text: string
  isLast: boolean
  isEditing: boolean
  onTap: () => void
  onChange: (val: string) => void
  onBlur: () => void
  onDelete: () => void
}

function StepRow({ n, text, isLast, isEditing, onTap, onChange, onBlur, onDelete }: StepRowProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { handlers, rowStyle } = useSwipeReveal({ onDelete })

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Delete zone — revealed by swiping left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: REVEAL_WIDTH_DEFAULT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#c0392b',
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <TrashIcon />
          <span
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#fff',
            }}
          >
            Delete
          </span>
        </button>
      </div>

      {/* Foreground row — slides left to reveal delete zone */}
      <div
        {...handlers}
        style={{
          ...rowStyle,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          paddingBottom: isLast ? 0 : 14,
          position: 'relative',
          background: BG,
        }}
        onClick={(e) => { e.stopPropagation(); onTap() }}
      >
        {/* Number badge + dotted connector line */}
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

        {/* Step text or inline input */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${ACCENT}88`,
              outline: 'none',
              fontFamily: 'var(--font-nunito), sans-serif',
              fontSize: 14.5,
              color: '#fff',
              lineHeight: 1.5,
              paddingTop: 3,
              paddingBottom: 6,
            }}
          />
        ) : (
          <div
            style={{
              flex: 1,
              fontFamily: 'var(--font-nunito), sans-serif',
              fontSize: 14.5,
              color: text.trim() ? '#fff' : DIM,
              lineHeight: 1.5,
              paddingTop: 3,
              fontStyle: text.trim() ? 'normal' : 'italic',
            }}
          >
            {text.trim() || 'Empty — swipe to delete'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditSheetW({ station, onClose, onSave }: Props) {
  const initial = station.parsed!
  const [title, setTitle] = useState(initial.title)
  const [durationStr, setDurationStr] = useState(initial.durationMinutes ? String(initial.durationMinutes) : '')
  const [steps, setSteps] = useState<string[]>(() => splitSteps(initial.description))
  const [skills, setSkills] = useState<string[]>(initial.skills)

  const [activeField, setActiveField] = useState<Field>(null)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const durRef = useRef<HTMLInputElement>(null)
  const skillRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeField === 'title' && titleRef.current) titleRef.current.focus()
    if (activeField === 'duration' && durRef.current) durRef.current.focus()
    if (activeField === 'skills' && skillRef.current) skillRef.current.focus()
  }, [activeField])

  const hasDuration = durationStr.trim().length > 0

  function handleSave() {
    const minutes = Number.parseInt(durationStr, 10)
    onSave({
      title: title.trim(),
      description: steps.filter((s) => s.trim().length > 0).join('\n'),
      skills,
      durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    })
  }

  function handleStepChange(index: number, val: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? val : s)))
  }

  function handleStepBlur() {
    setEditingStepIndex(null)
  }

  function handleDeleteStep(index: number) {
    setEditingStepIndex(null)
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddStep() {
    setActiveField(null)
    const newIndex = steps.length
    setSteps((prev) => [...prev, ''])
    setEditingStepIndex(newIndex)
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

  const sequenceSectionStyle: React.CSSProperties = {
    position: 'relative',
    padding: '12px 14px',
    marginLeft: -14,
    marginRight: -14,
    background: editingStepIndex !== null ? `${ACCENT}0d` : 'transparent',
    borderLeft: `2px solid ${editingStepIndex !== null ? ACCENT : 'transparent'}`,
    transition: 'background 160ms, border-color 160ms',
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Close edit sheet"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square">
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
          onClick={() => { setActiveField(null); setEditingStepIndex(null) }}
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

          {/* Title */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setEditingStepIndex(null)
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

          {/* Skills */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setEditingStepIndex(null)
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

          {/* Duration */}
          {hasDuration || activeField === 'duration' ? (
            <>
              <div style={{ height: 16 }} />
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingStepIndex(null)
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
                  setEditingStepIndex(null)
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

          {/* Steps sequence — each row is individually tap-to-edit + swipe-to-delete */}
          <div
            onClick={(e) => { e.stopPropagation(); setActiveField(null) }}
            style={sequenceSectionStyle}
          >
            {steps.length === 0 && editingStepIndex === null ? (
              <div
                style={{
                  fontFamily: 'var(--font-nunito), sans-serif',
                  fontSize: 13,
                  color: DIM,
                  fontStyle: 'italic',
                  marginBottom: 12,
                }}
              >
                Tap + Add step to describe this station.
              </div>
            ) : (
              steps.map((stepText, i) => (
                <StepRow
                  key={i}
                  n={i + 1}
                  text={stepText}
                  isLast={i === steps.length - 1}
                  isEditing={editingStepIndex === i}
                  onTap={() => { setActiveField(null); setEditingStepIndex(i) }}
                  onChange={(val) => handleStepChange(i, val)}
                  onBlur={handleStepBlur}
                  onDelete={() => handleDeleteStep(i)}
                />
              ))
            )}

            {/* Add step button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleAddStep() }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: steps.length > 0 ? 14 : 0,
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: `1.5px dashed ${ACCENT}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={`${ACCENT}88`} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: `${ACCENT}88`,
                }}
              >
                Add step
              </span>
            </button>
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
