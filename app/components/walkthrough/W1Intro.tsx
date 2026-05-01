'use client'

interface Props {
  onStart: () => void
  onClose: () => void
}

const ACCENT = '#ff5a1f'
const STEPS: [string, string, string][] = [
  ['01', 'SNAP', 'Frame the station, tap shutter'],
  ['02', 'SPEAK', 'Recording starts. Describe it.'],
  ['03', 'WALK ON', 'Repeat until done.'],
]

export default function W1Intro({ onStart, onClose }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a1232',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 56,
          left: 24,
          zIndex: 30,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="Close walkthrough"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8ea0c4" strokeWidth="1.8" strokeLinecap="square">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        style={{
          position: 'absolute',
          top: 64,
          right: 24,
          zIndex: 30,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 10,
          letterSpacing: '0.28em',
          color: '#3e4d70',
          textTransform: 'uppercase',
        }}
      >
        Walkthrough Mode
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 90% 50% at 50% 35%, ${ACCENT}1f 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ animation: 'lbTorchIn 700ms cubic-bezier(.22,1,.36,1) both' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <ellipse cx="20" cy="58" rx="6" ry="9" fill={ACCENT} opacity="0.35" />
            <circle cx="14" cy="48" r="2" fill={ACCENT} opacity="0.35" />
            <circle cx="20" cy="46" r="2" fill={ACCENT} opacity="0.35" />
            <circle cx="26" cy="48" r="2" fill={ACCENT} opacity="0.35" />
            <ellipse cx="44" cy="42" rx="6" ry="9" fill={ACCENT} opacity="0.65" />
            <circle cx="38" cy="32" r="2" fill={ACCENT} opacity="0.65" />
            <circle cx="44" cy="30" r="2" fill={ACCENT} opacity="0.65" />
            <circle cx="50" cy="32" r="2" fill={ACCENT} opacity="0.65" />
            <ellipse cx="68" cy="26" rx="6" ry="9" fill={ACCENT} />
            <circle cx="62" cy="16" r="2" fill={ACCENT} />
            <circle cx="68" cy="14" r="2" fill={ACCENT} />
            <circle cx="74" cy="16" r="2" fill={ACCENT} />
          </svg>
        </div>

        <div style={{ marginTop: 32, animation: 'lbRiseIn 600ms 100ms both' }}>
          <div
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 44,
              lineHeight: 0.92,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            Walk
            <br />
            your gym.
          </div>
          <div
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              fontSize: 15,
              color: '#8ea0c4',
              marginTop: 18,
              maxWidth: 320,
              lineHeight: 1.55,
            }}
          >
            At each station, frame your phone, snap a photo, describe the setup, then move on.
            We&apos;ll do the rest.
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {STEPS.map(([n, t, sub], i) => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                animation: `lbRiseIn 500ms ${300 + i * 100}ms both`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: `1px solid ${ACCENT}66`,
                  color: ACCENT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-russo), sans-serif',
                    fontSize: 15,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {t}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-nunito), sans-serif',
                    fontSize: 13,
                    color: '#8ea0c4',
                    marginTop: 1,
                  }}
                >
                  {sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 24px 32px', position: 'relative', zIndex: 1 }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            height: 56,
            background: ACCENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 32px ${ACCENT}55`,
            animation: 'lbRiseIn 600ms 700ms both',
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
            I&apos;m ready
          </span>
        </button>
        <div
          style={{
            textAlign: 'center',
            marginTop: 14,
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 10,
            letterSpacing: '0.26em',
            color: '#3e4d70',
            textTransform: 'uppercase',
            animation: 'lbRiseIn 600ms 850ms both',
          }}
        >
          Tip · use one hand
        </div>
      </div>
    </div>
  )
}
