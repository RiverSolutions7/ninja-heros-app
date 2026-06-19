// @design-locked — built verbatim from the Capture.html export (STATE A, the empty landing).
// Visual source of truth: the export + C:\Users\river\.claude\plans\capture-port-plan.md.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not visual/token divergence.
'use client'

import { useRef } from 'react'
import { LF } from './atoms'

const MAX_PHOTOS = 5

function GlyphPhoto() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="25" height="19" rx="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="10.5" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 21l6.5-6 5 4.5 4.5-4 7 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CaptureEmpty({ onCapture, count }: { onCapture: (file: File) => void; count: number }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = MAX_PHOTOS - count
    Array.from(e.target.files ?? []).slice(0, remaining).forEach((f) => onCapture(f))
    e.target.value = ''
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 30px 0', minHeight: 0 }}>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleChange} style={{ display: 'none' }} />

      <h1 style={{ fontFamily: LF.display, color: '#fff', fontSize: 43, lineHeight: 1.04, letterSpacing: '-0.5px', margin: 0 }}>
        Capture the setup.
      </h1>
      <p style={{ marginTop: 16, fontFamily: LF.body, fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: 'rgba(255,255,255,0.46)', maxWidth: 300 }}>
        Document it once. Any coach can rebuild it forever.
      </p>

      {/* recessed drop-well — visual hint; the orange button is the action */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 330,
            borderRadius: 30,
            background: '#060a18',
            boxShadow: 'inset 0 6px 18px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.30)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.6)',
            }}
          >
            <GlyphPhoto />
          </div>
          <div style={{ fontFamily: LF.body, fontSize: 13.5, fontWeight: 700, letterSpacing: '0.3px', color: 'rgba(255,255,255,0.26)' }}>
            DROP A SHOT HERE
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={pick}
        className="transition-transform active:scale-[0.97]"
        style={{
          margin: '30px auto 0',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          height: 58,
          padding: '0 32px',
          borderRadius: 30,
          border: 'none',
          cursor: 'pointer',
          fontFamily: LF.body,
          fontSize: 18,
          fontWeight: 800,
          color: '#fff',
          background: 'linear-gradient(180deg,#fb8a3a,#f97316)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 1px rgba(0,0,0,0.2), 0 14px 30px rgba(249,115,22,0.40), 0 6px 14px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
          <path d="M9.5 2.5v14M2.5 9.5h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        Add a shot
      </button>

      <div style={{ marginTop: 'auto', padding: '18px 0 10px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            width: 150,
            height: 4,
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ display: 'block', height: '100%', width: '34%', borderRadius: 4, background: 'rgba(255,255,255,0.55)' }} />
        </div>
      </div>
    </div>
  )
}
