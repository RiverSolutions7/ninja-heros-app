'use client'

import { useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import {
  ACCENT,
  AdjustSheet,
  LF,
  LiveTranscript,
  MicState,
  VoiceControlBar,
} from './atoms'

const CAROUSEL_H = 320

// ─── Carousel with new design-spec dots ──────────────────────────────────────
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
                width: multi ? 'calc(100% - 30px)' : '100%',
                height: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                background: LF.bgDeep,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))
        ) : (
          <div
            style={{
              flexShrink: 0,
              width: '100%',
              height: '100%',
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${accent}1a 0%, transparent 70%), ${LF.bgDeep}`,
            }}
          />
        )}
        {multi && <div style={{ flexShrink: 0, width: 30, height: '100%' }} />}
      </div>

      {/* Pagination dots — active: 18×6px pill, inactive: 6×6px circle */}
      {multi && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {urls.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === active ? accent : 'rgba(255,255,255,0.22)',
                transition: 'width 280ms ease, background 280ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Context chips row ────────────────────────────────────────────────────────
// Visual placeholders — functionality wired up in a future pass.
const CHIPS = [
  {
    key: 'cues',
    label: 'Coaching Cues',
    active: true,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    color: '#ff5a1f',
  },
  {
    key: 'skills',
    label: 'Skills',
    active: true,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: '#22c55e',
  },
  {
    key: 'equipment',
    label: 'Equipment',
    active: false,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    key: 'duration',
    label: 'Duration',
    active: false,
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: '#a855f7',
  },
]

function ContextChips({
  opacity,
  onAdjust,
}: {
  opacity: number
  onAdjust: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        opacity,
        transition: 'opacity 320ms ease',
      } as React.CSSProperties}
    >
      {CHIPS.map((chip) => (
        <div
          key={chip.key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            height: 34,
            borderRadius: 999,
            padding: '0 12px',
            background: chip.active
              ? `${chip.color}22`
              : 'rgba(255,255,255,0.08)',
            border: `1px solid ${chip.active ? chip.color + '44' : 'rgba(255,255,255,0.10)'}`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: chip.active ? chip.color : 'rgba(255,255,255,0.55)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {chip.icon}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: chip.active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
              fontFamily: LF.body,
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}
          </span>
        </div>
      ))}

      {/* Adjust chip — rightmost, always visible */}
      <div
        role="button"
        tabIndex={0}
        onClick={onAdjust}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAdjust() }}
        aria-label="Adjust context settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 34,
          borderRadius: 999,
          padding: '0 12px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.10)',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {/* Sliders icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: LF.body,
          }}
        >
          Adjust
        </span>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VoiceScreen({
  state,
  photoPreviewUrls,
  transcript,
  getAmplitude,
  onStart,
  onTypingStart,
  onTypeSubmit,
  onCancel,
  onStop,
  onDone,
  onBack,
  onClose,
  accent = ACCENT,
}: {
  state: MicState
  type: ComponentType        // kept for caller compatibility
  photoPreviewUrls: string[]
  transcript: string
  getAmplitude: () => number
  onStart: () => void
  onTypingStart: () => void
  onTypeSubmit: (text: string) => void
  onCancel: () => void
  onStop: () => void
  onDone: () => void
  onBack: () => void
  onClose?: () => void
  step?: number              // kept for caller compatibility
  accent?: string
}) {
  const [adjustOpen, setAdjustOpen] = useState(false)

  const isRecording = state === 'recording'
  const transcriptWords =
    (state === 'recording' || state === 'stopped') && transcript.trim().length > 0
      ? transcript.trim().split(/\s+/)
      : []

  // Chips fade slightly during recording, more during typing
  const chipsOpacity = isRecording ? 0.4 : state === 'typing' ? 0.3 : 1

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
      {/* Header — dims during recording */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 24px 10px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 20,
          opacity: isRecording ? 0.3 : 1,
          transition: 'opacity 320ms ease',
        }}
      >
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
          background: `radial-gradient(ellipse 70% 40% at 50% 45%, ${accent}${isRecording ? '22' : '14'} 0%, transparent 70%)`,
          transition: 'background 500ms',
        }}
      />

      {/* Vignette overlay — fades in during recording */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center top, transparent 0%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0.32) 100%)',
          opacity: isRecording ? 1 : 0,
          transition: 'opacity 320ms ease',
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

        {/* Live transcript while recording or stopped */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {transcriptWords.length > 0 && (
            <LiveTranscript accent={accent} words={transcriptWords} />
          )}
        </div>
      </div>

      {/* Bottom zone: context chips + pill */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        {/* Context chips */}
        <div style={{ paddingBottom: 10 }}>
          <ContextChips opacity={chipsOpacity} onAdjust={() => setAdjustOpen(true)} />
        </div>

        {/* Pill */}
        <VoiceControlBar
          state={state}
          accent={accent}
          getAmplitude={getAmplitude}
          onStart={onStart}
          onTypingStart={onTypingStart}
          onTypeSubmit={onTypeSubmit}
          onCancel={onCancel}
          onStop={onStop}
          onDone={onDone}
        />
      </div>

      {/* Adjust sheet */}
      <AdjustSheet visible={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  )
}
