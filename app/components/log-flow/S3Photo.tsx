'use client'

import { useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import { ACCENT, Chrome, LF, Press, PrimaryBtn } from './atoms'
import BottomSheet from '@/app/components/ui/BottomSheet'

const MAX_PHOTOS = 5

function IconCamera({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

function IconGallery({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth="1.5" />
      <polyline points="21 15 16 10 5 21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Shared row for the add-photo bottom sheet
function SheetRow({
  icon,
  label,
  onClick,
  hasBorder = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  hasBorder?: boolean
}) {
  return (
    <Press
      onClick={onClick}
      ariaLabel={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '16px 24px',
        borderBottom: hasBorder ? `1px solid ${LF.hairline}` : 'none',
        width: '100%',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: LF.hairline,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ fontFamily: LF.body, fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', color: '#fff' }}>
        {label}
      </span>
    </Press>
  )
}

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
  const cameraInputRef  = useRef<HTMLInputElement | null>(null)
  const libraryInputRef = useRef<HTMLInputElement | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const openCamera  = () => { setSheetVisible(false); cameraInputRef.current?.click() }
  const openLibrary = () => { setSheetVisible(false); libraryInputRef.current?.click() }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = MAX_PHOTOS - previewUrls.length
    Array.from(e.target.files ?? []).slice(0, remaining).forEach((file) => onCapture(file))
    e.target.value = ''
  }

  const isEmpty       = previewUrls.length === 0
  const primaryFilled = previewUrls.length > 0
  const allGridFilled = previewUrls.length >= 3
  const canAddMore    = previewUrls.length < MAX_PHOTOS

  const GRID_HEIGHT = 300
  const SLOT_GAP    = 6

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
          background: primaryFilled
            ? `radial-gradient(ellipse 80% 50% at 50% 40%, ${accent}1a 0%, transparent 70%)`
            : 'none',
          transition: 'background 600ms',
        }}
      />

      <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} style={{ display: 'none' }} />
      <input ref={libraryInputRef} type="file" accept="image/*" multiple             onChange={handleChange} style={{ display: 'none' }} />

      <div style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 24px 0',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}>
        {isEmpty ? (
          /* ── Empty state ── */
          <>
            <div style={{ animation: 'lf-rise-in 500ms both' }}>
              <h1 style={{
                fontFamily: LF.display,
                fontSize: 36,
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                margin: '0 0 28px',
                fontWeight: 400,
              }}>
                Show the<br />setup.
              </h1>
            </div>

            <div style={{ background: '#0a0f1e', borderRadius: 20, overflow: 'hidden', animation: 'lf-rise-in 500ms 80ms both' }}>
              <Press
                onClick={() => cameraInputRef.current?.click()}
                ariaLabel="Open camera"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '18px 20px',
                  borderBottom: `1px solid ${LF.hairline}`,
                  width: '100%',
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconCamera size={22} color="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', fontFamily: LF.body, color: '#fff' }}>Open camera.</span>
              </Press>

              <Press
                onClick={() => libraryInputRef.current?.click()}
                ariaLabel="Add from library"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '18px 20px',
                  width: '100%',
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 12, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconGallery size={22} color="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', fontFamily: LF.body, color: '#fff' }}>Add from library.</span>
              </Press>
            </div>
          </>
        ) : (
          /* ── Filled state: 3-slot grid ── */
          <div style={{ animation: 'lf-rise-in 300ms both' }}>
            <div style={{ display: 'flex', gap: SLOT_GAP, height: GRID_HEIGHT }}>

              {/* Large left — slot 0 */}
              <div style={{ flex: 2, height: GRID_HEIGHT }}>
                {previewUrls[0] ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#222' }}>
                    <img src={previewUrls[0]} alt="Photo 1" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {/* 30×30 visible circle; absolute inset extends tap target to ~54pt */}
                    <button
                      onClick={() => onRemove(0)}
                      aria-label="Remove photo 1"
                      style={{ position: 'absolute', top: 0, right: 0, padding: 12, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconTrash size={14} color="#fff" />
                      </div>
                    </button>
                  </div>
                ) : (
                  <Press
                    onClick={() => setSheetVisible(true)}
                    ariaLabel="Add photo"
                    style={{ width: '100%', height: '100%', borderRadius: 12, border: `1.5px dashed ${LF.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <line x1="12" y1="5" x2="12" y2="19" stroke={LF.faint} strokeWidth="2" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" stroke={LF.faint} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Press>
                )}
              </div>

              {/* Right column — slots 1 and 2 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: SLOT_GAP }}>
                {[1, 2].map((slot) => (
                  <div key={slot} style={{ flex: 1 }}>
                    {previewUrls[slot] ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', background: '#222' }}>
                        <img src={previewUrls[slot]} alt={`Photo ${slot + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {/* Transparent padding extends tap target to 44pt */}
                        <button
                          onClick={() => onRemove(slot)}
                          aria-label={`Remove photo ${slot + 1}`}
                          style={{ position: 'absolute', top: 0, right: 0, padding: 10, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconTrash size={12} color="#fff" />
                          </div>
                        </button>
                      </div>
                    ) : (
                      <Press
                        onClick={() => setSheetVisible(true)}
                        ariaLabel="Add photo"
                        style={{ width: '100%', height: '100%', borderRadius: 12, border: `1.5px dashed ${LF.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <line x1="12" y1="5" x2="12" y2="19" stroke={LF.faint} strokeWidth="2" strokeLinecap="round" />
                          <line x1="5" y1="12" x2="19" y2="12" stroke={LF.faint} strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </Press>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overflow thumbnails — photos 4 and 5 */}
            {previewUrls.length > 3 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {previewUrls.slice(3).map((url, i) => (
                  <div key={url} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#222' }}>
                    <img src={url} alt={`Photo ${i + 4}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {/* Transparent padding gives 44pt tap target over 20pt visible circle */}
                    <button
                      onClick={() => onRemove(i + 3)}
                      aria-label={`Remove photo ${i + 4}`}
                      style={{ position: 'absolute', top: 0, right: 0, padding: 10, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconTrash size={10} color="#fff" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add more — shown when grid is full but max not reached */}
            {allGridFilled && canAddMore && (
              <Press
                onClick={() => setSheetVisible(true)}
                ariaLabel="Add more photos"
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '4px 0' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <line x1="12" y1="5" x2="12" y2="19" stroke={LF.dim} strokeWidth="2" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" stroke={LF.dim} strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span style={{ fontFamily: LF.body, fontSize: 13, color: LF.dim }}>Add more photos</span>
              </Press>
            )}

            <div style={{ marginTop: allGridFilled && canAddMore ? 4 : 12, fontFamily: LF.body, fontSize: 12, color: LF.faint }}>
              {previewUrls.length} photo{previewUrls.length !== 1 ? 's' : ''} added
              {canAddMore && ` · up to ${MAX_PHOTOS}`}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px 32px', position: 'relative', zIndex: 1 }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={!primaryFilled}>
          Continue
        </PrimaryBtn>
      </div>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <SheetRow
          icon={<IconCamera size={22} color="#fff" />}
          label="Take a photo"
          onClick={openCamera}
          hasBorder
        />
        <SheetRow
          icon={<IconGallery size={22} color="#fff" />}
          label="Add from library"
          onClick={openLibrary}
        />
      </BottomSheet>
    </div>
  )
}
