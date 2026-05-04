'use client'

import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, LF, PrimaryBtn, StatusBarLog, TorchLg } from './atoms'

function toOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function Satisfaction({
  count,
  type,
  title,
  onBackToLibrary,
  onLogAnother,
  accent = ACCENT,
}: {
  count: number
  type: ComponentType
  title: string
  onBackToLibrary: () => void
  onLogAnother: () => void
  accent?: string
}) {
  const typeLabel = type === 'game' ? 'GAME' : 'STATION'
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: LF.bg,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <StatusBarLog />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 100% 60% at 50% 50%, ${accent}33 0%, transparent 65%)`,
          animation: 'lf-fade-in 600ms both',
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
        <div style={{ animation: 'lf-torch-in 800ms cubic-bezier(.22,1,.36,1) both' }}>
          <div
            style={{
              animation: 'lf-flicker 1.4s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <TorchLg color={accent} size={72} />
            <div>
              <div
                style={{
                  fontFamily: LF.display,
                  fontSize: 48,
                  lineHeight: 0.9,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: accent,
                }}
              >
                IGNITE
              </div>
              <div
                style={{
                  fontFamily: LF.display,
                  fontSize: 14,
                  letterSpacing: '0.38em',
                  color: LF.muted,
                  textTransform: 'uppercase',
                  marginTop: 8,
                }}
              >
                COACH HUB
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          style={{
            width: '60%',
            height: 1,
            background: accent,
            margin: '32px 0 28px',
            animation: 'lf-line-grow 600ms 400ms both',
          }}
        />

        <div style={{ textAlign: 'center', animation: 'lf-rise-in 600ms 500ms both' }}>
          <div
            style={{
              fontFamily: LF.display,
              fontSize: 44,
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            Logged.
            <br />
            Forever.
          </div>
          <p
            style={{
              fontFamily: LF.body,
              fontSize: 14,
              color: LF.muted,
              marginTop: 16,
              maxWidth: 280,
              lineHeight: 1.5,
              marginInline: 'auto',
            }}
          >
            {title} is in your library. Pull it into any plan, any time.
          </p>
        </div>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'lf-rise-in 600ms 700ms both',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              background: accent,
              borderRadius: '50%',
              boxShadow: `0 0 10px ${accent}`,
            }}
          />
          <div
            style={{
              fontFamily: LF.display,
              fontSize: 11,
              letterSpacing: '0.28em',
              color: LF.muted,
              textTransform: 'uppercase',
            }}
          >
            {toOrdinal(count).toUpperCase()} {typeLabel} · WELL DONE, COACH
          </div>
        </div>
      </div>

      <div style={{ padding: '0 24px 32px', position: 'relative', zIndex: 1, animation: 'lf-rise-in 600ms 900ms both' }}>
        <PrimaryBtn accent={accent} onClick={onBackToLibrary}>
          Back to library
        </PrimaryBtn>
        <button
          type="button"
          onClick={onLogAnother}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            marginTop: 6,
            minHeight: 44,
            background: 'transparent',
            border: 'none',
            fontFamily: LF.display,
            fontSize: 10,
            letterSpacing: '0.28em',
            color: LF.faint,
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '14px 0',
          }}
        >
          LOG ANOTHER
        </button>
      </div>
    </div>
  )
}
