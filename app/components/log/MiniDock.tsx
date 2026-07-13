// @design-locked (divergence-documented) — the NotesDoc critique mini-dock (chunk N1). It is the
// capture pill (IdleDock) SCALED DOWN: same solid lit-navy surface, same 46-bar waveform + disc glyph
// family (mic → ✓ → ↑), same typing door + keyboard-lift, driven by the SHARED recordingRig module so
// the motion is byte-identical to the capture dock. It is a LEAN SIBLING, not IdleDock reused wholesale
// (IdleDock is 900 lines of capture-specific wiring — save-morph handles, re-record, structure, the run
// stepper). The disc's ↑ APPLIES the critique (→ /api/revise) instead of structuring a raw note; the
// label slot carries "Revising…" / "Couldn't revise — try again" the way IdleDock carries
// "Structuring…" / "Couldn't structure".
//
// UNAUTHORED VALUES (no export frame drew this dock — the grill authored it in words: "the capture pill,
// smaller … tap words to type, mic to speak, ↑ applies … 44px disc min"). Sizes scaled from IdleDock's
// 66/54/33 to 54/46/27 — FLAGGED for River. Copy strings ("Tell it what to change…", the offline line)
// flagged. Everything motion/geometry is inherited from the shared rig (fidelity-safe).
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import {
  BARS,
  faceFade,
  MicGlyph,
  CheckGlyph,
  ArrowGlyph,
  RecordingRig,
  useKeyboardLift,
  type Mode,
} from './recordingRig'

const ACCENT = 'rgb(255,90,31)'
const INTER = 'var(--font-inter), sans-serif'
// Scaled-down dock geometry (flagged — IdleDock is 66/54/33). 44px disc MIN per the grill; 46 clears it.
const DISC = 46
const DOCK_MIN_H = 54
const DOCK_R = 27
// UNAUTHORED copy (flagged). The offline line reassures without promising a save (the edits already live
// in flow state; only the AI revise needs the network).
const COPY_LABEL = 'Tell it what to change…'
const COPY_MIC_DENIED = "Mic's off — tap here to type instead"
const COPY_OFFLINE = "No connection — reconnect to revise with AI. Your edits are safe."

function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export interface MiniDockProps {
  /** The critique text (typed or transcribed). Owned by NotesDoc so it survives a failed revise. */
  critique: string
  onCritiqueChange: (v: string) => void
  typing: boolean
  onOpenTyping: () => void
  onCloseTyping: () => void
  /** ↑ tap (critique present) → apply the critique (NotesDoc runs /api/revise + the glow/undo). */
  onApply: () => void
  /** True while /api/revise is in flight → "Revising…" (role=status) fills the label slot; disc frozen. */
  revising?: boolean
  /** True after a failed revise → "Couldn't revise — try again" (role=alert); the critique is preserved. */
  reviseError?: boolean
  /** Offline (15d): raise the dock + a reassurance line; the ↑ apply is short-circuited by NotesDoc. */
  offline?: boolean
  /** Opened via the ✦ Critique chip → focus the typing door on mount (the input is "ready"). */
  focusOnMount?: boolean
  /** A 'network' recognition error bubbles up so NotesDoc can flip `offline`. */
  onNetworkError?: () => void
}

