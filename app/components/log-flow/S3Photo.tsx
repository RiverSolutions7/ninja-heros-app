'use client'

import { useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, Press, PrimaryBtn } from './atoms'

const MAX_PHOTOS = 5

export default function S3Photo({
  previewUrls,
  onCapture,
  onRemove,
  onNext,
  onBack,
  onClose,
  accent = ACCENT,
  type,
}: {
  previewUrls: string[]
  onCapture: (file: File) => void
  onRemove: (index: number) => void
  onNext: () => void
  onBack: () => void
  onClose?: () => void
  accent?: string
  type: ComponentType
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const libraryInputRef = useRef<HTMLInputElement | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const openCamera = () => { setAddOpen(false); cameraInputRef.current?.click() }
  const openLibrary = () => { setAddOpen(false); libraryInputRef.current?.click() }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = MAX_PHOTOS - previewUrls.length
    Array.from(e.target.files ?? []).slice(0, remaining).forEach((file) => onCapture(file))
    e.target.value = ''
  }

  const subjectLabel = type === 'game' ? 'game' : 'station'
  const hasPhoots = previewUrls.length > 0
  const canAddMore = previewUrls.length < MAX_PHOTOS

  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Chrome step={2} total={5} accent={accent} label="STEP · 03 / PHOTO" onBack={onBack} onClose={onClose ?? onBack} />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: hasPhoots ? `radial-gradient(ellipse 80% 50% at 50% 40%, ${accent}1a 0%, transparent 70%)` : 'none',
          transition: 'background 600ms',
        }}
      />

      <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} style={{ display: 'none' }} />
      <input ref={libraryInputRef} type="file" accept="image/*" multiple             onChange={handleChange} style={{ display: 'none' }} />

      <div style={{ padding: '100px 24px 0', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ animation: 'lf-rise-in 500ms both' }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 36,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Snap the
            <br />
            {subjectLabel}.
          </h1>
        </div>

        <div style={{ marginTop: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!hasPhoots ? (
            /* ── Empty state: two compact cards ── */
            <div style={{ display: 'flex', gap: 10 }}>
              <Press
                onClick={openCamera}
                ariaLabel="Take a photo with camera"
                style={{
                  flex: 1,
                  height: 120,
                  border: `1px solid ${LF.faint}`,
                  background: 'rgba(255,255,255,0.015)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  animation: 'lf-rise-in 500ms 80ms both',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.4" strokeLinecap="square">
                  <path d="M3 7h4l2-2h6l2 2h4v13H3z" />
                  <circle cx="12" cy="13.5" r="3.5" />
                  <circle cx="18.5" cy="9.5" r="0.75" fill={LF.muted} stroke="none" />
                </svg>
                <div style={{ fontFamily: LF.display, fontSize: 10, letterSpacing: '0.28em', color: LF.dim, textTransform: 'uppercase' }}>
                  Camera
                </div>
              </Press>

              <Press
                onClick={openLibrary}
                ariaLabel="Choose photos from library"
                style={{
                  flex: 1,
                  height: 120,
                  border: `1px solid ${LF.faint}`,
                  background: 'rgba(255,255,255,0.015)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  animation: 'lf-rise-in 500ms 160ms both',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.4" strokeLinecap="square">
                  <rect x="3" y="4" width="18" height="16" />
                  <path d="M3 15l5-4 4 3 3-2 6 5" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill={LF.muted} stroke="none" />
                </svg>
                <div style={{ fontFamily: LF.display, fontSize: 10, letterSpacing: '0.28em', color: LF.dim, textTransform: 'uppercase' }}>
                  Library
                </div>
              </Press>
            </div>
          ) : (
            /* ── Filled state: thumbnail row + add ── */
            <div style={{ animation: 'lf-rise-in 300ms both' }}>
              {/* Thumbnail strip */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      width: 88,
                      height: 88,
                      flexShrink: 0,
                      border: `2px solid ${accent}`,
                      boxShadow: `0 0 14px ${accent}44`,
                    }}
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* X button */}
                    <Press
                      onClick={() => onRemove(i)}
                      ariaLabel={`Remove photo ${i + 1}`}
                      rippleColor="rgba(0,0,0,0.3)"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        background: 'rgba(6,10,28,0.85)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="square">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </Press>
                  </div>
                ))}

                {/* Add more card — hidden at MAX_PHOTOS */}
                {canAddMore && (
                  <Press
                    onClick={() => setAddOpen((o) => !o)}
                    ariaLabel="Add another photo"
                    style={{
                      width: 88,
                      height: 88,
                      flexShrink: 0,
                      border: `1.5px dashed ${addOpen ? accent : LF.faint}`,
                      background: addOpen ? `${accent}0a` : 'rgba(255,255,255,0.015)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      transition: 'border-color 200ms, background 200ms',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={addOpen ? accent : LF.faint} strokeWidth="1.8" strokeLinecap="square">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <div style={{ fontFamily: LF.display, fontSize: 8, letterSpacing: '0.2em', color: addOpen ? accent : LF.faint, textTransform: 'uppercase' }}>
                      Add
                    </div>
                  </Press>
                )}
              </div>

              {/* Inline camera/library choice — expands when Add is tapped */}
              {addOpen && (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 12,
                    animation: 'lf-rise-in 200ms both',
                  }}
                >
                  <Press
                    onClick={openCamera}
                    ariaLabel="Take another photo with camera"
                    rippleColor="rgba(0,0,0,0.2)"
                    style={{
                      flex: 1,
                      height: 44,
                      background: 'rgba(6,10,28,0.75)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.6" strokeLinecap="square">
                      <path d="M3 7h4l2-2h6l2 2h4v13H3z" />
                      <circle cx="12" cy="13.5" r="3.5" />
                    </svg>
                    <span style={{ fontFamily: LF.display, fontSize: 9, letterSpacing: '0.22em', color: '#fff', textTransform: 'uppercase' }}>
                      Camera
                    </span>
                  </Press>
                  <Press
                    onClick={openLibrary}
                    ariaLabel="Choose more photos from library"
                    rippleColor="rgba(0,0,0,0.2)"
                    style={{
                      flex: 1,
                      height: 44,
                      background: 'rgba(6,10,28,0.75)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.6" strokeLinecap="square">
                      <rect x="3" y="4" width="18" height="16" />
                      <path d="M3 15l5-4 4 3 3-2 6 5" />
                    </svg>
                    <span style={{ fontFamily: LF.display, fontSize: 9, letterSpacing: '0.22em', color: '#fff', textTransform: 'uppercase' }}>
                      Library
                    </span>
                  </Press>
                </div>
              )}

              {/* Count label */}
              <div style={{ marginTop: 14, fontFamily: LF.body, fontSize: 12, color: LF.faint }}>
                {previewUrls.length} photo{previewUrls.length !== 1 ? 's' : ''} added
                {canAddMore && ` · up to ${MAX_PHOTOS}`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 24px 32px', position: 'relative', zIndex: 1 }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={!hasPhoots}>
          Continue
        </PrimaryBtn>
      </div>
    </div>
  )
}
