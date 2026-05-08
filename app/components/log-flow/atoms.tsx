'use client'

import { CSSProperties, Fragment, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import BottomSheet from '@/app/components/ui/BottomSheet'
import Spinner from '@/app/components/ui/Spinner'

export const LF = {
  bg: '#080c1a',
  bgDeep: '#060a18',
  card: '#0f1734',
  muted: '#8ea0c4',
  dim: '#6b7da3',
  faint: '#3e4d70',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.14)',
  stationBlue: '#3b82f6',
  gameGreen: '#22c55e',
  display: 'Russo One, system-ui',
  body: 'Nunito, system-ui',
} as const

export const ACCENT = '#ff5a1f'

// Shared pill shadow — applied to all pill states
const PILL_SHADOW =
  '0 2px 2px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.45), 0 24px 40px rgba(0,0,0,0.30), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 0 18px rgba(255,255,255,0.025)'

// Orange button shadow (used for mic button, stop button, submit button)
function accentBtnShadow(accent: string) {
  return `0 4px 16px ${accent}85, 0 1px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,210,160,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)`
}

type Ripple = { id: number; x: number; y: number }

function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const launch = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now() + Math.random()
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 500)
  }
  const render = (color: string) =>
    ripples.map((r) => (
      <span
        key={r.id}
        style={{
          position: 'absolute',
          left: r.x,
          top: r.y,
          width: 8,
          height: 8,
          background: color,
          borderRadius: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'lf-ripple 500ms ease-out forwards',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    ))
  return { launch, render }
}

export function Press({
  children,
  onClick,
  style,
  ripple = true,
  rippleColor = 'rgba(255,255,255,0.12)',
  ariaLabel,
  role,
}: {
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
  style?: CSSProperties
  ripple?: boolean
  rippleColor?: string
  ariaLabel?: string
  role?: string
}) {
  const { launch, render } = useRipple()
  const [pressed, setPressed] = useState(false)
  const interactive = !!onClick
  return (
    <div
      role={role ?? (interactive ? 'button' : undefined)}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      onClick={(e) => {
        if (ripple) launch(e)
        onClick?.(e)
      }}
      onKeyDown={(e) => {
        if (!interactive) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
        }
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'transform 140ms ease',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
      {ripple && render(rippleColor)}
    </div>
  )
}

export function PrimaryBtn({
  children,
  accent = ACCENT,
  onClick,
  disabled,
  style,
}: {
  children: ReactNode
  accent?: string
  onClick?: () => void
  disabled?: boolean
  style?: CSSProperties
}) {
  return (
    <Press
      onClick={disabled ? undefined : onClick}
      rippleColor="rgba(0,0,0,0.2)"
      style={{
        width: '100%',
        height: 56,
        background: disabled ? 'rgba(255,255,255,0.04)' : accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : `0 0 32px ${accent}44`,
        transition: 'box-shadow 200ms',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: LF.display,
          fontSize: 13,
          letterSpacing: '0.18em',
          color: disabled ? LF.dim : '#000',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
    </Press>
  )
}

/** @deprecated Removed — the real device status bar shows through now. */
export function StatusBarLog() { return null }

export function Chrome({
  step,
  total = 5,
  accent = ACCENT,
  onClose,
  onBack,
}: {
  step: number
  total?: number
  accent?: string
  onClose?: () => void
  onBack?: () => void
}) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: 24,
          right: 24,
          display: 'flex',
          gap: 4,
          zIndex: 20,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              background: i <= step ? accent : LF.hairline,
              transition: 'background 300ms',
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 22px)',
          left: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
        }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onClose && (
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
                padding: 15,
                margin: -15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.8" strokeLinecap="square">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// idle     — pill with "Tap to describe" + mic button
// typing   — pill with text input
// recording — pill with live waveform + cancel/stop
// stopped  — expanded two-row card with frozen waveform + cancel/submit
// parsing  — expanded two-row card with spinner
export type MicState = 'idle' | 'typing' | 'recording' | 'stopped' | 'parsing'

// ─── Static 7-bar glyph inside the idle mic button ───────────────────────────
function StaticWaveGlyph() {
  const heights = [6, 11, 16, 20, 16, 11, 6]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ width: 2.5, height: h, borderRadius: 2, background: 'rgba(255,255,255,0.9)' }}
        />
      ))}
    </div>
  )
}