export default function MiniDock({
  critique,
  onCritiqueChange,
  typing,
  onOpenTyping,
  onCloseTyping,
  onApply,
  revising = false,
  reviseError = false,
  offline = false,
  focusOnMount = false,
  onNetworkError,
}: MiniDockProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const lift = useKeyboardLift(typing)

  const [micDenied, setMicDenied] = useState(false)
  const clearGraceful = () => setMicDenied(false)

  const voice = useVoiceNote()
  const voiceApiRef = useRef(voice)
  voiceApiRef.current = voice
  const latestTranscript = useRef('')

  const [mode, setMode] = useState<Mode>('idle')

  const barsWrapRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<HTMLDivElement | null>(null)
  const placeholderRef = useRef<HTMLDivElement | null>(null)
  const micRef = useRef<HTMLSpanElement | null>(null)
  const checkRef = useRef<HTMLSpanElement | null>(null)
  const arrowRef = useRef<HTMLSpanElement | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)

  const rigRef = useRef<RecordingRig | null>(null)
  const getAmp = () => voiceApiRef.current?.getAmplitude?.() ?? 0
  if (rigRef.current === null) {
    rigRef.current = new RecordingRig(
      {
        bars: () => barsWrapRef.current,
        timer: () => timerRef.current,
        placeholder: () => placeholderRef.current,
        mic: () => micRef.current,
        check: () => checkRef.current,
        arrow: () => arrowRef.current,
      },
      { getAmp, onMode: setMode, reduced: prefersReduced },
    )
  }

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`
  }

  // Focus the typing door: on the ✦-open (focusOnMount) and whenever `typing` turns on.
  useEffect(() => {
    if (focusOnMount) onOpenTyping()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (typing) {
      inputRef.current?.focus()
      autoGrow(inputRef.current)
    }
  }, [typing])

  // Mount/unmount the rig.
  useEffect(() => {
    const r = rigRef.current!
    r.mount()
    return () => {
      r.destroy()
      voiceApiRef.current?.reset()
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    latestTranscript.current = voice.transcript
  }, [voice.transcript])

  // Recognition error → 15a mic-denied (type instead) / network (→ offline) / else open typing. Reset
  // any in-flight beat first; never dead-end.
  useEffect(() => {
    if (voice.voiceState !== 'error') return
    if (mode === 'in' || mode === 'recording') rigRef.current?.forceIdle()
    const code = voice.errorCode
    if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
      setMicDenied(true)
      onOpenTyping()
    } else if (code === 'network') {
      onNetworkError?.()
      onOpenTyping()
    } else if (code === 'no-speech') {
      // nothing heard — silently return to idle (the coach can retry the mic or type)
    } else {
      onOpenTyping()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.voiceState])

  const hasCritique = critique.trim().length > 0
  const recording = mode === 'recording' || mode === 'in' || mode === 'out'
  const micOff = micDenied

  const openTyping = () => {
    clearGraceful()
    onOpenTyping()
  }

  const startRec = () => {
    const r = rigRef.current
    if (!r || revising) return
    clearGraceful()
    if (stopTimeoutRef.current) { window.clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null }
    if (!voice.isSupported) {
      onOpenTyping() // no recognizer (desktop Firefox) → type instead
      return
    }
    voice.startRecording()
    r.beatIn()
  }

  const stopRec = () => {
    const r = rigRef.current
    if (!r) return
    r.beatOut()
    voice.stopRecording()
    if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
    stopTimeoutRef.current = window.setTimeout(() => {
      stopTimeoutRef.current = null
      const t = latestTranscript.current.trim()
      // Spoken critique replaces the field (parity with IdleDock's voice→note). Empty take = untouched.
      if (t) onCritiqueChange(t)
    }, 600)
  }

  const onButtonTap = () => {
    const r = rigRef.current
    if (!r || revising) return
    if (micOff) { startRec(); return } // retry the mic
    if (typing) {
      if (hasCritique) { onCloseTyping(); onApply() } // ↑ = dismiss keyboard + apply
      return
    }
    if (hasCritique) { onApply(); return } // ↑ face → apply the critique
    if (r.mode === 'idle') startRec()
    else if (r.mode === 'recording') stopRec()
  }

  // Disc face reconcile (mic ↔ ↑) at rest — mirrors IdleDock. The rig owns mic↔✓ during a take.
  useEffect(() => {
    if (recording) return
    const dur = prefersReduced() ? 0 : 280
    const wantArrow = typing || hasCritique
    faceFade(arrowRef.current, wantArrow ? (typing && !hasCritique ? 0.4 : 1) : 0, dur)
    faceFade(micRef.current, wantArrow ? 0 : 1, dur)
    if (checkRef.current) checkRef.current.style.opacity = '0'
  }, [recording, typing, hasCritique])

  const discIsArrow = !recording && (typing || hasCritique)
  const arrowDead = typing && !hasCritique
  const discLabel = revising
    ? 'Revising the card'
    : mode === 'recording'
      ? 'Stop recording'
      : discIsArrow
        ? 'Apply the critique with AI'
        : 'Record a critique'

  const raised = !typing && offline

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: raised ? 74 : 46,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: DOCK_MIN_H,
          padding: '0px 5px 0px 18px',
          borderRadius: DOCK_R,
          background: 'rgb(12,19,34)', // SOLID lit navy — no backdrop-filter (freeze rule)
          boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
          transform: lift ? `translateY(-${lift}px)` : 'none',
          transition: 'transform 220ms cubic-bezier(0.3,0.8,0.3,1)',
          zIndex: 6,
        }}
      >
        {/* left region — label / typing door overlaid by the waveform */}
        <div style={{ position: 'relative', flex: '1 1 0%', minHeight: 28, display: 'flex', alignItems: 'center' }}>
          {typing ? (
            <textarea
              ref={inputRef}
              value={critique}
              onChange={(e) => { onCritiqueChange(e.target.value); autoGrow(e.currentTarget) }}
              onBlur={onCloseTyping}
              rows={1}
              placeholder={COPY_LABEL}
              aria-label="Tell it what to change"
              style={{
                flex: '1 1 0%',
                alignSelf: 'center',
                margin: '8px 0',
                padding: 0,
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                fontFamily: INTER,
                fontWeight: 400,
                fontSize: 13.5,
                lineHeight: '18px',
                color: 'rgb(231,238,250)',
                maxHeight: 90,
              }}
            />
          ) : (
            <>
              <div
                ref={placeholderRef}
                aria-hidden={mode !== 'idle'}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', pointerEvents: mode === 'idle' ? 'auto' : 'none' }}
              >
                {revising ? (
                  <span
                    role="status"
                    aria-live="polite"
                    style={{ flex: '1 1 0%', padding: '12px 0', fontFamily: INTER, fontWeight: 400, fontSize: 13.5, color: 'rgb(159,176,200)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    Revising…
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openTyping}
                    aria-label={micOff ? 'Type a note instead' : hasCritique ? `Edit critique: ${critique}` : 'Tell it what to change'}
                    tabIndex={mode === 'idle' ? 0 : -1}
                    style={{
                      flex: '1 1 0%',
                      minHeight: 44,
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      padding: '12px 0',
                      cursor: 'text',
                      fontFamily: INTER,
                      fontWeight: 400,
                      fontSize: 13.5,
                      color: micOff ? 'rgb(205,216,234)' : hasCritique || reviseError ? 'rgb(231,238,250)' : 'rgb(159,176,200)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {micOff ? (
                      COPY_MIC_DENIED
                    ) : reviseError ? (
                      // Failure lands in the SAME label slot; the critique text is preserved (tap to edit
                      // or tap ↑ to retry). role=alert announces it once.
                      <span role="alert" style={{ color: 'rgb(159,176,200)' }}>Couldn&rsquo;t revise — try again</span>
                    ) : hasCritique ? critique : COPY_LABEL}
                  </button>
                )}
              </div>

              {/* live waveform — 46 bars, transform-only. Hidden at rest. */}
              <div
                ref={barsWrapRef}
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, overflow: 'hidden', pointerEvents: 'none' }}
              >
                {BARS.map((b, i) => (
                  <div key={i} style={{ flex: '0 0 auto', width: 3, height: b.h, borderRadius: 2, background: b.c, opacity: 0, transformOrigin: 'center', willChange: 'transform' }} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* recording timer — out of the idle flow (display:none) */}
        <div
          ref={timerRef}
          role="timer"
          aria-label="Recording time"
          style={{ display: recording ? 'block' : 'none', flex: '0 0 auto', fontFamily: INTER, fontWeight: 500, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: 'rgb(159,176,200)', opacity: 0 }}
        >
          0:00
        </div>

        {/* the disc — mic (idle) → ✓ (recording) → ↑ (critique present → apply). */}
        <button
          type="button"
          onClick={onButtonTap}
          aria-label={discLabel}
          aria-disabled={revising || arrowDead}
          className="transition-transform active:scale-[0.94]"
          style={{
            flex: '0 0 auto',
            position: 'relative',
            width: DISC,
            height: DISC,
            borderRadius: DISC / 2,
            border: 'none',
            padding: 0,
            background: ACCENT,
            opacity: revising ? 0.55 : 1,
            pointerEvents: revising || arrowDead ? 'none' : 'auto',
            transition: 'opacity 200ms ease',
            cursor: 'pointer',
          }}
        >
          <span ref={micRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 }}>
            <MicGlyph />
          </span>
          <span ref={checkRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
            <CheckGlyph />
          </span>
          <span ref={arrowRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
            <ArrowGlyph />
          </span>
        </button>
      </div>

      {/* 15d — the offline reassurance line beneath the raised dock. UNAUTHORED copy (flagged). */}
      {!typing && offline && (
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 50, display: 'flex', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <span role="status" aria-live="polite" style={{ fontFamily: INTER, fontWeight: 400, fontSize: 11.5, lineHeight: 1.4, color: 'rgb(159,176,200)' }}>{COPY_OFFLINE}</span>
        </div>
      )}
    </>
  )
}
