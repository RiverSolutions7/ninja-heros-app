'use client'

import Torch from './Torch'

interface Props {
  count: number
  onBackToLibrary: () => void
}

const ACCENT = '#ff5a1f'
const MUTED = '#8ea0c4'

export default function W7Success({ count, onBackToLibrary }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a1232',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 100% 60% at 50% 45%, ${ACCENT}33 0%, transparent 65%)`,
          animation: 'lbFadeIn 600ms both',
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 28px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ animation: 'lbTorchIn 800ms cubic-bezier(.22,1,.36,1) both' }}>
          <div
            style={{
              animation: 'lbFlicker 1.4s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <Torch color={ACCENT} size={64} />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 64,
                  lineHeight: 0.85,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: ACCENT,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-russo), sans-serif',
                  fontSize: 11,
                  letterSpacing: '0.34em',
                  color: MUTED,
                  textTransform: 'uppercase',
                  marginTop: 6,
                }}
              >
                Components
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            width: '60%',
            height: 1,
            background: ACCENT,
            margin: '32px 0 26px',
            animation: 'lbLineGrow 600ms 400ms both',
          }}
        />

        <div style={{ textAlign: 'center', animation: 'lbRiseIn 600ms 500ms both' }}>
          <div
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 38,
              lineHeight: 0.92,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            Logged.
            <br />
            Forever.
          </div>
          <div
            style={{
              fontFamily: 'var(--font-nunito), sans-serif',
              fontSize: 14,
              color: MUTED,
              marginTop: 16,
              maxWidth: 280,
              lineHeight: 1.55,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Your library just grew. Pull these into any plan, any time.
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'lbRiseIn 600ms 700ms both',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              background: ACCENT,
              borderRadius: '50%',
              boxShadow: `0 0 10px ${ACCENT}`,
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 11,
              letterSpacing: '0.28em',
              color: MUTED,
              textTransform: 'uppercase',
            }}
          >
            Walkthrough complete · well done, coach
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '0 24px 32px',
          position: 'relative',
          zIndex: 1,
          animation: 'lbRiseIn 600ms 900ms both',
        }}
      >
        <button
          type="button"
          onClick={onBackToLibrary}
          style={{
            width: '100%',
            height: 56,
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
            Back to library
          </span>
        </button>
      </div>
    </div>
  )
}
