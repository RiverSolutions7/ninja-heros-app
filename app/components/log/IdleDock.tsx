// @design-locked — built from design-export/capture/frames/8a-photo-loaded.html (the idle dock).
// DELIBERATE DIVERGENCE from the frame's dock surface: the export authored the dock as frosted
// (rgba(12,19,34,0.55) + backdrop-filter blur), but the build tokens mandate a SOLID lit-navy dock —
// the dock morphs into the recording bar (chunk 2) and NOTHING may animate over a backdrop-filter
// (the freeze rule). So the surface is solid rgb(12,19,34) with a 1px top-highlight ring + drop
// shadow (lit navy). Every other value (size 66, radius 33, padding, gap, mic 54 disc #ff5a1f, type)
// is copied exactly from the frame.
'use client'

import { useEffect, useRef, useState } from 'react'

const ACCENT = 'rgb(255,90,31)'

function MicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#ffffff" />
      <path d="M5.2 11.5a6.8 6.8 0 0 0 13.6 0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.6v2.9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export interface IdleDockProps {
  note: string
  onNoteChange: (v: string) => void
  typing: boolean
  onOpenTyping: () => void
  onCloseTyping: () => void
  onMicTap: () => void
}

// Lift the dock above the on-screen keyboard using the visual viewport (iOS).
function useKeyboardLift(active: boolean) {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const update = () => {
      if (!active) { setLift(0); return }
      const gap = window.innerHeight - (vv.height + vv.offsetTop)
      setLift(gap > 40 ? gap : 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])
  return lift
}

export default function IdleDock({ note, onNoteChange, typing, onOpenTyping, onCloseTyping, onMicTap }: IdleDockProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const lift = useKeyboardLift(typing)

  // Auto-grow the note field up to maxHeight (then it scrolls) so multi-line notes stay visible.
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`
  }

  useEffect(() => {
    if (typing) {
      inputRef.current?.focus()
      autoGrow(inputRef.current)
    }
  }, [typing])

  const hasNote = note.trim().length > 0

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 66,
        padding: '0px 6px 0px 20px',
        borderRadius: 33,
        // SOLID lit navy (see header note) — no backdrop-filter.
        background: 'rgb(12,19,34)',
        boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
        transform: lift ? `translateY(-${lift}px)` : 'none',
        transition: 'transform 220ms cubic-bezier(0.3,0.8,0.3,1)',
      }}
    >
      {typing ? (
        <textarea
          ref={inputRef}
          value={note}
          onChange={(e) => { onNoteChange(e.target.value); autoGrow(e.currentTarget) }}
          onBlur={onCloseTyping}
          rows={1}
          placeholder="Add a note… (optional)"
          aria-label="Add a note"
          style={{
            flex: '1 1 0%',
            alignSelf: 'center',
            margin: '18px 0',
            padding: 0,
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 400,
            fontSize: 13.5,
            lineHeight: '18px',
            color: 'rgb(231,238,250)',
            maxHeight: 90,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onOpenTyping}
          aria-label={hasNote ? `Edit note: ${note}` : 'Add a note (optional)'}
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            padding: '18px 0',
            cursor: 'text',
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 400,
            fontSize: 13.5,
            color: hasNote ? 'rgb(231,238,250)' : 'rgb(159,176,200)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {hasNote ? note : <>Add a note… <span style={{ color: 'rgb(91,107,134)' }}>(optional)</span></>}
        </button>
      )}

      <button
        type="button"
        onClick={onMicTap}
        aria-label="Record a voice note"
        className="transition-transform active:scale-[0.94]"
        style={{
          flex: '0 0 auto',
          width: 54,
          height: 54,
          borderRadius: 27,
          border: 'none',
          padding: 0,
          background: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <MicGlyph />
      </button>
    </div>
  )
}
