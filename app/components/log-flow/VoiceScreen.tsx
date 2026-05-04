'use client'

import { useEffect, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, LiveTranscript, MicButton, MicState, StatusBarLog, Waveform } from './atoms'

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

export default function VoiceScreen({
  state,
  type,
  photoPreviewUrls,
  transcript,
  onMicTap,
  onBack,
  onClose,
  step = 3,
  accent = ACCENT,
}: {
  state: MicState
  type: ComponentType
  photoPreviewUrls: string[]
  transcript: string
  onMicTap: () => void
  onBack: () => void
  onClose?: () => void
  step?: number
  accent?: string
}) {
  const [elapsed, setElapsed] = useState(0)

  const firstPhotoUrl = photoPreviewUrls[0] ?? null
  const photoCount = photoPreviewUrls.length

  useEffect(() => {
    if (state !== 'recording') {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const tick = setInterval(() => setElapsed((Date.now() - start) / 1000), 250)
    return () => clearInterval(tick)
  }, [state])

  const promptHeading = state === 'parsing' ? 'Reading your notes…' : `Describe your ${type === 'game' ? 'game' : 'station'}.`
  const promptSub =
    state === 'parsing' ? 'Pulling out title, duration, cues.' : "No fields. Just talk. We'll fill the form."

  const chromeLabel =
    state === 'parsing' ? 'STEP · 05 / PARSING' : state === 'recording' ? 'STEP · 04 / RECORDING' : 'STEP · 04 / VOICE'

  const transcriptWords = transcript.trim().length > 0 ? transcript.trim().split(/\s+/) : []

  const photoReadyLabel = photoCount > 1 ? `${photoCount} photos ready` : 'Photo ready'

  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBarLog />
      <Chrome step={step} total={5} accent={accent} label={chromeLabel} onBack={onBack} onClose={onClose ?? onBack} />

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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 0 0',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {state === 'recording' ? (
          <div
            style={{
              width: '100%',
              height: 90,
              marginBottom: 24,
              flexShrink: 0,
              position: 'relative',
              animation: 'lf-rise-in 300ms both',
            }}
          >
            {firstPhotoUrl && (
              <img
                src={firstPhotoUrl}
                alt=""
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ position: 'absolute', inset: 0, border: `1px solid ${accent}55` }} />
          </div>
        ) : (
          <div
            style={{
              width: 'calc(100% - 48px)',
              height: 64,
              marginBottom: 28,
              flexShrink: 0,
              position: 'relative',
              animation: 'lf-rise-in 600ms both',
              border: `1px solid ${accent}44`,
            }}
          >
            {firstPhotoUrl && (
              <img
                src={firstPhotoUrl}
                alt=""
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,28,0.35)' }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="square">
                <path d="M3 7h4l2-2h6l2 2h4v13H3z" />
                <circle cx="12" cy="13.5" r="3.5" />
              </svg>
              <span
                style={{
                  fontFamily: LF.display,
                  fontSize: 9,
                  letterSpacing: '0.24em',
                  color: accent,
                  textTransform: 'uppercase',
                }}
              >
                {photoReadyLabel}
              </span>
            </div>
          </div>
        )}

        <div style={{ animation: 'lf-rise-in 600ms 120ms both', padding: '0 24px' }}>
          <MicButton state={state} accent={accent} onClick={onMicTap} />
        </div>

        <div style={{ width: '100%', padding: '0 24px' }}>
          <Waveform accent={accent} active={state === 'recording'} />
        </div>

        {state === 'recording' && (
          <div style={{ width: '100%', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
            <LiveTranscript accent={accent} words={transcriptWords} />
          </div>
        )}

        {state !== 'recording' && (
          <div style={{ marginTop: 28, textAlign: 'center', animation: 'lf-rise-in 600ms 220ms both', padding: '0 24px' }}>
            <div
              style={{
                fontFamily: LF.display,
                fontSize: 22,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
              }}
            >
              {promptHeading}
            </div>
            <div
              style={{
                fontFamily: LF.body,
                fontSize: 13,
                color: LF.muted,
                marginTop: 10,
                maxWidth: 280,
                marginInline: 'auto',
                lineHeight: 1.5,
              }}
            >
              {promptSub}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 24px 32px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: LF.display,
            fontSize: 10,
            letterSpacing: '0.24em',
            color: LF.faint,
            textTransform: 'uppercase',
          }}
        >
          {state === 'idle' && 'TAP MIC TO BEGIN'}
          {state === 'recording' && `${formatElapsed(elapsed)} · TAP MIC TO STOP`}
          {state === 'parsing' && 'WORKING ON IT…'}
        </div>
      </div>
    </div>
  )
}
