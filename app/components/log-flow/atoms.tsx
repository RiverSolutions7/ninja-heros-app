'use client'

import { CSSProperties, ReactNode, useState } from 'react'

export const LF = {
  bg: '#0a1232',
  bgDeep: '#060a1c',
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
  return (
    <div
      role={role ?? (onClick ? 'button' : undefined)}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (ripple) launch(e)
        onClick?.(e)
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
        cursor: onClick ? 'pointer' : 'default',
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

export function StatusBarLog() {
  return (
    <div
      aria-hidden
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        color: '#fff',
        fontFamily: LF.display,
        fontSize: 14,
        flexShrink: 0,
      }}
    >
      <div>9:41</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <rect x="0" y="7" width="3" height="4" fill="white" />
          <rect x="4.5" y="5" width="3" height="6" fill="white" />
          <rect x="9" y="2.5" width="3" height="8.5" fill="white" />
          <rect x="13.5" y="0" width="3" height="11" fill="white" />
        </svg>
        <svg width="27" height="11" viewBox="0 0 27 11" fill="none">
          <rect x="0.5" y="0.5" width="22" height="10" stroke="white" opacity="0.5" />
          <rect x="2" y="2" width="19" height="7" fill="white" />
        </svg>
      </div>
    </div>
  )
}

export function Chrome({
  step,
  total = 5,
  accent = ACCENT,
  label,
  onClose,
  onBack,
}: {
  step: number
  total?: number
  accent?: string
  label: string
  onClose?: () => void
  onBack?: () => void
}) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 52,
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
          top: 66,
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
              background: 'transparent',
              border: 'none',
              color: LF.muted,
              cursor: 'pointer',
              fontFamily: LF.display,
              fontSize: 10,
              letterSpacing: '0.2em',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            BACK
          </button>
        ) : (
          <div style={{ fontFamily: LF.display, fontSize: 10, letterSpacing: '0.28em', color: LF.faint }}>{label}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && <div style={{ fontFamily: LF.display, fontSize: 10, letterSpacing: '0.28em', color: LF.faint }}>{label}</div>}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                margin: -4,
                display: 'flex',
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

export type MicState = 'idle' | 'recording' | 'parsing'

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

export function Waveform({ accent = ACCENT, active }: { accent?: string; active: boolean }) {
  const bars = 24
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 36,
        marginTop: 8,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            background: accent,
            height: active ? `${6 + Math.abs(Math.sin((i + 1) * 0.7)) * 28}px` : 2,
            animation: active ? `lf-wave 1.1s ${i * 0.04}s ease-in-out infinite alternate` : 'none',
            opacity: active ? 1 : 0.2,
            transition: 'opacity 300ms',
          }}
        />
      ))}
    </div>
  )
}

export function LiveTranscript({ accent = ACCENT, words }: { accent?: string; words: string[] }) {
  return (
    <div
      style={{
        marginTop: 24,
        minHeight: 72,
        maxWidth: 300,
        textAlign: 'center',
        padding: '14px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        animation: 'lf-rise-in 300ms both',
      }}
    >
      <div style={{ fontFamily: LF.body, fontSize: 15, color: '#fff', lineHeight: 1.6, fontWeight: 500 }}>
        {words.map((w, i) => (
          <span key={i} style={{ display: 'inline-block', marginRight: 5 }}>
            {w}
          </span>
        ))}
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: 14,
            background: accent,
            marginLeft: 2,
            verticalAlign: 'middle',
            animation: 'lf-blink 1s step-end infinite',
          }}
        />
      </div>
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
