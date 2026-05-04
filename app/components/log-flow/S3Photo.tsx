'use client'

import { useRef } from 'react'
import { ACCENT, Chrome, LF, Press, PrimaryBtn, StatusBarLog } from './atoms'

export default function S3Photo({
  previewUrl,
  onCapture,
  onNext,
  onBack,
  onClose,
  accent = ACCENT,
}: {
  previewUrl: string | null
  onCapture: (file: File) => void
  onNext: () => void
  onBack: () => void
  onClose?: () => void
  accent?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onCapture(file)
    e.target.value = ''
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: LF.bg, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBarLog />
      <Chrome step={2} total={5} accent={accent} label="STEP · 03 / PHOTO" onBack={onBack} onClose={onClose ?? onBack} />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: previewUrl ? `radial-gradient(ellipse 80% 50% at 50% 40%, ${accent}1a 0%, transparent 70%)` : 'none',
          transition: 'background 600ms',
        }}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

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
            station.
          </h1>
          <p style={{ fontFamily: LF.body, fontSize: 14, color: LF.muted, marginTop: 14, lineHeight: 1.55, maxWidth: 300 }}>
            A real photo of the setup is what makes this component shareable.
          </p>
        </div>

        <div style={{ marginTop: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!previewUrl ? (
            <Press
              onClick={openPicker}
              ariaLabel="Tap to open camera"
              style={{
                width: '100%',
                height: 260,
                border: `1.5px dashed ${LF.faint}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                background: 'rgba(255,255,255,0.015)',
                animation: 'lf-breathe 3s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  border: `1.5px solid ${LF.faint}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={LF.muted} strokeWidth="1.4" strokeLinecap="square">
                  <path d="M3 7h4l2-2h6l2 2h4v13H3z" />
                  <circle cx="12" cy="13.5" r="3.5" />
                  <circle cx="18.5" cy="9.5" r="0.75" fill={LF.muted} stroke="none" />
                </svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: LF.display, fontSize: 11, letterSpacing: '0.28em', color: LF.dim, textTransform: 'uppercase' }}>
                  Tap to open camera
                </div>
                <div style={{ fontFamily: LF.body, fontSize: 12, color: LF.faint, marginTop: 6 }}>or choose from library</div>
              </div>
            </Press>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: 260, animation: 'lf-rise-in 300ms both' }}>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: -2,
                  border: `2px solid ${accent}`,
                  boxShadow: `0 0 28px ${accent}55, inset 0 0 20px ${accent}0a`,
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
              <img
                src={previewUrl}
                alt="Captured station setup"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <Press
                onClick={openPicker}
                ariaLabel="Retake photo"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 3,
                  background: 'rgba(6,10,28,0.75)',
                  backdropFilter: 'blur(10px)',
                  padding: '7px 12px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square">
                  <path d="M1 4v6h6" />
                  <path d="M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                <span
                  style={{
                    fontFamily: LF.display,
                    fontSize: 9,
                    letterSpacing: '0.22em',
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}
                >
                  Retake
                </span>
              </Press>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 24px 32px', position: 'relative', zIndex: 1 }}>
        <PrimaryBtn accent={accent} onClick={onNext} disabled={!previewUrl}>
          Continue
        </PrimaryBtn>
      </div>
    </div>
  )
}
