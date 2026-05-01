'use client'

import CaptureStrip from './CaptureStrip'
import type { WalkthroughStation } from './types'

interface Props {
  station: number
  photoUrl: string
  stations: WalkthroughStation[]
  newStationId: string | null
  onRecord: () => void
  onRetake: () => void
  onDone: () => void
}

const DOCK_H = 148
const RED = '#ef4444'

export default function W3Ready({ station, photoUrl, stations, newStationId, onRecord, onRetake, onDone }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.75) 100%)',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onRetake}
        style={{
          position: 'absolute',
          top: 56,
          left: 16,
          zIndex: 30,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="Retake photo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div
        style={{
          position: 'absolute',
          top: 62,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 30,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 10,
            letterSpacing: '0.28em',
            color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase',
          }}
        >
          Station {station}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: DOCK_H + 66 + 20,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 30,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 12,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          padding: '0 24px',
        }}
      >
        Tap to describe how this station runs
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: DOCK_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onRetake}
            style={{
              position: 'absolute',
              left: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(6,10,28,0.7)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.18)',
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="square">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1015.42-5.36L23 4" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-russo), sans-serif',
                fontSize: 10,
                letterSpacing: '0.22em',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              Retake
            </span>
          </button>

          <button
            type="button"
            onClick={onRecord}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: RED,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 32px ${RED}88, 0 0 0 5px rgba(239,68,68,0.18)`,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Start recording"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0014 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="9" y1="22" x2="15" y2="22" />
            </svg>
          </button>
        </div>

        <CaptureStrip stations={stations} newStationId={newStationId} onDone={onDone} />
      </div>
    </div>
  )
}
