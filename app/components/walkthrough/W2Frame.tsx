'use client'

import { useRef } from 'react'
import CaptureStrip from './CaptureStrip'
import type { WalkthroughStation } from './types'

interface Props {
  station: number
  stations: WalkthroughStation[]
  newStationId: string | null
  onPhoto: (file: File) => void
  onClose: () => void
  onDone: () => void
}

const DOCK_H = 136
const STRIP_H = 66

function ViewfinderCorners() {
  const arm = 28
  const t = 2.5
  const color = 'rgba(255,255,255,0.85)'
  const positions: React.CSSProperties[] = [
    { top: 90, left: 36 },
    { top: 90, right: 36 },
    { bottom: 200, left: 36 },
    { bottom: 200, right: 36 },
  ]
  return (
    <>
      {positions.map((pos, i) => {
        const isTop = pos.top !== undefined
        const isLeft = pos.left !== undefined
        return (
          <div key={i} style={{ position: 'absolute', width: arm, height: arm, ...pos }}>
            <div
              style={{
                position: 'absolute',
                width: arm,
                height: t,
                background: color,
                top: isTop ? 0 : undefined,
                bottom: isTop ? undefined : 0,
                left: isLeft ? 0 : undefined,
                right: isLeft ? undefined : 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: t,
                height: arm,
                background: color,
                top: isTop ? 0 : undefined,
                bottom: isTop ? undefined : 0,
                left: isLeft ? 0 : undefined,
                right: isLeft ? undefined : 0,
              }}
            />
          </div>
        )
      })}
    </>
  )
}

export default function W2Frame({ station, stations, newStationId, onPhoto, onClose, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleShutter() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onPhoto(file)
    e.target.value = ''
  }

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #1a1a1f 0%, #050505 90%)',
        }}
      />

      <ViewfinderCorners />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={onClose}
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
        aria-label="Exit walkthrough"
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
          bottom: DOCK_H + STRIP_H + 22,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 30,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 12,
          letterSpacing: '0.24em',
          color: 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase',
        }}
      >
        Frame the station
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
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 60%)',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={handleShutter}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#fff',
              border: '5px solid rgba(255,255,255,0.4)',
              boxShadow: '0 0 0 2px #fff, 0 0 24px rgba(255,255,255,0.25)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Take photo"
          />
        </div>

        <CaptureStrip stations={stations} newStationId={newStationId} onDone={onDone} />
      </div>
    </div>
  )
}
