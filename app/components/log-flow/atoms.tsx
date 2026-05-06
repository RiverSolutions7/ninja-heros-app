'use client'

import { CSSProperties, Fragment, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
              width: 36,
              height: 36,
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

export type MicState = 'idle' | 'recording' | 'paused' | 'parsing'

export function MicButton({ state, accent = ACCENT, onClick }: { state: MicState; accent?: string; onClick?: () => void }) {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {state === 'recording' && (
        <>
          <div
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `1.5px solid ${accent}`,
              animation: 'lf-pulse-ring 1.6s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `1.5px solid ${accent}`,
              animation: 'lf-pulse-ring 1.6s ease-out 0.5s infinite',
            }}
          />
        </>
      )}
      {state === 'parsing' && (
        <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1.5px solid ${accent}44`,
              borderTopColor: accent,
              animation: 'lf-spin 1.2s linear infinite',
            }}
          />
        </div>
      )}
      <Press
        onClick={onClick}
        rippleColor="rgba(0,0,0,0.25)"
        ariaLabel={state === 'recording' ? 'Stop recording' : state === 'parsing' ? 'Processing' : 'Start recording'}
        style={{
          width: 92,
          height: 92,
          borderRadius: '50%',
          background: state === 'parsing' ? 'transparent' : accent,
          border: state === 'parsing' ? `1.5px solid ${accent}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: state === 'recording' ? `0 0 48px ${accent}88` : `0 0 32px ${accent}44`,
          transition: 'box-shadow 300ms',
        }}
      >
        {state === 'recording' ? (
          <div style={{ width: 24, height: 24, background: '#000' }} />
        ) : state === 'parsing' ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 4, height: 14, background: accent, animation: 'lf-dot 1.2s ease-in-out infinite' }} />
            <div style={{ width: 4, height: 14, background: accent, animation: 'lf-dot 1.2s ease-in-out 0.2s infinite' }} />
            <div style={{ width: 4, height: 14, background: accent, animation: 'lf-dot 1.2s ease-in-out 0.4s infinite' }} />
          </div>
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0014 0" strokeLinecap="square" />
            <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="square" />
          </svg>
        )}
      </Press>
    </div>
  )
}

// ─── WaveformLive — rAF drives DOM directly, zero React state ────────────
// Writing bar heights via refs avoids React re-renders at 60fps, which
// previously caused the animation to freeze when speech-recognition updates
// were also competing for React's scheduler.
export function WaveformLive({ accent = ACCENT }: { accent?: string }) {
  const BARS = 16
  const phases = useMemo(
    () =>
      Array.from({ length: BARS }, (_, i) => ({
        phase: (i * 0.62) % (Math.PI * 2),
        freq: 1.6 + (i % 5) * 0.18,
        amp: 0.55 + ((i * 7) % 11) / 22,
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
      phases.forEach((p, i) => {
        const bar = barRefs.current[i]
        if (!bar) return
        const h = 4 + ((Math.sin(t * p.freq * Math.PI + p.phase) + 1) / 2) * 28 * p.amp
        bar.style.height = `${Math.max(4, Math.min(32, h))}px`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phases])

  return (
    <div
      aria-hidden
      style={{ flex: 1, minWidth: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
    >
      {phases.map((_, i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el }}
          style={{
            width: 3,
            height: 4,
            borderRadius: 2,
            background: accent,
            opacity: 0.85,
            transition: 'height 60ms linear',
          }}
        />
      ))}
    </div>
  )
}

// ─── WaveformStatic — frozen bars (paused / parsing state) ───────────────
export function WaveformStatic({ accent = ACCENT }: { accent?: string }) {
  return (
    <div
      aria-hidden
      style={{ flex: 1, minWidth: 0, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          style={{ width: 3, height: 6 + ((i * 13) % 5), borderRadius: 2, background: accent, opacity: 0.32 }}
        />
      ))}
    </div>
  )
}

export function LiveTranscript({ accent = ACCENT, words }: { accent?: string; words: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // useLayoutEffect fires synchronously after DOM update, before paint —
  // scrollTop = scrollHeight always snaps to the newest words with no math,
  // no translateY fighting, and no possibility of overflow-hiding content.
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

export function VoiceControlBar({
  state,
  accent = ACCENT,
  onStart,
  onPause,
  onRedo,
  onDone,
}: {
  state: MicState
  accent?: string
  onStart: () => void
  onPause: () => void
  onRedo: () => void
  onDone: () => void
}) {
  // ── idle: single pill ────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div style={{ padding: '0 24px 36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Press
          onClick={onStart}
          ariaLabel="Start recording"
          rippleColor={`${accent}22`}
          style={{
            height: 52,
            borderRadius: 999,
            border: `1px solid ${accent}`,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '0 24px',
          }}
        >
          {/* mic icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="square">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <line x1="12" y1="18" x2="12" y2="22" />
          </svg>
          <span
            style={{
              fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.22em',
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            TAP TO SPEAK
          </span>
        </Press>
      </div>
    )
  }

  // ── recording / paused / parsing: three-element row ──────────────────────
  const isParsing = state === 'parsing'
  const isPaused = state === 'paused'

  return (
    <div
      style={{
        padding: '0 24px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      {/* Left — pause (recording) or redo (paused/parsing) */}
      <Press
        onClick={isPaused || isParsing ? onRedo : onPause}
        ariaLabel={isPaused || isParsing ? 'Redo recording' : 'Pause recording'}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: isParsing ? 0.4 : 1,
        }}
      >
        {isPaused || isParsing ? (
          // redo / restart arrow ↺
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 9 8 9" />
          </svg>
        ) : (
          // pause ⏸
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        )}
      </Press>

      {/* Center — animated or frozen waveform */}
      {state === 'recording' ? (
        <WaveformLive accent={accent} />
      ) : (
        <WaveformStatic accent={accent} />
      )}

      {/* Right — fire circle with check (or spinner when parsing) */}
      <Press
        onClick={isParsing ? undefined : onDone}
        ariaLabel="Done recording"
        rippleColor="rgba(0,0,0,0.2)"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isParsing ? `${accent}22` : accent,
          boxShadow: isParsing ? 'none' : '0 8px 24px rgba(232,64,64,0.35), 0 0 0 1px rgba(255,255,255,0.08) inset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: isParsing ? 'default' : 'pointer',
        }}
      >
        {isParsing ? (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `1.5px solid ${accent}44`,
              borderTopColor: accent,
              animation: 'lf-spin 1.2s linear infinite',
            }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </Press>
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
