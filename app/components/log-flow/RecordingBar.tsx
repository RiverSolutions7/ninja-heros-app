// @design-locked — built from the Capture.html export (the #dockRow morphing pill, STATE B).
// Visual source of truth: the export + C:\Users\river\.claude\plans\capture-port-plan.md.
// Drives off the MicState prop (one persistent pill). FREEZE-SAFE: the backdrop-blur is dropped
// for every non-idle/non-typing phase (one `opaque` boolean), the live-wave rAF runs ONLY while
// recording (0 at rest), and nothing animates over a backdrop-blur surface. Typing uses a REAL
// <input> (real iOS keyboard) — the export's fake static keyboard is dropped. The dead .rec-row
// secondary UI is dropped. The submit card-grow morph (pc-skel/pc-real) is Chunk 9 (optional).
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs.
'use client'

import { useEffect, useRef, useState } from 'react'
import type { MicState } from './atoms'

const PLACEHOLDERS = [
  'Describe the setup…',
  'e.g. a 15-min beam & rings station',
  'e.g. kids rotate through 3 balance spots',
  'e.g. a tag game in the foam pit',
]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// live amplitude waveform — 16 white bars; rAF runs only while `active` (freeze-safe at rest)
function LiveWave({ getAmplitude, active }: { getAmplitude: () => number; active: boolean }) {
  const bars = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    if (!active) return
    let raf = 0
    const tick = () => {
      const amp = getAmplitude()
      const t = performance.now() / 200
      bars.current.forEach((b, i) => {
        if (!b) return
        const env = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.7 + t))
        const sy = Math.max(0.12, Math.min(1, 0.16 + amp * env * 2.6))
        b.style.transform = `scaleY(${sy.toFixed(3)})`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, getAmplitude])

  return (
    <div style={{ height: 26, display: 'flex', alignItems: 'center', gap: 3 }} aria-hidden="true">
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{ width: 3, height: '100%', transformOrigin: 'center' }}>
          <div
            ref={(el) => { bars.current[i] = el }}
            style={{ width: '100%', height: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.92)', transform: 'scaleY(0.12)', transformOrigin: 'center', transition: 'transform .09s linear' }}
          />
        </div>
      ))}
    </div>
  )
}

export interface RecordingBarProps {
  state: MicState
  getAmplitude: () => number
  onStart: () => void
  onTypingStart: () => void
  onTypeSubmit: (text: string) => void
  onCancel: () => void
  onStop: () => void
  onDone: () => void
  onPlusTap: () => void
}

