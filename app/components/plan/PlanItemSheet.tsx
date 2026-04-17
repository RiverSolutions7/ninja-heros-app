'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlanItem, ComponentType } from '@/app/lib/database.types'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import BottomSheet from '@/app/components/ui/BottomSheet'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

const TYPE_META: Record<ComponentType, { label: string; accent: string; placeholderBg: string }> = {
  station: { label: 'Station', accent: 'text-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', accent: 'text-accent-green', placeholderBg: 'bg-accent-green/20' },
}

interface PlanItemSheetProps {
  item: PlanItem
  onSaveNote: (localId: string, note: string) => void
  onDurationChange: (localId: string, value: string) => void
  onClose: () => void
}

export function PlanItemSheet({ item, onSaveNote, onDurationChange, onClose }: PlanItemSheetProps) {
  // Starts true so BottomSheet animates in on mount; handleClose flips it false
  // to trigger the 300ms exit before the parent unmounts us.
  const [visible, setVisible] = useState(true)
  // Pre-fill with existing coach note, or fall back to library description as a starting point
  const [noteText, setNoteText] = useState(item.coachNote ?? item.component.description ?? '')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  // Local copy of duration so stepper updates feel instant
  const [localDuration, setLocalDuration] = useState<number | null>(item.durationMinutes ?? null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Duration stepper hold-to-accelerate state. Tap = 1-min step via onClick.
  // Hold ≥ 450ms = rapid-fire, accelerating from slow to very fast as the
  // user keeps their finger down, so going 0 → 45 is a second of holding
  // rather than 9 taps.
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heldRef = useRef(false)
  // Latest duration value visible to the hold ticks — updated via ref so the
  // rapid-fire callback doesn't close over a stale state value.
  const durationRef = useRef<number | null>(item.durationMinutes ?? null)

  const {
    voiceState,
    transcript,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    parseNote,
    reset,
  } = useVoiceNote()

  const meta = TYPE_META[item.component.type]
  const photos = (item.component.photos ?? []).filter(Boolean)

  function handleClose() {
    // Auto-save note when closing — no explicit Save button needed
    onSaveNote(item.localId, noteText)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  async function handleMicToggle() {
    if (voiceState === 'idle' || voiceState === 'error' || voiceState === 'done') {
      reset()
      startRecording()
    } else if (voiceState === 'recording') {
      stopRecording()
      // Show raw transcript immediately so coach sees what was heard
      if (transcript) setNoteText(transcript)
      // Then replace with Claude-formatted bullets
      const structured = await parseNote()
      if (structured) setNoteText(structured)
    }
  }

  /** Single step of the duration stepper. 1-minute granularity. */
  function stepDuration(delta: number) {
    const current = durationRef.current ?? 0
    let next: number | null
    if (delta < 0) {
      next = current + delta <= 0 ? null : current + delta
    } else {
      next = Math.min(120, current + delta)
    }
    if (next === durationRef.current) return // clamped — no-op
    durationRef.current = next
    setLocalDuration(next)
    onDurationChange(item.localId, next === null ? '' : String(next))
  }

  /**
   * Start a press-and-hold on a stepper button. After 450ms the rapid-fire
   * kicks in and accelerates: first few ticks are paced (110ms), then faster
   * (55ms), then very fast (30ms) — so going 0 → 45 takes ~1.5s of holding.
   * Short taps don't enter rapid-fire; the onClick handler does the single step.
   */
  function startDurationHold(delta: number) {
    heldRef.current = false
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    let ticks = 0
    const tick = () => {
      heldRef.current = true
      stepDuration(delta)
      ticks += 1
      const delay = ticks < 5 ? 110 : ticks < 12 ? 55 : 30
      holdTimerRef.current = setTimeout(tick, delay)
    }
    holdTimerRef.current = setTimeout(tick, 450)
  }

  function stopDurationHold() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  /**
   * Click handler — fires after pointerup. If the user was holding, we've
   * already rapid-fire-stepped; skip the extra step from this click. Otherwise
   * (plain tap) this is the single step.
   */
  function handleDurationClick(delta: number) {
    if (heldRef.current) {
      heldRef.current = false
      return
    }
    stepDuration(delta)
  }

  // Clear any running hold timer on unmount — guards against the sheet closing
  // mid-hold (e.g. backdrop tap).
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    }
  }, [])

  const micIcon = () => {
    if (voiceState === 'recording') {
      return (
        <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z"/>
        </svg>
      )
    }
    if (voiceState === 'processing') {
      return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    }
    if (voiceState === 'done') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    if (voiceState === 'error') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z"/>
      </svg>
    )
  }

  const micColors: Record<string, string> = {
    idle: 'bg-bg-input border border-bg-border text-text-muted hover:bg-white/5',
    recording: 'bg-accent-fire text-white shadow-glow-fire',
    processing: 'bg-bg-input border border-bg-border text-text-dim',
    done: 'bg-accent-green/20 border border-accent-green/40 text-accent-green',
    error: 'bg-red-900/30 border border-red-500/40 text-red-400',
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={handleClose} maxHeight="90vh">
        <div>
          {/* Photos row */}
          {photos.length > 0 && (
            <div className="flex gap-2 px-4 pt-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightbox({ photos, index: i })}
                  className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden active:opacity-75 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* No photo placeholder */}
          {photos.length === 0 && (
            <div className={['mx-4 mt-3 h-20 rounded-xl', meta.placeholderBg].join(' ')} />
          )}

          {/* Metadata row + title — library-card hierarchy */}
          <div className="px-4 pt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide">
              <span className={meta.accent}>{meta.label}</span>
              {item.component.curriculum && (
                <>
                  <span className="text-text-dim/40">·</span>
                  <span className="text-text-dim">{item.component.curriculum}</span>
                </>
              )}
            </div>
            <h2 className="font-heading text-xl text-text-primary leading-snug mt-1">
              {item.component.title}
            </h2>
          </div>

          {/* Equipment */}
          {item.component.equipment && (
            <div className="px-4 mt-2 flex items-start gap-2">
              <span className="text-xs text-accent-blue font-heading mt-0.5 flex-shrink-0">Equipment:</span>
              <span className="text-xs text-text-dim leading-relaxed">{item.component.equipment}</span>
            </div>
          )}

          {/* Duration stepper — 1-min steps, hold-to-accelerate */}
          <div className="px-4 mt-3 flex items-center justify-between">
            <span className="text-xs text-text-dim font-heading">Duration</span>
            <div className="flex items-center select-none" style={{ touchAction: 'manipulation' }}>
              <button
                type="button"
                onClick={() => handleDurationClick(-1)}
                onPointerDown={() => startDurationHold(-1)}
                onPointerUp={stopDurationHold}
                onPointerLeave={stopDurationHold}
                onPointerCancel={stopDurationHold}
                disabled={!localDuration}
                className="w-9 h-9 flex items-center justify-center rounded-l-lg border border-bg-border bg-bg-input text-text-muted active:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease duration"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <div className="h-9 px-4 flex items-center justify-center border-t border-b border-bg-border bg-bg-input min-w-[72px]">
                <span className={[
                  'font-heading whitespace-nowrap tabular-nums',
                  localDuration ? 'text-text-primary text-sm' : 'text-text-dim text-sm',
                ].join(' ')}>
                  {localDuration ? `${localDuration} min` : '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDurationClick(1)}
                onPointerDown={() => startDurationHold(1)}
                onPointerUp={stopDurationHold}
                onPointerLeave={stopDurationHold}
                onPointerCancel={stopDurationHold}
                disabled={!!localDuration && localDuration >= 120}
                className="w-9 h-9 flex items-center justify-center rounded-r-lg border border-bg-border bg-bg-input text-text-muted active:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase duration"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Running Note section */}
          <div className="px-4 mt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-bg-border" />
              <span className="text-[11px] font-heading uppercase tracking-wider text-text-dim px-2">
                Running Note
              </span>
              <div className="h-px flex-1 bg-bg-border" />
            </div>

            {/* Mic button + label row — hidden entirely when voice unsupported */}
            {isSupported && (
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={voiceState === 'processing'}
                  className={[
                    'w-11 h-11 flex items-center justify-center rounded-full transition-all flex-shrink-0',
                    micColors[voiceState],
                    voiceState === 'processing' ? 'cursor-not-allowed' : '',
                  ].join(' ')}
                  aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start recording'}
                >
                  {micIcon()}
                </button>
                <div className="flex-1 min-w-0">
                  {voiceState === 'recording' && (
                    <p className="text-xs text-accent-fire animate-pulse">Listening… tap mic to stop</p>
                  )}
                  {voiceState === 'processing' && (
                    <p className="text-xs text-text-dim">Processing…</p>
                  )}
                  {voiceState === 'done' && (
                    <p className="text-xs text-accent-green">Note formatted ✓</p>
                  )}
                  {voiceState === 'error' && errorMessage && (
                    <p className="text-xs text-red-400">{errorMessage}</p>
                  )}
                  {voiceState === 'idle' && (
                    <p className="text-xs text-text-dim">Tap mic to dictate</p>
                  )}
                </div>
              </div>
            )}

            {/* Live transcript preview while recording */}
            {voiceState === 'recording' && transcript && (
              <p className="text-xs text-text-dim italic mb-2 px-1 leading-relaxed">
                &ldquo;{transcript}&rdquo;
              </p>
            )}

            {/* Note textarea */}
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Running instructions for this component…"
              rows={4}
              className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors resize-none leading-relaxed"
            />

            {/* Done — auto-saves note on close */}
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full font-heading text-base py-3.5 rounded-xl transition-all min-h-[52px] bg-accent-fire text-white shadow-glow-fire active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Photo lightbox — above sheet */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          zIndex={10001}
        />
      )}
    </>
  )
}
