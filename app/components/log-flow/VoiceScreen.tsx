'use client'

import { useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import {
  ACCENT,
  AdjustSettings,
  AdjustSheet,
  DEFAULT_ADJUST_SETTINGS,
  LF,
  MicState,
  VoiceControlBar,
} from './atoms'

// Design spec: 320px total zone; cards are 74% wide with 18px radius and peek effect
const CAROUSEL_H   = 320
const CARD_FRAC    = 0.74   // card width = 74% of container
const GAP_FRAC     = 0.04   // gap between cards = 4% of container
// Step between card centers expressed as % of card's own width (for translateX)
const STEP_OF_CARD = (CARD_FRAC + GAP_FRAC) / CARD_FRAC  // ≈ 1.054

// ─── Carousel — 74%-wide cards, peek effect, drag to advance ─────────────────
function PhotoCarousel({ urls, accent }: { urls: string[]; accent: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive]   = useState(0)
  const [drag, setDrag]       = useState(0)
  const dragStart             = useRef<number | null>(null)
  const didDrag               = useRef(false)

  const items = urls.length > 0 ? urls : [null as unknown as string]
  const multi = items.length > 1
  const DOTS_H  = 30
  const CARDS_H = CAROUSEL_H - DOTS_H

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragStart.current = e.clientX
    didDrag.current   = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return
    const d = e.clientX - dragStart.current
    if (Math.abs(d) > 18) didDrag.current = true
    setDrag(d)
  }
  function onPointerUp() {
    if (didDrag.current) {
      if (drag < -40 && active < items.length - 1) setActive(a => a + 1)
      if (drag >  40 && active > 0)                setActive(a => a - 1)
    }
    setDrag(0)
    dragStart.current = null
    didDrag.current   = false
  }

  return (
    <div style={{ width: '100%', flexShrink: 0, height: CAROUSEL_H }}>
      {/* Card track */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: CARDS_H,
          overflow: 'hidden',
          cursor: multi ? 'grab' : 'default',
          userSelect: 'none',
        }}
        onPointerDown={multi ? onPointerDown : undefined}
        onPointerMove={multi ? onPointerMove : undefined}
        onPointerUp={multi ? onPointerUp : undefined}
        onPointerCancel={multi ? onPointerUp : undefined}
      >
        {items.map((url, i) => {
          const containerW = containerRef.current?.clientWidth ?? 390
          const cardW      = containerW * CARD_FRAC
          const offset     = i - active
          // translateX in % of card's own width
          const dragPct    = (drag / cardW) * 100
          const xPct       = offset * STEP_OF_CARD * 100 + dragPct
          const absOffset  = Math.abs(offset)
          const isActive   = offset === 0
          const scale      = isActive ? 1 : 0.92
          const opacity    = absOffset === 0 ? 1 : absOffset === 1 ? 0.55 : 0.25
          const animated   = drag === 0

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left:         `${(1 - CARD_FRAC) / 2 * 100}%`,
                width:        `${CARD_FRAC * 100}%`,
                top: 0,
                height:       '100%',
                borderRadius: 18,
                overflow:     'hidden',
                background:   url
                  ? LF.bgDeep
                  : `radial-gradient(ellipse 80% 60% at 50% 50%, ${accent}1a 0%, transparent 70%), ${LF.bgDeep}`,
                transform:    `translateX(${xPct}%) scale(${scale})`,
                opacity,
                transition:   animated
                  ? 'transform 380ms cubic-bezier(0.32,0.72,0,1), opacity 380ms ease'
                  : 'none',
                boxShadow:    isActive
                  ? '0 24px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)'
                  : 'none',
                willChange:   'transform',
              }}
            >
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  aria-hidden
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                />
              )}
              {/* Bottom gradient vignette */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* Pagination dots — only when multiple photos */}
      <div style={{ height: DOTS_H, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        {multi && items.map((_, i) => (
          <div
            key={i}
            style={{
              width:        i === active ? 18 : 6,
              height:       6,
              borderRadius: 3,
              background:   i === active ? accent : 'rgba(255,255,255,0.22)',
              transition:   'width 280ms ease, background 280ms ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── CoachNotesFocusCard — tappable card replacing the chip list ──────────────
const SETTING_LABELS: Record<keyof AdjustSettings, string> = {
  coachingCues: 'Coaching Cues',
  skills: 'Skills',
  equipment: 'Equipment',
  duration: 'Duration',
}

function CoachNotesFocusCard({
  opacity,
  settings,
  onTap,
}: {
  opacity: number
  settings: AdjustSettings
  onTap: () => void
}) {
  const activeLabels = (Object.keys(settings) as (keyof AdjustSettings)[])
    .filter((k) => settings[k])
    .map((k) => SETTING_LABELS[k])
  const subtitle =
    activeLabels.length === 0
      ? 'Nothing active — tap to configure'
      : activeLabels.join(' · ')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap() }}
      aria-label="Coach Notes Focus — tap to adjust"
      style={{
        opacity,
        transition: 'opacity 320ms ease',
        margin: '0 16px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Image zone — phone frame with mic icon */}
      <div style={{ background: LF.bgDeep, padding: '16px 0 12px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 160,
            height: 80,
            borderRadius: 16,
            background: '#0a0e1e',
            border: '1px solid rgba(255,255,255,0.14)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Dynamic island */}
          <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 36, height: 9, borderRadius: 999, background: '#000' }} />
          {/* Status bar */}
          <div style={{ position: 'absolute', top: 6, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: LF.body, fontWeight: 600 }}>9:41</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="rgba(255,255,255,0.7)">
                <rect x="0" y="5" width="2" height="3" rx="0.5" />
                <rect x="3" y="3" width="2" height="5" rx="0.5" />
                <rect x="6" y="1" width="2" height="7" rx="0.5" />
                <rect x="9" y="0" width="2" height="8" rx="0.5" opacity="0.35" />
              </svg>
              <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
                <rect x="0.5" y="0.5" width="10" height="6" rx="1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                <rect x="1.5" y="1.5" width="7" height="4" rx="0.5" fill="rgba(255,255,255,0.7)" />
                <path d="M11.5 2.5v2" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          {/* Mic icon */}
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', color: ACCENT }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Text zone */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 700, color: '#fff', fontFamily: LF.body }}>
            Coach Notes Focus
          </p>
          <p style={{ margin: 0, fontSize: 13, color: LF.muted, fontFamily: LF.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </p>
        </div>
        <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke={LF.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l6 6-6 6" />
        </svg>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VoiceScreen({
  state,
  photoPreviewUrls,
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
  const [adjustSettings, setAdjustSettings] = useState<AdjustSettings>(DEFAULT_ADJUST_SETTINGS)

  const isRecording = state === 'recording'

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
            width: 44,
            height: 44,
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

        {/* Dark spacer */}
        <div style={{ flex: 1, minHeight: 0 }} />
      </div>

      {/* Bottom zone: focus card + pill */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        {/* Coach Notes Focus card */}
        <div style={{ paddingBottom: 10 }}>
          <CoachNotesFocusCard
            opacity={chipsOpacity}
            settings={adjustSettings}
            onTap={() => setAdjustOpen(true)}
          />
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
      <AdjustSheet
        visible={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        settings={adjustSettings}
        onToggle={(key) => setAdjustSettings((s) => ({ ...s, [key]: !s[key] }))}
      />
    </div>
  )
}
