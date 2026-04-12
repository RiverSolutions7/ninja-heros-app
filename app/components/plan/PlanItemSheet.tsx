'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlanItem, ComponentType } from '@/app/lib/database.types'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

const TYPE_META: Record<ComponentType, { label: string; accent: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', accent: 'text-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', accent: 'text-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', accent: 'text-accent-green', placeholderBg: 'bg-accent-green/20' },
}

function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface PlanItemSheetProps {
  item: PlanItem
  planDate: string
  onSaveNote: (localId: string, note: string) => void
  onDurationChange: (localId: string, value: string) => void
  onClose: () => void
}

export function PlanItemSheet({ item, planDate, onSaveNote, onDurationChange, onClose }: PlanItemSheetProps) {
  const [visible, setVisible] = useState(false)
  // Pre-fill with existing coach note, or fall back to library description as a starting point
  const [noteText, setNoteText] = useState(item.coachNote ?? item.component.description ?? '')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  // Local copy of duration so stepper updates feel instant
  const [localDuration, setLocalDuration] = useState<number | null>(item.durationMinutes ?? null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Slide-up animation
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

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

  function handleDurationStep(delta: number) {
    const current = localDuration ?? 0
    let next: number | null
    if (delta < 0) {
      next = current <= 5 ? null : Math.max(5, Math.round(current / 5) * 5 + delta)
    } else {
      next = current === 0 ? 5 : Math.min(120, Math.round(current / 5) * 5 + delta)
    }
    setLocalDuration(next)
    onDurationChange(item.localId, next === null ? '' : String(next))
  }

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

  const sheet = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-300"
        style={{ zIndex: 9999, opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 bg-bg-card rounded-t-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{
          zIndex: 10000,
          maxHeight: '90vh',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="overflow-y-auto flex-1 pb-safe">
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

          {/* Title + type badge */}
          <div className="px-4 pt-4">
            <div className="flex items-start gap-2">
              <h2 className="font-heading text-xl text-text-primary leading-snug flex-1">
                {item.component.title}
              </h2>
              <span className={['text-xs font-heading mt-1 flex-shrink-0', meta.accent].join(' ')}>
                {meta.label}
              </span>
            </div>
            {item.component.curriculum && (
              <p className="text-xs text-text-dim mt-0.5">{item.component.curriculum}</p>
            )}
            {/* Date-specific reassurance */}
            <p className="text-[11px] text-text-dim/40 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDisplayDate(planDate)} only · won&apos;t change the library
            </p>
          </div>

          {/* Equipment */}
          {item.component.equipment && (
            <div className="px-4 mt-2 flex items-start gap-2">
              <span className="text-xs text-accent-blue font-heading mt-0.5 flex-shrink-0">Equipment:</span>
              <span className="text-xs text-text-dim leading-relaxed">{item.component.equipment}</span>
            </div>
          )}

          {/* Optional duration stepper */}
          <div className="px-4 mt-4 flex items-center gap-3">
            <span className="text-xs text-text-dim font-heading flex-shrink-0">Duration</span>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleDurationStep(-5)}
                disabled={!localDuration}
                className="w-8 h-8 flex items-center justify-center rounded-l-lg border border-bg-border bg-bg-input text-text-muted active:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Decrease duration"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <div className="h-8 px-3 flex items-center justify-center border-t border-b border-bg-border bg-bg-input min-w-[60px]">
                <span className="text-text-muted text-xs font-heading whitespace-nowrap">
                  {localDuration ? `${localDuration} min` : '— min'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDurationStep(5)}
                disabled={!!localDuration && localDuration >= 120}
                className="w-8 h-8 flex items-center justify-center rounded-r-lg border border-bg-border bg-bg-input text-text-muted active:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Increase duration"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <span className="text-[11px] text-text-dim/40">optional</span>
          </div>

          {/* Coach Note section */}
          <div className="px-4 mt-5 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-bg-border" />
              <span className="text-[11px] font-heading uppercase tracking-wider text-text-dim px-2">
                Coach Note
              </span>
              <div className="h-px flex-1 bg-bg-border" />
            </div>

            {/* Mic button + label row */}
            <div className="flex items-center gap-3 mb-3">
              {isSupported ? (
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
              ) : null}
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
                {voiceState === 'idle' && isSupported && (
                  <p className="text-xs text-text-dim">Tap mic to speak running instructions</p>
                )}
                {!isSupported && (
                  <p className="text-xs text-text-dim">Voice not supported — type below</p>
                )}
              </div>
            </div>

            {/* Live transcript preview while recording */}
            {voiceState === 'recording' && transcript && (
              <p className="text-xs text-text-dim italic mb-3 px-1 leading-relaxed">
                &ldquo;{transcript}&rdquo;
              </p>
            )}

            {/* Note textarea */}
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add running instructions for this component…"
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
      </div>

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

  return createPortal(sheet, document.body)
}
