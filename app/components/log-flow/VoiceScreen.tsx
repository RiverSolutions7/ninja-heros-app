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
        margin: '20px 16px 0',
        borderRadius: 20,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.018) 100%)',
        border: '1px solid rgba(255,255,255,0.03)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.22), 0 10px 24px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.02)',
        cursor: 'pointer',
      }}
    >
      {/* Phone bezel image zone */}
      <div style={{
        height: 148,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        position: 'relative',
      }}>
        {/* Subtle orange glow behind phone */}
        <div style={{
          position: 'absolute',
          bottom: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,92,0,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Phone SVG — cropped at bottom, showing top portion only */}
        <svg
          width="128" height="208" viewBox="0 0 128 208" fill="none"
          style={{ marginBottom: -72, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
        >
          <defs>
            <linearGradient id="cnf-phoneFrame" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3a4258"/>
              <stop offset="22%" stopColor="#1d2333"/>
              <stop offset="50%" stopColor="#10131e"/>
              <stop offset="78%" stopColor="#1d2333"/>
              <stop offset="100%" stopColor="#3a4258"/>
            </linearGradient>
            <linearGradient id="cnf-phoneInner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0e1a"/>
              <stop offset="100%" stopColor="#050810"/>
            </linearGradient>
            <linearGradient id="cnf-phoneScreen" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0%" stopColor="#10162a"/>
              <stop offset="55%" stopColor="#0b1020"/>
              <stop offset="100%" stopColor="#080c18"/>
            </linearGradient>
            <linearGradient id="cnf-screenGloss" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.10)"/>
              <stop offset="35%" stopColor="rgba(255,255,255,0.00)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0.00)"/>
            </linearGradient>
          </defs>
          {/* Outer metal frame */}
          <rect x="0" y="0" width="128" height="208" rx="22" fill="url(#cnf-phoneFrame)"/>
          {/* Inner bezel */}
          <rect x="3" y="3" width="122" height="202" rx="20" fill="url(#cnf-phoneInner)"/>
          {/* Screen */}
          <rect x="6" y="6" width="116" height="196" rx="17" fill="url(#cnf-phoneScreen)"/>
          {/* Screen gloss */}
          <rect x="6" y="6" width="116" height="196" rx="17" fill="url(#cnf-screenGloss)"/>
          {/* Side buttons */}
          <rect x="-0.5" y="36" width="2" height="14" rx="1" fill="#0a0d16"/>
          <rect x="-0.5" y="58" width="2" height="22" rx="1" fill="#0a0d16"/>
          <rect x="-0.5" y="86" width="2" height="22" rx="1" fill="#0a0d16"/>
          <rect x="126.5" y="50" width="2" height="34" rx="1" fill="#0a0d16"/>
          {/* Dynamic Island */}
          <rect x="44" y="13" width="40" height="13" rx="6.5" fill="#000"/>
          <circle cx="76" cy="19.5" r="1.6" fill="#0a1626"/>
          <circle cx="76" cy="19.5" r="0.7" fill="#1a2940"/>
          {/* Status bar */}
          <text x="16" y="22" fontFamily="-apple-system, system-ui" fontSize="6.5" fontWeight="600" fill="rgba(255,255,255,0.85)">9:41</text>
          <g transform="translate(98 16.5)">
            <rect x="0" y="3" width="1.5" height="3" rx="0.4" fill="rgba(255,255,255,0.85)"/>
            <rect x="2.2" y="2" width="1.5" height="4" rx="0.4" fill="rgba(255,255,255,0.85)"/>
            <rect x="4.4" y="1" width="1.5" height="5" rx="0.4" fill="rgba(255,255,255,0.85)"/>
            <rect x="6.6" y="0" width="1.5" height="6" rx="0.4" fill="rgba(255,255,255,0.85)"/>
            <rect x="10" y="0" width="9" height="6" rx="1.4" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" fill="none"/>
            <rect x="11" y="1" width="6.5" height="4" rx="0.7" fill="rgba(255,255,255,0.85)"/>
          </g>
          {/* Mic icon */}
          <g transform="translate(64 82)">
            <rect x="-12" y="-22" width="24" height="38" rx="12" fill="#FF5C00"/>
            <rect x="-12" y="-22" width="24" height="19" rx="12" fill="rgba(255,255,255,0.12)"/>
            <path d="M-20 6 a20 20 0 0 0 40 0" stroke="#FF5C00" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <line x1="0" y1="26" x2="0" y2="36" stroke="#FF5C00" strokeWidth="3" strokeLinecap="round"/>
            <line x1="-10" y1="36" x2="10" y2="36" stroke="#FF5C00" strokeWidth="3" strokeLinecap="round"/>
          </g>
          {/* Home indicator */}
          <rect x="46" y="194" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.32)"/>
          {/* Frame highlight */}
          <rect x="0.5" y="0.5" width="127" height="207" rx="21.5" stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" fill="none"/>
        </svg>
      </div>

      {/* Title + subtitle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: 'rgba(255,255,255,0.94)',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.015em',
            fontFamily: '-apple-system, "SF Pro Display", system-ui',
            lineHeight: 1.2,
          }}>
            Coach Notes Focus
          </div>
          <div style={{
            marginTop: 4,
            color: 'rgba(255,255,255,0.38)',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: '-0.004em',
            fontFamily: '-apple-system, "SF Pro Text", system-ui',
            lineHeight: 1.45,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {subtitle}
          </div>
        </div>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="rgba(255,255,255,0.24)" strokeWidth="1.6" strokeLinecap="round"/>
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