// ─── WaveformLive — 38 bars, rAF-driven, real amplitude when available ────────
// Writing heights directly via refs (not React state) keeps this at 60fps even
// while SpeechRecognition is also posting updates to React's scheduler.
export function WaveformLive({
  accent = ACCENT,
  getAmplitude,
}: {
  accent?: string
  getAmplitude?: () => number
}) {
  const BARS = 38
  const phases = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => ({
        phase: (i * 0.62) % (Math.PI * 2),
        freq: 1.4 + (i % 7) * 0.15,
        amp: 0.5 + ((i * 7) % 11) / 22,
      })),
    []
  )
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let raf: number
    let start = 0
    const loop = (ts: number) => {
      if (!start) start = ts
      const t = (ts - start) / 1000
      // Use real amplitude when the analyser is running; fall back to a gentle
      // simulated pulse so the waveform always looks alive.
      const real = getAmplitude ? getAmplitude() : 0
      const level = real > 0.01 ? real : 0.25 + Math.sin(t * 1.1) * 0.12
      phases.forEach((p, i) => {
        const bar = barRefs.current[i]
        if (!bar) return
        const variation = (Math.sin(t * p.freq * Math.PI + p.phase) + 1) / 2
        const h = 2 + level * 22 * p.amp * (0.4 + variation * 0.6)
        const opacity = 1 - (i / BARS) * 0.55
        bar.style.height = `${Math.max(2, Math.min(24, h))}px`
        bar.style.opacity = String(opacity.toFixed(2))
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phases, getAmplitude])

  return (
    <div
      aria-hidden
      style={{
        flex: 1,
        minWidth: 0,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2.5,
      }}
    >
      {phases.map((_, i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el }}
          style={{ width: 2.5, height: 2, borderRadius: 2, background: accent, flexShrink: 0 }}
        />
      ))}
    </div>
  )
}

// ─── WaveformMini — 22 bars, frozen "just recorded" snapshot ──────────────────
// Left 9 bars: short dots (opacity 0.28–0.50)
// Right 13 bars: ramp up to 22px peak (opacity 0.75–1.0)
export function WaveformMini({ accent = ACCENT }: { accent?: string }) {
  const bars = Array.from({ length: 22 }, (_, i) => {
    if (i < 9) {
      return { h: 3 + (i % 2), opacity: 0.28 + (i / 9) * 0.22 }
    }
    const t = (i - 9) / 12
    return { h: 4 + t * 18, opacity: 0.75 + t * 0.25 }
  })

  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            width: 2,
            height: b.h,
            borderRadius: 1,
            background: accent,
            opacity: b.opacity,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

// ─── Small inline waveform for compact mic buttons (7 bars, rAF-driven) ───────
export function WaveformInline({
  accent = ACCENT,
  getAmplitude,
}: {
  accent?: string
  getAmplitude?: () => number
}) {
  const BARS = 7
  const phases = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => ({
        phase: (i * 0.8) % (Math.PI * 2),
        freq: 1.5 + i * 0.2,
        amp: 0.6 + ((i * 5) % 7) / 14,
      })),
    []
  )
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let raf: number
    let start = 0
    const loop = (ts: number) => {
      if (!start) start = ts
      const t = (ts - start) / 1000
      const real = getAmplitude ? getAmplitude() : 0
      const level = real > 0.01 ? real : 0.3 + Math.sin(t * 1.2) * 0.15
      phases.forEach((p, i) => {
        const bar = barRefs.current[i]
        if (!bar) return
        const variation = (Math.sin(t * p.freq * Math.PI + p.phase) + 1) / 2
        const h = 2 + level * 14 * p.amp * (0.4 + variation * 0.6)
        bar.style.height = `${Math.max(2, Math.min(16, h))}px`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phases, getAmplitude])

  return (
    <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {phases.map((_, i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el }}
          style={{ width: 2, height: 2, borderRadius: 1, background: accent }}
        />
      ))}
    </div>
  )
}

// ─── AdjustSheet — bottom sheet with context-extraction toggles ───────────────
export function AdjustSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState({
    coachingCues: true,
    skills: true,
    equipment: false,
    duration: false,
  })

  const rows: { key: keyof typeof settings; label: string; sub: string }[] = [
    { key: 'coachingCues', label: 'Coaching Cues', sub: 'Technique tips and progressions' },
    { key: 'skills',       label: 'Skills',         sub: 'Tag skill progressions' },
    { key: 'equipment',    label: 'Equipment',       sub: 'List gear needed' },
    { key: 'duration',     label: 'Duration',        sub: 'Estimate station time' },
  ]

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Adjust">
      {rows.map((row, i) => (
        <div
          key={row.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 54,
            padding: '0 20px',
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#fff', fontFamily: LF.body, margin: 0 }}>{row.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: LF.body, margin: 0 }}>{row.sub}</p>
          </div>
          <div
            role="switch"
            aria-label={row.label}
            aria-checked={settings[row.key]}
            tabIndex={0}
            onClick={() => setSettings((s) => ({ ...s, [row.key]: !s[row.key] }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSettings((s) => ({ ...s, [row.key]: !s[row.key] }))
            }}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              background: settings[row.key] ? ACCENT : 'rgba(255,255,255,0.18)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 200ms',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: settings[row.key] ? 21 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'left 200ms cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          </div>
        </div>
      ))}
    </BottomSheet>
  )
}

