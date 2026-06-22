// @design-locked — built from the Capture.html export (Log flow add photo, baked defaults).
// Two layouts, driven by MicState:
//   • idle / typing   → the full-width frosted glass card (export .input-dock / .dock-row.glass)
//   • recording / stopped / parsing → the compact FLOATING PILL (export .rec-pill): a translucent
//     deep-navy glass pill (#1b2747 @ --rec-fill 0.23, blur 0 + saturate 1.4), scaled --rec-scale
//     1.35, holding ✕ · bars→dots wave · a blue ↑ send that rides in dim and lights on voice.
// FREEZE-SAFE: no animated backdrop-filter (the pill's saturate is static, blur is 0); the only
// infinite keyframe is the 2-bar pulse (transform-only, gated to recording); voice polling is a
// 110ms interval that runs ONLY while recording (0 timers at rest). Typing uses a REAL <input>
// (real iOS keyboard). The retired #dockRow bloom + 16-bar "Listening…" wave are dropped.
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
  const [hasVoice, setHasVoice] = useState(false)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const prevPill = useRef(false)
  const sendTimer = useRef<number | null>(null)

  const recording = state === 'recording'
  const reviewing = state === 'stopped'
  const parsing = state === 'parsing'
  const typing = state === 'typing'
  const idle = state === 'idle'
  const pill = recording || reviewing || parsing // floating-pill states

  // cycle the idle placeholder
  useEffect(() => {
    if (!idle) return
    const t = window.setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 2600)
    return () => window.clearInterval(t)
  }, [idle])

  // focus the real field when entering typing
  useEffect(() => {
    if (typing) inputRef.current?.focus()
    else setTyped('')
  }, [typing])

  // voice detection → light the send. Interval (not rAF) and ONLY while recording (0 at rest).
  useEffect(() => {
    if (!recording) { setHasVoice(false); return }
    let silence = 0
    const t = window.setInterval(() => {
      const amp = getAmplitude()
      if (amp > 0.06) { silence = 0; setHasVoice(true) }
      else if (++silence > 6) setHasVoice(false)
    }, 110)
    return () => window.clearInterval(t)
  }, [recording, getAmplitude])

  // clear the swipe-out only when the pill is entered fresh (from idle/typing), so the exit
  // animation persists across recording→stopped→parsing but resets for the next take.
  useEffect(() => {
    if (pill && !prevPill.current) setSending(false)
    prevPill.current = pill
  }, [pill])

  // cancel a pending swipe-out submit if we unmount mid-animation
  useEffect(() => () => { if (sendTimer.current) window.clearTimeout(sendTimer.current) }, [])

  const hasText = typed.trim().length > 0
  const sendLit = reviewing || parsing || (recording && hasVoice) // visually lit
  const sendTappable = reviewing || (recording && hasVoice) // NOT during parsing (it's a no-op there)
  const pillSend = () => {
    if (sending) return
    setSending(true) // swipe the pill up and off, then fire the action
    sendTimer.current = window.setTimeout(() => { if (recording) onStop(); else if (reviewing) onDone() }, 400)
  }

  // ───────────────────────── FLOATING PILL (recording / stopped / parsing) ─────────────────────────
  if (pill) {
    return (
      <div style={{ position: 'relative', height: 90, margin: '0 24px 14px', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div
            className={sending ? 'cap-rp-sending' : 'cap-rec-pill'}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              height: 42,
              padding: '0 8px 0 12px',
              borderRadius: 21,
              transform: 'scale(1.35)',
              transformOrigin: 'center center',
              // translucent deep-navy (#1b2747 @ --rec-fill 0.23) — you see the photo through it.
              // No backdrop-filter: --rec-blur is 0, and a backdrop-filter here makes the raster
              // compositor hang (idle's blur captures fine, but the pill state didn't) — the navy
              // tint alone reads as glass over the photo, and it's freeze-safe on device.
              background: 'rgba(27,39,71,0.23)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 26px rgba(0,0,0,0.46), 0 2px 8px rgba(0,0,0,0.36)',
            }}
          >
            {/* ✕ scrap — bare glyph, muted, no circle */}
            <button
              type="button"
              aria-label="Scrap recording"
              onClick={onCancel}
              className="transition-transform active:scale-[0.88]"
              style={{ flex: 'none', width: 30, height: 30, minHeight: 30, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aeb6c8' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>

            {/* bars → dots — the only recording indicator (no "Listening…", no timer) */}
            <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 24 }}>
              <span className={recording && hasVoice ? 'cap-rp-bar' : undefined} style={{ width: 3, height: 14, borderRadius: 2, background: '#d4e4f7', transformOrigin: 'center' }} />
              <span className={recording && hasVoice ? 'cap-rp-bar cap-rp-bar2' : undefined} style={{ width: 3, height: 22, borderRadius: 2, background: '#d4e4f7', transformOrigin: 'center' }} />
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#88aad6' }} />
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7596c2' }} />
              <span style={{ width: 3.2, height: 3.2, borderRadius: '50%', background: '#5e7caa' }} />
              <span style={{ width: 2.6, height: 2.6, borderRadius: '50%', background: '#4a6595' }} />
            </div>

            {/* ↑ send — cool-blue, rides in dim, lights up on voice */}
            <button
              type="button"
              aria-label="Send recording"
              onClick={pillSend}
              className="transition-transform active:scale-[0.94]"
              style={{
                flex: 'none',
                width: 32,
                height: 32,
                minHeight: 32, // override the global button{min-height:44px} a11y rule (kept it an oval)
                padding: 0,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#4a9eff',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                opacity: sendLit ? 1 : 0.26,
                filter: sendLit ? 'none' : 'saturate(0.08) brightness(0.6)',
                pointerEvents: sendTappable ? 'auto' : 'none',
                transition: 'opacity .3s ease, filter .3s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13V3.5M3.8 7.7 8 3.5l4.2 4.2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ───────────────────────── GLASS CARD (idle / typing) ─────────────────────────
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
          // frosted glass (--glass-fill 0.04 / --glass-top 0.16 / --glass-edge 0.04)
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 1.5px 0 rgba(255,255,255,0.16), 0 8px 22px rgba(0,0,0,0.40)',
        }}
      >
        {/* left: + (add a photo) */}
        <button
          type="button"
          aria-label="Add a photo"
          onClick={onPlusTap}
          className="transition-transform active:scale-[0.92]"
          style={{ position: 'absolute', left: 6, bottom: 6, zIndex: 2, width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M8.5 1.5v14M1.5 8.5h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>
        </button>

        {/* idle placeholder — tap to type */}
        {idle && (
          <button
            type="button"
            aria-label="Type a description"
            onClick={() => { inputRef.current?.focus(); onTypingStart() }}
            style={{ position: 'absolute', left: 16, right: 90, top: 6, height: 44, display: 'flex', alignItems: 'flex-start', paddingTop: 8, overflow: 'hidden', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'text', fontFamily: 'var(--font-nunito), sans-serif', fontSize: 16.5, fontWeight: 600, color: 'rgba(255,255,255,0.40)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', zIndex: 2 }}
          >
            <span key={phIdx} className="cap-ph-cycle" style={{ display: 'inline-block' }}>{PLACEHOLDERS[phIdx]}</span>
          </button>
        )}

        {/* typing field — real input (real keyboard) */}
        <div style={{ position: 'absolute', left: 16, right: 58, top: 14, display: 'flex', alignItems: 'center', minWidth: 0, zIndex: 2, opacity: typing ? 1 : 0, pointerEvents: typing ? 'auto' : 'none' }}>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && hasText) onTypeSubmit(typed.trim()) }}
            aria-label="Describe the setup"
            placeholder="Describe the setup…"
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', caretColor: '#f97316', fontFamily: 'var(--font-nunito), sans-serif', fontSize: 16.5, fontWeight: 600, color: '#fff' }}
          />
        </div>

        {/* right (idle): equalizer mic */}
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

        {/* right (typing): ↑ send — appears once there's text */}
        <button
          type="button"
          aria-label="Send"
          onClick={() => onTypeSubmit(typed.trim())}
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
            opacity: typing && hasText ? 1 : 0,
            pointerEvents: typing && hasText ? 'auto' : 'none',
            transition: 'opacity .2s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 15.5V3M3.5 8.5 9 3l5.5 5.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  )
}
