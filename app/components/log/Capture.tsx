// @design-locked — built from design-export/capture/frames/8a-photo-loaded.html, 8b-empty.html,
// 8a-w-sort-whisper.html (the pixel truth). Every color/size/radius/opacity here is copied from
// those frames. The photo hero is a natural whole-photo band (clamped 16:9 ↔ 4:5, never cropped) —
// the frame's square placeholder is one instance of that band. Frosted glass is used ONLY over the
// photo (chip, whisper) and stays STATIC; the dock is solid lit navy (see IdleDock).
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useRef, useState } from 'react'
import PhotoActionMenu from '@/app/components/log-flow/PhotoActionMenu'
import IdleDock from './IdleDock'
import WhisperLozenge from './WhisperLozenge'

export interface Photo {
  url: string
  id: string
}

export interface CaptureProps {
  photos: Photo[]
  note: string
  onNoteChange: (v: string) => void
  onAddPhotos: (files: File[]) => void
  onBack: () => void
  showWhisper?: boolean
}

// Clamp the natural aspect (w/h) of the cover photo to the band range [16:9 … 4:5].
const AR_MIN = 4 / 5 // tallest allowed (0.8)
const AR_MAX = 16 / 9 // widest allowed (1.778)

function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TypeChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 8 5" fill="none" aria-hidden="true">
      <path d="M1 1l3 3 3-3" stroke="#9fb0c8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StackCountGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.6" y="1.2" width="8" height="8" rx="2" stroke="#e7eefa" strokeWidth="1.3" transform="rotate(6 7.6 5.2)" />
      <rect x="1.8" y="4.4" width="8" height="8" rx="2" fill="rgba(12,19,34,0.9)" stroke="#e7eefa" strokeWidth="1.3" />
    </svg>
  )
}

// Empty-state photo-stack button glyph (8b) — two offset photo frames, custom 1.5px rounded strokes.
function PhotoStackGlyph() {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" fill="none" aria-hidden="true">
      <rect x="6" y="9" width="24" height="18" rx="4" transform="rotate(-6 18 18)" stroke="#8fa0bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <rect x="12" y="13" width="24" height="18" rx="4" fill="#141c32" stroke="#e7eefa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18.5" cy="18.5" r="1.8" stroke="#e7eefa" strokeWidth="1.3" />
        <path d="M13.5 27.5 L20 21 L24 24.5 L28.5 20 L34.5 27.5" stroke="#e7eefa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// Header — grid 1fr/auto/1fr. Back · type-age chip (static, wired ch.6) · Save (pre-develop only).
function Header({ empty, onBack }: { empty: boolean; onBack: () => void }) {
  // Invisible hit-slop → ≥44px tap targets without moving the visible glyph/text (negative margin
  // cancels the padding so the header grid doesn't shift). Not a design value — a safety dimension.
  const hit: React.CSSProperties = { minHeight: 0, padding: '14px 18px', margin: '-14px -18px' }
  return (
    <div
      style={{
        position: 'absolute',
        top: 46,
        left: 0,
        right: 0,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0px 20px',
        height: 40,
        zIndex: 3,
      }}
    >
      <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={onBack} aria-label="Back" style={{ ...hit, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <BackChevron />
        </button>
      </div>
      <div style={{ justifySelf: 'center', display: 'flex', alignItems: 'center' }}>
        {/* aria-haspopup deliberately omitted until the type/age sheet is wired (chunk 6) so SR
            users aren't told a popup exists that does nothing yet. */}
        <button
          type="button"
          aria-label="Station · Ages 5–7. Change type and ages"
          style={{ ...hit, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, letterSpacing: '-0.1px', color: 'rgb(231,238,250)' }}>
            Station · Ages 5–7
          </span>
          <TypeChevron />
        </button>
      </div>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          aria-label="Save"
          aria-disabled={empty}
          style={{ ...hit, border: 'none', background: 'transparent', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, color: 'rgb(255,255,255)', opacity: empty ? 0.45 : 1, cursor: 'pointer' }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default function Capture({ photos, note, onNoteChange, onAddPhotos, onBack, showWhisper = false }: CaptureProps) {
  const empty = photos.length === 0
  const [typing, setTyping] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coverAspect, setCoverAspect] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const cover = photos[0]
  const bandAspect = coverAspect ? Math.min(AR_MAX, Math.max(AR_MIN, coverAspect)) : 1

  const pickMedia = () => fileRef.current?.click()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onAddPhotos(files)
    e.target.value = ''
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgb(8,12,26)',
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {empty && (
        // Top light wash (8b).
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, background: 'linear-gradient(rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
      )}

      <Header empty={empty} onBack={onBack} />

      {empty ? (
        <div
          style={{
            position: 'absolute',
            inset: '120px 36px 160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 800, fontSize: 27, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'rgb(231,238,250)' }}>
              First, the course.
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)' }}>
              Snap the station as the kids will see it —<br />
              or just describe it with your voice below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Add the course photos"
            aria-haspopup="menu"
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              minHeight: 0,
              padding: 0,
              background: 'rgb(20,28,50)',
              border: '1px solid rgb(42,52,80)',
              boxShadow: 'rgba(255,255,255,0.06) 0px 1px 0px inset, rgba(0,0,0,0.4) 0px 14px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <PhotoStackGlyph />
          </button>
        </div>
      ) : (
        // Photo hero — natural whole-photo band (8a).
        <div
          style={{
            position: 'absolute',
            top: 92,
            left: 8,
            right: 8,
            aspectRatio: String(bandAspect),
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: 'rgba(0,0,0,0.55) 0px 24px 60px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover.url}
            alt="Obstacle course station"
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalWidth && img.naturalHeight) setCoverAspect(img.naturalWidth / img.naturalHeight)
            }}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* bottom scrim */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)', pointerEvents: 'none' }} />

          {/* D2 pill-progress dots (photo carousel position) */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 31, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            {photos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  width: i === 0 ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          {/* frosted stack-count chip (2+ photos) — static blur */}
          {photos.length >= 2 && (
            <div
              role="img"
              aria-label={`${photos.length} photos`}
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0px 11px',
                borderRadius: 14,
                background: 'rgba(12,19,34,0.55)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset',
              }}
            >
              <StackCountGlyph />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 12, color: 'rgb(231,238,250)' }}>
                {photos.length}
              </span>
            </div>
          )}
        </div>
      )}

      {!empty && <WhisperLozenge visible={showWhisper} />}

      <IdleDock
        note={note}
        onNoteChange={onNoteChange}
        typing={typing}
        onOpenTyping={() => setTyping(true)}
        onCloseTyping={() => setTyping(false)}
        onMicTap={() => { /* recording flow — chunk 2 */ }}
      />

      <PhotoActionMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddMedia={pickMedia}
        onReorder={() => { /* PhotoSheet reorder — chunk 7 */ }}
        onParsingSettings={() => { /* parsing settings — later */ }}
        origin="center bottom"
        style={{ left: 55, bottom: 160 }}
      />
    </div>
  )
}