// ─── VoiceControlBar — bottom-anchored pill with 5 states ────────────────────
export function VoiceControlBar({
  state,
  accent = ACCENT,
  getAmplitude,
  onStart,
  onTypingStart,
  onTypeSubmit,
  onCancel,
  onStop,
  onDone,
}: {
  state: MicState
  accent?: string
  getAmplitude?: () => number
  onStart: () => void
  onTypingStart: () => void
  onTypeSubmit: (text: string) => void
  onCancel: () => void
  onStop: () => void
  onDone: () => void
}) {
  const [typedText, setTypedText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Elapsed recording time — frozen when state leaves 'recording'
  const recordStartRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state === 'recording') {
      if (!recordStartRef.current) recordStartRef.current = Date.now()
      const iv = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (recordStartRef.current ?? Date.now())) / 1000))
      }, 1000)
      return () => clearInterval(iv)
    }
    if (state === 'idle') {
      recordStartRef.current = null
      setElapsed(0)
    }
  }, [state])

  // Clear typed text when leaving typing state
  useEffect(() => {
    if (state === 'typing') {
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setTypedText('')
    }
  }, [state])

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const isExpanded = state === 'stopped' || state === 'parsing'
  const isRecordingOrStopped = state === 'recording' || state === 'stopped'
  const btnShadow = accentBtnShadow(accent)

  return (
    <div
      style={{
        padding: '0 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
      }}
    >
      {/* Pill shell */}
      <div
        style={{
          position: 'relative',
          borderRadius: isExpanded ? 28 : 999,
          border: '1px solid',
          borderColor: isRecordingOrStopped
            ? `rgba(255,90,31,0.42)`
            : 'rgba(255,255,255,0.11)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.095) 0%, rgba(255,255,255,0.055) 100%)',
          boxShadow: PILL_SHADOW,
          animation: state === 'recording' ? 'lf-pill-glow 2s ease-in-out infinite' : 'none',
          transition: 'border-radius 300ms cubic-bezier(0.32,0.72,0,1), border-color 300ms ease',
          overflow: 'hidden',
        }}
      >
        {/* Top sheen line */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '8%',
            right: '8%',
            height: 1,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.18) 70%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              padding: '0 9px',
              gap: 10,
            }}
          >
            {/* Left spacer — mirrors mic button width so text is optically centered */}
            <div style={{ width: 46, height: 46, flexShrink: 0 }} />
            {/* Placeholder — tap → typing */}
            <div
              role="button"
              tabIndex={0}
              onClick={onTypingStart}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTypingStart() }}
              aria-label="Type to describe"
              style={{
                flex: 1,
                fontSize: 16,
                color: 'rgba(255,255,255,0.38)',
                cursor: 'text',
                userSelect: 'none',
                fontFamily: LF.body,
                textAlign: 'center',
              }}
            >
              Tap to describe
            </div>
            {/* Mic button — 46×46px rounded square */}
            <Press
              onClick={onStart}
              ariaLabel="Start recording"
              rippleColor="rgba(0,0,0,0.25)"
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: 'linear-gradient(160deg, #ff6a2a 0%, #e03a00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: btnShadow,
              }}
            >
              <StaticWaveGlyph />
            </Press>
          </div>
        )}

        {/* ── TYPING ── */}
        {state === 'typing' && (
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              padding: '0 9px',
              gap: 8,
            }}
          >
            {/* Cancel × */}
            <Press
              onClick={onCancel}
              ariaLabel="Cancel"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Press>
            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typedText.trim()) {
                  e.preventDefault()
                  onTypeSubmit(typedText.trim())
                }
                if (e.key === 'Escape') onCancel()
              }}
              placeholder="Describe the station or game…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 16,
                color: '#fff',
                fontFamily: LF.body,
                caretColor: accent,
                minWidth: 0,
              }}
              aria-label="Describe"
            />
            {/* Submit ↑ */}
            <Press
              onClick={typedText.trim() ? () => onTypeSubmit(typedText.trim()) : undefined}
              ariaLabel="Submit description"
              rippleColor="rgba(0,0,0,0.25)"
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: typedText.trim()
                  ? 'linear-gradient(160deg, #ff6a2a 0%, #e03a00 100%)'
                  : 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: typedText.trim() ? btnShadow : 'none',
                opacity: typedText.trim() ? 1 : 0.35,
                transition: 'opacity 200ms, background 200ms, box-shadow 200ms',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </Press>
          </div>
        )}

        {/* ── RECORDING ── */}
        {state === 'recording' && (
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 10,
              animation: 'lf-pill-glow-in 300ms ease both',
            }}
          >
            {/* Cancel × */}
            <Press
              onClick={onCancel}
              ariaLabel="Cancel recording"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                animation: 'lf-pill-fade-in 300ms 100ms ease both',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Press>
            {/* Live waveform */}
            <WaveformLive accent={accent} getAmplitude={getAmplitude} />
            {/* Stop ■ */}
            <Press
              onClick={onStop}
              ariaLabel="Stop recording"
              rippleColor="rgba(0,0,0,0.25)"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(160deg, #ff6a2a 0%, #e03a00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: btnShadow,
                animation: 'lf-pill-fade-in 300ms 100ms ease both',
              }}
            >
              <div style={{ width: 11, height: 11, background: '#fff', borderRadius: 2 }} />
            </Press>
          </div>
        )}

        {/* ── STOPPED — review before submit ── */}
        {state === 'stopped' && (
          <div style={{ padding: '14px 14px 12px' }}>
            {/* Row 1: mini waveform + timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <WaveformMini accent={accent} />
              <span
                style={{
                  fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.50)',
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
              >
                {formatElapsed(elapsed)}
              </span>
            </div>
            {/* Row 2: cancel + submit */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                animation: 'lf-pill-fade-in 200ms ease both',
              }}
            >
              <Press
                onClick={onCancel}
                ariaLabel="Discard recording"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </Press>
              <Press
                onClick={onDone}
                ariaLabel="Submit recording"
                rippleColor="rgba(0,0,0,0.25)"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(160deg, #ff6a2a 0%, #e03a00 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: btnShadow,
                  animation: 'lf-pill-fade-in 220ms 40ms ease both',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </Press>
            </div>
          </div>
        )}

        {/* ── PARSING ── */}
        {state === 'parsing' && (
          <div style={{ padding: '14px 14px 12px' }}>
            {/* Row 1: spinner + text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Spinner size="xs" tone="muted" ariaLabel="Processing" />
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontFamily: LF.body }}>
                Processing…
              </span>
            </div>
            {/* Row 2: cancel */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Press
                onClick={onCancel}
                ariaLabel="Cancel processing"
                style={{
                  minHeight: 44,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: LF.body }}>
                  Cancel
                </span>
              </Press>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function LiveTranscript({ accent = ACCENT, words }: { accent?: string; words: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // useLayoutEffect fires synchronously after DOM update, before paint —
  // scrollTop = scrollHeight always snaps to the newest words with no math.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [words])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 24px 8px',
        scrollbarWidth: 'none',
      } as CSSProperties}
    >
      <p
        style={{
          margin: 0,
          fontFamily: LF.body,
          fontWeight: 700,
          fontSize: 26,
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
          textAlign: 'left',
          wordBreak: 'normal',
        }}
      >
        {words.map((w, idx) => (
          <Fragment key={idx}>
            <span
              style={{
                display: 'inline-block',
                color: idx === words.length - 1 ? accent : '#ffffff',
                transition: idx === words.length - 1 ? 'none' : 'color 120ms ease',
                animation: 'lf-word-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
                willChange: 'transform, opacity',
              }}
            >
              {w}
            </span>
            {idx < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </p>
    </div>
  )
}

export function TorchLg({ color = ACCENT, size = 72 }: { color?: string; size?: number }) {
  return (
    <svg width={size * (96 / 140)} height={size} viewBox="0 0 96 140" style={{ display: 'block' }}>
      <path d="M48 6 C 40 22, 30 30, 30 46 C 30 58, 38 66, 48 66 C 58 66, 66 58, 66 46 C 66 30, 56 22, 48 6 Z" fill={color} />
      <path d="M26 68 L 70 68 L 64 82 L 32 82 Z" fill={color} />
      <rect x="30" y="84" width="36" height="4" fill={color} />
      <rect x="42" y="90" width="12" height="42" fill={color} />
      <rect x="38" y="132" width="20" height="4" fill={color} />
    </svg>
  )
}
