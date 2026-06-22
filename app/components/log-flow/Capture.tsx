// Capture — the merged photo + voice screen (Phase B port of Capture.html).
// Replaces S3Photo + VoiceScreen. Built chunk-by-chunk per capture-port-plan.md.
// @design-locked — the export is the visual source of truth.
'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from '@/app/lib/database.types'
import type { MicState } from './atoms'
import CaptureEmpty from './CaptureEmpty'
import PhotoDeck from './PhotoDeck'
import RecordingBar from './RecordingBar'
import PhotoActionMenu from './PhotoActionMenu'
import ReorderTray from './ReorderTray'

const MAX_PHOTOS = 5

export interface CaptureProps {
  type: ComponentType
  previewUrls: string[]
  onCapture: (file: File) => void
  onRemove: (index: number) => void
  onReorder: (order: number[]) => void
  state: MicState
  getAmplitude: () => number
  onStart: () => void
  onTypingStart: () => void
  onTypeSubmit: (text: string) => void
  onCancel: () => void
  onStop: () => void
  onDone: () => void
  onBack: () => void
  onClose: () => void
}

// Lit-from-top circular chrome button (export `.chip`).
function Chip({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="transition-transform active:scale-[0.94]"
      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.82)',
          background: 'linear-gradient(180deg,#141c33,#0c1222)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 2px rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.45)',
        }}
      >
        {children}
      </span>
    </button>
  )
}

export default function Capture({
  previewUrls,
  onCapture,
  onRemove,
  onReorder,
  state,
  getAmplitude,
  onStart,
  onTypingStart,
  onTypeSubmit,
  onCancel,
  onStop,
  onDone,
  onBack,
  onClose,
}: CaptureProps) {
  const empty = previewUrls.length === 0
  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [trayOpen, setTrayOpen] = useState(false)
  const [kbInset, setKbInset] = useState(0)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Lift the bottom bar above the on-screen keyboard (real iOS keyboard, typing state).
  // The visual viewport shrinks when the keyboard opens; pad the screen by that amount so
  // the input rides just above it and the photo shrinks to fit (no bar hidden behind keys).
  useEffect(() => {
    if (state !== 'typing') { setKbInset(0); return }
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => setKbInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    onResize()
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onResize)
    }
  }, [state])

  const pickMedia = () => fileRef.current?.click()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = MAX_PHOTOS - previewUrls.length
    Array.from(e.target.files ?? []).slice(0, remaining).forEach((f) => onCapture(f))
    e.target.value = ''
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#080c1a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 50px)', // clear the status-bar / notch so the chips aren't jammed at the top
        paddingBottom: kbInset, // lifts the bar above the keyboard when typing
      }}
    >
      <div style={{ height: 52, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Chip label="Back" onClick={onBack}>
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
            <path d="M9 1 2 9l7 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Chip>
        <Chip label="Close" onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M1.5 1.5l12 12M13.5 1.5l-12 12" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </Chip>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {empty ? (
        <CaptureEmpty onCapture={onCapture} count={previewUrls.length} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 0 0', minHeight: 0 }}>
          <PhotoDeck previewUrls={previewUrls} onRemove={onRemove} />
          <RecordingBar
            state={state}
            getAmplitude={getAmplitude}
            onStart={onStart}
            onTypingStart={onTypingStart}
            onTypeSubmit={onTypeSubmit}
            onCancel={onCancel}
            onStop={onStop}
            onDone={onDone}
            onPlusTap={() => setPlusMenuOpen(true)}
          />
        </div>
      )}

      <PhotoActionMenu
        visible={plusMenuOpen}
        onClose={() => setPlusMenuOpen(false)}
        onAddMedia={pickMedia}
        onReorder={() => setTrayOpen(true)}
        onParsingSettings={() => { /* TODO: AdjustSheet (reuse) */ }}
        origin="left bottom"
        style={{ left: 24, bottom: 112 }}
      />

      <ReorderTray
        visible={trayOpen}
        previewUrls={previewUrls}
        onClose={() => setTrayOpen(false)}
        onReorderIndices={onReorder}
        onRemove={onRemove}
        onAdd={pickMedia}
      />
    </div>
  )
}
