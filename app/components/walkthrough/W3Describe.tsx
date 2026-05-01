'use client'

import { useEffect, useState } from 'react'
import CaptureStrip from './CaptureStrip'
import Waveform from './Waveform'
import type { WalkthroughStation } from './types'

interface Props {
  station: number
  photoUrl: string
  stations: WalkthroughStation[]
  newStationId: string | null
  onStop: () => void
  onRetake: () => void
  onDone: () => void
}

const DOCK_H = 148
const RED = '#ef4444'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function W3Describe({ station, photoUrl, stations, newStationId, onStop, onRetake, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [])

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
              'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.78) 100%)',
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
        aria-label="Retake"
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
          top: 104,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 30,
          animation: 'lbRiseIn 320ms both',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 320 }}>
          <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: RED,
                animation: 'lbBlink 1.2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '50%',
                border: `1px solid ${RED}`,
                animation: 'lbPulseRing 1.6s ease-out infinite',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 11,
              letterSpacing: '0.22em',
              color: RED,
              textTransform: 'uppercase',
            }}
          >
            REC
          </span>
          <span
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 13,
              color: '#fff',
              letterSpacing: '0.04em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(elapsed)}
          </span>
          <Waveform />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: DOCK_H + 66 + 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 30,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 13,
          letterSpacing: '0.22em',
          color: '#fff',
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        Tap stop when done
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

          <div
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: `2px solid ${RED}`,
                animation: 'lbPulseRing 1.6s ease-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: `2px solid ${RED}`,
                animation: 'lbPulseRing 1.6s ease-out 0.6s infinite',
              }}
            />
            <button
              type="button"
              onClick={onStop}
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
              aria-label="Stop recording"
            >
              <div style={{ width: 26, height: 26, background: '#fff' }} />
            </button>
          </div>
        </div>

        <CaptureStrip stations={stations} newStationId={newStationId} onDone={onDone} />
      </div>
    </div>
  )
}