export default function RecordingBar({ state, getAmplitude, onStart, onTypingStart, onTypeSubmit, onCancel, onStop, onDone, onPlusTap }: RecordingBarProps) {
  const [typed, setTyped] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const recording = state === 'recording'
  const reviewing = state === 'stopped'
  const parsing = state === 'parsing'
  const typing = state === 'typing'
  const idle = state === 'idle'
  const opaque = recording || reviewing || parsing // blur-drop invariant

  // cycle the idle placeholder
  useEffect(() => {
    if (!idle) return
    const t = window.setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 2600)
    return () => window.clearInterval(t)
  }, [idle])

  // recording timer
  useEffect(() => {
    if (!recording) return
    setElapsed(0)
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(t)
  }, [recording])

  // focus the real field when entering typing
  useEffect(() => {
    if (typing) inputRef.current?.focus()
    else setTyped('')
  }, [typing])

  const hasText = typed.trim().length > 0
  const sendVisible = recording || reviewing || (typing && hasText)
  const sendIsCheck = recording // recording: ✓ = stop; review/typing: ↑ = send
  const sendAction = () => {
    if (recording) onStop()
    else if (reviewing) onDone()
    else if (typing) onTypeSubmit(typed.trim())
  }

  return (
    <div style={{ position: 'relative', height: 90, margin: '0 24px 14px', flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          borderRadius: 18,
          overflow: 'hidden',
          background: opaque ? '#03050c' : 'rgba(255,255,255,0.12)',
          backdropFilter: opaque ? 'none' : 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: opaque ? 'none' : 'blur(20px) saturate(1.2)',
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1.5px 0 rgba(255,255,255,0.52), 0 8px 22px rgba(0,0,0,0.40)',
          transition: 'background .28s ease, backdrop-filter .28s ease',
        }}
      >
        {/* recording-only breathing hairline (gated to recording — never during review/parse) */}
        {recording && (
          <div
            aria-hidden="true"
            className="cap-rec-edge"
            style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)' }}
          />
        )}

        {/* left button: + (idle/typing) or ✕ (recording/review) */}
        {opaque ? (
          <button
            type="button"
            aria-label="Cancel"
            onClick={onCancel}
            className="transition-transform active:scale-[0.9]"
            style={{ position: 'absolute', left: 9, bottom: 9, zIndex: 4, width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Add a photo"
            onClick={onPlusTap}
            className="transition-transform active:scale-[0.92]"
            style={{ position: 'absolute', left: 6, bottom: 6, zIndex: 2, width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M8.5 1.5v14M1.5 8.5h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>
          </button>
        )}

        {/* idle placeholder — tap to type */}
        {idle && (
          <button
            type="button"
            onClick={onTypingStart}
            style={{ position: 'absolute', left: 16, right: 90, top: 14, height: 22, overflow: 'hidden', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'text', padding: 0, fontFamily: 'var(--font-nunito), sans-serif', fontSize: 16.5, fontWeight: 600, color: 'rgba(255,255,255,0.40)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', zIndex: 2 }}
          >
            {PLACEHOLDERS[phIdx]}
          </button>
        )}

        {/* typing field — real input (real keyboard) */}
        <div style={{ position: 'absolute', left: 16, right: 58, top: 14, display: 'flex', alignItems: 'center', minWidth: 0, zIndex: 2, opacity: typing ? 1 : 0, pointerEvents: typing ? 'auto' : 'none' }}>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && hasText) sendAction() }}
            aria-label="Describe the setup"
            placeholder="Describe the setup…"
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', caretColor: '#f97316', fontFamily: 'var(--font-nunito), sans-serif', fontSize: 16.5, fontWeight: 600, color: '#fff' }}
          />
        </div>

        {/* right button: equalizer mic (idle) */}
        {idle && (
          <button
            type="button"
            aria-label="Voice note"
            onClick={onStart}
            className="transition-transform active:scale-[0.92]"
            style={{ position: 'absolute', right: 6, bottom: 6, zIndex: 2, width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.52)' }}
          >
            <svg width="23" height="22" viewBox="0 0 23 22" fill="none" aria-hidden="true">
              <rect x="0" y="5.5" width="3" height="11" rx="1.5" fill="#bcd4f0" />
              <rect x="5" y="1.5" width="3" height="19" rx="1.5" fill="#bcd4f0" />
              <rect x="10" y="7" width="3" height="8" rx="1.5" fill="#bcd4f0" />
              <rect x="15" y="3.5" width="3" height="15" rx="1.5" fill="#bcd4f0" />
              <rect x="20" y="6" width="3" height="10" rx="1.5" fill="#bcd4f0" />
            </svg>
          </button>
        )}

        {/* recording / review centre — live or frozen waveform + Listening… */}
        {(recording || reviewing) && (
          <div style={{ position: 'absolute', left: reviewing ? 56 : 112, right: reviewing ? 102 : 58, top: '50%', transform: 'translateY(-50%)', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: reviewing ? 'flex-start' : 'center', gap: 11, transition: 'left .34s cubic-bezier(.3,.8,.3,1), right .34s cubic-bezier(.3,.8,.3,1)' }}>
            <LiveWave getAmplitude={getAmplitude} active={recording} />
            {recording && <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.2px', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.60)' }}>Listening…</span>}
          </div>
        )}

        {/* review duration */}
        {reviewing && (
          <span style={{ position: 'absolute', right: 58, top: '50%', transform: 'translateY(-50%)', zIndex: 5, fontFamily: "ui-monospace,'SF Mono',Menlo,monospace", fontSize: 13, fontWeight: 600, letterSpacing: '.5px', color: 'rgba(255,255,255,0.46)' }}>
            {fmt(elapsed)}
          </span>
        )}

        {/* persistent orange action circle — stop (✓) / send (↑) */}
        <button
          type="button"
          aria-label={sendIsCheck ? 'Stop' : 'Send'}
          onClick={sendAction}
          className="transition-transform active:scale-[0.92]"
          style={{
            position: 'absolute',
            right: 6,
            bottom: 6,
            width: 44,
            height: 44,
            borderRadius: 22,
            border: 'none',
            cursor: 'pointer',
            zIndex: 5,
            color: '#fff',
            background: '#4a9eff',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sendVisible ? 1 : 0,
            pointerEvents: sendVisible ? 'auto' : 'none',
            transition: 'opacity .2s ease, background .2s ease',
          }}
        >
          {sendIsCheck ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.6 9.4l3.6 3.6L14.4 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 15.5V3M3.5 8.5 9 3l5.5 5.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </button>
      </div>
    </div>
  )
}
