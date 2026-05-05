'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, LiveTranscript, MicState, StatusBarLog, VoiceControlBar } from './atoms'

const CAROUSEL_H = 380

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

// ─── full-bleed carousel (30px peek of the next slide) ───────────────────
function PhotoCarousel({
  urls,
  accent,
}: {
  urls: string[]
  accent: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const [frameW, setFrameW] = useState(390)

  useEffect(() => {
    const el = scrollRef.current
    if (el) setFrameW(el.clientWidth)
  }, [])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const slideW = frameW - 30
    const i = Math.round(el.scrollLeft / slideW)
    if (i !== active) setActive(i)
  }

  const hasPhotos = urls.length > 0

  return (
    <div style={{ width: '100%', position: 'relative', flexShrink: 0, height: CAROUSEL_H }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          height: '100%',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {hasPhotos ? (
          urls.map((url, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: 'calc(100% - 30px)',
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
          // empty: single gradient placeholder
          <div
            style={{
              flexShrink: 0,
              width: '100%',
              height: '100%',
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${accent}1a 0%, transparent 70%), ${LF.bgDeep}`,
            }}
          />
        )}
        {/* trailing spacer so the last photo can snap fully */}
        {hasPhotos && <div style={{ flexShrink: 0, width: 30, height: '100%' }} />}
      </div>

      {/* dot indicators */}
      {urls.length > 1 && (
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
  type,
  photoPreviewUrls,
  transcript,
  onStart,
  onPause,
  onRedo,
  onDone,
  onBack,
  onClose,
  step = 3,
  accent = ACCENT,
}: {
  state: MicState
  type: ComponentType
  photoPreviewUrls: string[]
  transcript: string
  onStart: () => void
  onPause: () => void
  onRedo: () => void
  onDone: () => void
  onBack: () => void
  onClose?: () => void
  step?: number
  accent?: string
}) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state !== 'recording') {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const tick = setInterval(() => setElapsed((Date.now() - start) / 1000), 250)
    return () => clearInterval(tick)
  }, [state])

  const chromeLabel =
    state === 'parsing'
      ? 'STEP · 05 / PARSING'
      : state === 'recording'
      ? 'STEP · 04 / RECORDING'
      : state === 'paused'
      ? 'STEP · 04 / PAUSED'
      : 'STEP · 04 / VOICE'

  const transcriptWords = transcript.trim().length > 0 ? transcript.trim().split(/\s+/) : []
  const subjectLabel = type === 'game' ? 'game' : 'station'

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
      <Chrome
        step={step}
        total={5}
        accent={accent}
        label={chromeLabel}
        onBack={onBack}
        onClose={onClose ?? onBack}
      />

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

      {/* Content — below the absolute Chrome (44px status + ~46px chrome = ~90px) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 90,
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Full-bleed photo carousel */}
        <PhotoCarousel urls={photoPreviewUrls} accent={accent} />

        {/* Middle — transcript or idle heading */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: state === 'recording' ? 'flex-start' : 'center',
            minHeight: 0,
          }}
        >
          {state === 'recording' ? (
            <LiveTranscript accent={accent} words={transcriptWords} />
          ) : (
            <div style={{ padding: '0 24px', animation: 'lf-rise-in 600ms 120ms both' }}>
              <div
                style={{
                  fontFamily: LF.display,
                  fontSize: 28,
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: state === 'parsing' ? accent : '#fff',
                }}
              >
                {state === 'parsing' ? (
                  <>
                    Reading your
                    <br />
                    notes…
                  </>
                ) : state === 'paused' ? (
                  <>
                    Paused.
                    <br />
                    Ready when you are.
                  </>
                ) : (
                  <>
                    Describe your
                    <br />
                    {subjectLabel}.
                  </>
                )}
              </div>
              <div
                style={{
                  fontFamily: LF.body,
                  fontSize: 13,
                  color: LF.muted,
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                {state === 'parsing'
                  ? 'Pulling out title, duration, cues.'
                  : state === 'paused'
                  ? 'Tap ✓ to save or ↺ to re-record.'
                  : "No fields. Just talk. We'll fill the form."}
              </div>
            </div>
          )}
        </div>

        {/* Elapsed timer — recording only */}
        {state === 'recording' && (
          <div style={{ padding: '8px 24px 4px', flexShrink: 0, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: LF.display,
                fontSize: 10,
                letterSpacing: '0.24em',
                color: LF.faint,
                textTransform: 'uppercase',
              }}
            >
              {formatElapsed(elapsed)} · Listening… just talk
            </div>
          </div>
        )}
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
