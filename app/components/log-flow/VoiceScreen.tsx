'use client'

import { useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, LF, LiveTranscript, MicState, VoiceControlBar } from './atoms'

const CAROUSEL_H = 380

// ─── full-bleed carousel (30px peek only when multiple photos) ───────────
function PhotoCarousel({ urls, accent }: { urls: string[]; accent: string }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const multi = urls.length > 1

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const slideW = el.clientWidth - 30
    const i = Math.round(el.scrollLeft / slideW)
    if (i !== active) setActive(i)
  }

  return (
    <div style={{ width: '100%', position: 'relative', flexShrink: 0, height: CAROUSEL_H }}>
      <div
        ref={scrollRef}
        onScroll={multi ? handleScroll : undefined}
        style={{
          display: 'flex',
          overflowX: multi ? 'auto' : 'hidden',
          overflowY: 'hidden',
          scrollSnapType: multi ? 'x mandatory' : 'none',
          height: '100%',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {urls.length > 0 ? (
          urls.map((url, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                // single photo: full width; multiple: leave 30px peek of next
                width: multi ? 'calc(100% - 30px)' : '100%',
                height: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                background: LF.bgDeep,
              }}
            >
              <img
                src={url}
                alt=""
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))
        ) : (
          // no photos yet: gradient placeholder
          <div
            style={{
              flexShrink: 0,
              width: '100%',
              height: '100%',
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${accent}1a 0%, transparent 70%), ${LF.bgDeep}`,
            }}
          />
        )}
        {/* trailing spacer lets the last multi-photo slide snap fully */}
        {multi && <div style={{ flexShrink: 0, width: 30, height: '100%' }} />}
      </div>

      {/* dots — only when 2+ photos */}
      {multi && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {urls.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#fff',
                opacity: i === active ? 1 : 0.45,
                transition: 'opacity 220ms',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main screen ─────────────────────────────────────────────────────────
export default function VoiceScreen({
  state,
  photoPreviewUrls,
  transcript,
  onStart,
  onPause,
  onRedo,
  onDone,
  onBack,
  onClose,
  accent = ACCENT,
}: {
  state: MicState
  type: ComponentType        // kept for caller compatibility; not used in body
  photoPreviewUrls: string[]
  transcript: string
  onStart: () => void
  onPause: () => void
  onRedo: () => void
  onDone: () => void
  onBack: () => void
  onClose?: () => void
  step?: number              // kept for caller compatibility; not used in body
  accent?: string
}) {
  const transcriptWords = transcript.trim().length > 0 ? transcript.trim().split(/\s+/) : []

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
      {/* In-flow header — BACK + X only */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px 10px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
        }}
      >
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
            minHeight: 44,
            minWidth: 44,
            padding: '12px 8px',
            margin: '-12px -8px',
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
        <button
          type="button"
          onClick={onClose ?? onBack}
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
      </div>

      {/* Ambient gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 40% at 50% 45%, ${accent}${state === 'recording' ? '22' : '14'} 0%, transparent 70%)`,
          transition: 'background 500ms',
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <PhotoCarousel urls={photoPreviewUrls} accent={accent} />

        {/* Middle — live words when recording, empty otherwise */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {state === 'recording' && (
            <LiveTranscript accent={accent} words={transcriptWords} />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <VoiceControlBar
          state={state}
          accent={accent}
          onStart={onStart}
          onPause={onPause}
          onRedo={onRedo}
          onDone={onDone}
        />
      </div>
    </div>
  )
}
