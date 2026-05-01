'use client'

import { useEffect, useRef } from 'react'
import type { WalkthroughStation } from './types'

interface Props {
  stations: WalkthroughStation[]
  newStationId: string | null
  onDone: () => void
}

export default function CaptureStrip({ stations, newStationId, onDone }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && stations.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [stations.length])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 66,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 9,
          letterSpacing: '0.26em',
          color: 'rgba(255,255,255,0.32)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          minWidth: 64,
        }}
      >
        {stations.length} CAPTURED
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {stations.length === 0 && (
          <div
            style={{
              fontFamily: 'var(--font-russo), sans-serif',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.15)',
              textTransform: 'uppercase',
            }}
          >
            NO CAPTURES YET
          </div>
        )}
        {stations.map((s) => (
          <div
            key={s.id}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: s.id === newStationId ? 'lbSlideIn 420ms cubic-bezier(.22,1,.36,1) both' : undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.photoUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>

      {stations.length > 0 && (
        <button
          type="button"
          onClick={onDone}
          style={{
            flexShrink: 0,
            padding: '7px 14px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-russo), sans-serif',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'rgba(255,255,255,0.85)',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          DONE
        </button>
      )}
    </div>
  )
}
