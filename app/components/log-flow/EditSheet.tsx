'use client'

import { useEffect, useRef, useState } from 'react'
import { ACCENT, LF, PrimaryBtn } from './atoms'

export interface EditDraft {
  title: string
  description: string
  skills: string[]
  durationMinutes: number | null
}

type FieldKey = 'title' | 'duration' | 'description' | 'skills'

const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'Title',
  duration: 'Duration',
  description: 'How it runs',
  skills: 'Skills',
}

function EditableField({
  field,
  index,
  isLast,
  isEditing,
  accent,
  value,
  large,
  multiline,
  onStartEdit,
  onChange,
  onDone,
}: {
  field: FieldKey
  index: number
  isLast: boolean
  isEditing: boolean
  accent: string
  value: string
  large?: boolean
  multiline?: boolean
  onStartEdit: () => void
  onChange: (next: string) => void
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus()
  }, [isEditing])

  const sharedInputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${accent}66`,
    borderRadius: 0,
    padding: '8px 0',
    outline: 'none',
    color: '#fff',
  } as const

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.08)' : 'none',
        animation: `lf-rise-in 400ms ${150 + index * 80}ms both`,
        borderLeft: isEditing ? `2px solid ${accent}` : '2px solid transparent',
        paddingLeft: isEditing ? 10 : 0,
        transition: 'border-color 150ms, padding-left 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div
          style={{
            fontFamily: LF.display,
            fontSize: 10,
            letterSpacing: '0.24em',
            color: isEditing ? accent : LF.dim,
            textTransform: 'uppercase',
            transition: 'color 150ms',
          }}
        >
          {FIELD_LABELS[field]}
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`Edit ${FIELD_LABELS[field]}`}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
              minWidth: 44,
              padding: '12px 10px',
              margin: '-12px -10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="square">
              <path d="M11 4H4v16h16v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span
              style={{
                fontFamily: LF.display,
                fontSize: 9,
                letterSpacing: '0.2em',
                color: accent,
                textTransform: 'uppercase',
              }}
            >
              Edit
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onDone}
            aria-label="Done editing"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
              minWidth: 44,
              padding: '12px 10px',
              margin: '-12px -10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={LF.gameGreen} strokeWidth="2.5" strokeLinecap="square">
              <path d="M5 12l4 4L19 7" />
            </svg>
            <span
              style={{
                fontFamily: LF.display,
                fontSize: 9,
                letterSpacing: '0.2em',
                color: LF.gameGreen,
                textTransform: 'uppercase',
              }}
            >
              Done
            </span>
          </button>
        )}
      </div>

      {isEditing ? (
        multiline ? (
          <textarea
            ref={(node) => {
              inputRef.current = node
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onDone}
            rows={3}
            style={{
              ...sharedInputStyle,
              resize: 'none',
              fontFamily: LF.body,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          />
        ) : (
          <input
            ref={(node) => {
              inputRef.current = node
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onDone}
            style={{
              ...sharedInputStyle,
              fontFamily: large ? LF.display : LF.body,
              fontSize: large ? 22 : 14,
              textTransform: large ? 'uppercase' : 'none',
            }}
          />
        )
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'text',
            fontFamily: large ? LF.display : LF.body,
            fontSize: large ? 22 : 14,
            color: value ? '#fff' : LF.dim,
            lineHeight: multiline ? 1.55 : 1.2,
            textTransform: large ? 'uppercase' : 'none',
            whiteSpace: multiline ? 'pre-wrap' : 'normal',
          }}
        >
          {value || (multiline ? 'Tap to add coaching cues' : 'Tap to edit')}
        </button>
      )}
    </div>
  )
}

export default function EditSheet({
  draft,
  photoPreviewUrl,
  onClose,
  onCommit,
  accent = ACCENT,
}: {
  draft: EditDraft
  photoPreviewUrl: string | null
  onClose: () => void
  onCommit: (next: EditDraft) => void
  accent?: string
}) {
  const [titleVal, setTitleVal] = useState(draft.title)
  const [durationVal, setDurationVal] = useState(draft.durationMinutes != null ? String(draft.durationMinutes) : '')
  const [descVal, setDescVal] = useState(draft.description)
  const [skillsVal, setSkillsVal] = useState((draft.skills || []).join(' · '))
  const [active, setActive] = useState<FieldKey | null>(null)

  const commit = () => {
    const trimmedDuration = durationVal.trim()
    const parsedDuration = trimmedDuration ? Number(trimmedDuration.replace(/[^0-9.]/g, '')) : NaN
    onCommit({
      title: titleVal.trim(),
      description: descVal.trim(),
      durationMinutes: Number.isFinite(parsedDuration) && parsedDuration > 0 ? Math.round(parsedDuration) : null,
      skills: skillsVal
        .split(/[·,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit component"
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
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: LF.card,
          borderRadius: '14px 14px 0 0',
          borderTop: `1px solid ${accent}44`,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
          animation: 'lf-slide-up 380ms cubic-bezier(.22,1,.36,1) both',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
        </div>

        <div
          style={{
            padding: '10px 20px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontFamily: LF.display,
              fontSize: 10,
              letterSpacing: '0.28em',
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            Edit component
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
              minWidth: 44,
              padding: 14,
              margin: -14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.8" strokeLinecap="square">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            height: 110,
            margin: '0 16px 4px',
            overflow: 'hidden',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          {photoPreviewUrl && (
            <img
              src={photoPreviewUrl}
              alt=""
              aria-hidden
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        <div style={{ padding: '4px 20px 0', flex: 1, overflowY: 'auto' }}>
          <EditableField
            field="title"
            index={0}
            isLast={false}
            isEditing={active === 'title'}
            accent={accent}
            value={titleVal}
            large
            onStartEdit={() => setActive('title')}
            onChange={setTitleVal}
            onDone={() => setActive(null)}
          />
          <EditableField
            field="duration"
            index={1}
            isLast={false}
            isEditing={active === 'duration'}
            accent={accent}
            value={durationVal}
            onStartEdit={() => setActive('duration')}
            onChange={setDurationVal}
            onDone={() => setActive(null)}
          />
          <EditableField
            field="description"
            index={2}
            isLast={false}
            isEditing={active === 'description'}
            accent={accent}
            value={descVal}
            multiline
            onStartEdit={() => setActive('description')}
            onChange={setDescVal}
            onDone={() => setActive(null)}
          />
          <EditableField
            field="skills"
            index={3}
            isLast
            isEditing={active === 'skills'}
            accent={accent}
            value={skillsVal}
            onStartEdit={() => setActive('skills')}
            onChange={setSkillsVal}
            onDone={() => setActive(null)}
          />
        </div>

        <div style={{ padding: '14px 20px 28px', flexShrink: 0 }}>
          <PrimaryBtn
            accent={accent}
            onClick={() => {
              commit()
              onClose()
            }}
          >
            Save changes
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

