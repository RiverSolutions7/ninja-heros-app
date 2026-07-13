// @design-locked — the Capture dock. Built from design-export/capture/frames/8a-photo-loaded.html
// (idle) + 8c-recording.html (recording), animated per design-export/capture/motion-dc.js
// (recording rig {bloom:190, stagger:28, bounce:0, xfade:280}). ONE dock that morphs in place:
// mic tap → beatIn (placeholder/mic crossfade out · ✓ fades in · 46 bars bloom nearest-button-first ·
// timer last) → live recording → ✓ tap → beatOut (bars sweep farthest-first · glyph crossfade back).
//
// DELIBERATE DIVERGENCE from the frame's dock surface: the export authored the dock as frosted
// (rgba(12,19,34,0.55) + backdrop-filter blur), but the build tokens mandate a SOLID lit-navy dock —
// this chunk animates the waveform ON it, and NOTHING may animate over a backdrop-filter (the freeze
// rule). So the surface is solid rgb(12,19,34) with a 1px top-highlight ring + drop shadow. Every
// other value (size 66, radius 33, padding, gap, mic 54 disc #ff5a1f, 46-bar geometry/heights/colors,
// timer style, ✓ glyph) is copied exactly from the frames.
//
// The live waveform is transform-only (scaleY on the existing bars — no re-render, no layout, no
// backdrop) and its rAF runs ONLY while recording (zero work at rest). Timer is rAF, visibility-gated,
// survives tab-away. Reduced motion = the crossfade path + a static (un-driven) waveform.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
// Chunk 9 (graceful states): 15a mic-denied (gray disc + "Mic's off" label + raised dock + the
// "Turn on the mic in Settings ›" line, from 15a-mic-denied.html) · 15b no-speech (the frosted
// retry toast, from 15b-no-speech-heard.html) · 15d offline (the reassurance line + raised dock,
// from 15d-offline.html). Never a dead end: typing always works; the mic disc re-arms recording.
'use client'

import { useEffect, useRef, useState } from 'react'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import GracefulToast from './GracefulToast'
// CHUNK N1: the recording rig / 46-bar geometry / disc glyphs / face crossfade / keyboard-lift moved
// to a shared module so the notes-editing MiniDock reuses the EXACT motion (the Fidelity Law bans a
// drifting second copy). IdleDock's rendered output is unchanged — it now imports what it used to define.
import {
  BARS,
  faceFade,
  MicGlyph,
  MutedMicGlyph,
  CheckGlyph,
  ArrowGlyph,
  RecordingRig,
  useKeyboardLift,
  type Mode,
} from './recordingRig'

const ACCENT = 'rgb(255,90,31)'
const INTER = 'var(--font-inter), sans-serif'
// 15a mic-denied disc (frame tpl749): gray disc, muted mic glyph.
const DENIED_DISC = 'rgb(58,67,88)'
// Copy strings — LAW, copied character-for-character from the 15a/15b/15d frames.
const COPY_MIC_DENIED = "Mic's off — tap here to type instead"
const COPY_SETTINGS = 'Turn on the mic in Settings ›'
const COPY_NO_SPEECH = "Didn't catch that — try again, or tap the note to type."
const COPY_OFFLINE = "No connection — your recording is saved; it'll process when you're back online."

export interface IdleDockProps {
  note: string
  onNoteChange: (v: string) => void
  typing: boolean
  onOpenTyping: () => void
  onCloseTyping: () => void
  // Dev door (?dev=rec): auto-run the beatIn/recording/beatOut cycle with a synthesized mic so the
  // motion can be exercised without a real microphone. Prod-guarded by the caller.
  devFakeRecording?: boolean
  // Interaction lock (chunk 3): true while /api/develop parses the note — the note is the request
  // payload, so editing/re-recording mid-parse is blocked (visuals unchanged; aria-disabled only).
  locked?: boolean
  // Gate-A (2026-07-09): the disc's THIRD face. A non-empty note (spoken or typed) turns the disc into
  // ↑ — tapping it runs the structure/parse path (/api/develop, owned by Capture). The pill is dead.
  onStructure?: () => void
  // True while /api/develop is in flight → "Structuring…" fills the dock's label slot (role=status)
  // and the disc dims/disables. (Same instant as `locked`; a distinct prop for the label copy.)
  structuring?: boolean
  // True after a failed parse → "Couldn't structure — try again" (role=alert) fills the label slot;
  // the disc returns to ↑ and the raw note is preserved.
  developError?: boolean
  // Chunk 9 — offline (15d). Owned by Capture (navigator.onLine + a failed develop/save). Raises the
  // dock to bottom:74 and renders the reassurance line below it; recording/typing/note stay usable.
  offline?: boolean
  // Chunk 9 — a 'network' SpeechRecognition error surfaces up here so Capture can flip `offline` (the
  // recognizer's relay is unreachable = a connection problem → the 15d reassurance, not a dead mic).
  onNetworkError?: () => void
  // Dev door (prod-guarded by the caller): force a graceful surface for review. '15a' = mic-denied,
  // '15b' = no-speech toast. ('15d' is driven by the `offline` prop; '15c' is a Capture-level screen.)
  devForceState?: '15a' | '15b' | null
  // Chunk 10 (item ③): true while the record cycle is live (beat-in / recording / beat-out). Capture
  // uses it to keep the hero photo from being a tap target during a take (the viewer must not open).
  // Logic-only signal — no visual rides on it.
  onRecActiveChange?: (active: boolean) => void
}

export default function IdleDock({ note, onNoteChange, typing, onOpenTyping, onCloseTyping, devFakeRecording, locked = false, onStructure, structuring = false, developError = false, offline = false, onNetworkError, devForceState = null, onRecActiveChange }: IdleDockProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const lift = useKeyboardLift(typing)

  // ── graceful states (chunk 9) ────────────────────────────────────────────────────────────────
  // micDenied (15a): a not-allowed/audio-capture recognition error → gray disc + "Mic's off" label +
  // the raised dock + the Settings line. noSpeech (15b): an empty take (no-speech error OR a stopped
  // take with a blank transcript) → the frosted retry toast. Both self-clear; typing/re-record always
  // escape. Dev doors force the visual without a real mic.
  const [micDenied, setMicDenied] = useState(false)
  const [noSpeech, setNoSpeech] = useState(false)
  const noSpeechTimerRef = useRef<number | null>(null)
  const micOff = micDenied || devForceState === '15a'
  const noSpeechShown = noSpeech || devForceState === '15b'
  const flashNoSpeech = () => {
    setNoSpeech(true)
    if (noSpeechTimerRef.current) window.clearTimeout(noSpeechTimerRef.current)
    // The toast is transient guidance (mirrors the W1 whisper's ~4s life) — it also clears the moment
    // the coach acts (re-records or taps to type). Never a modal dead end.
    noSpeechTimerRef.current = window.setTimeout(() => setNoSpeech(false), 4500)
  }
  const clearGraceful = () => {
    setMicDenied(false)
    setNoSpeech(false)
    if (noSpeechTimerRef.current) { window.clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null }
  }

  const voice = useVoiceNote()
  const voiceApiRef = useRef(voice)
  voiceApiRef.current = voice
  const latestTranscript = useRef('')

  const [mode, setMode] = useState<Mode>('idle')
  const [tookVoice, setTookVoice] = useState(false)

  const barsWrapRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<HTMLDivElement | null>(null)
  const placeholderRef = useRef<HTMLDivElement | null>(null)
  const micRef = useRef<HTMLSpanElement | null>(null)
  const checkRef = useRef<HTMLSpanElement | null>(null)
  const arrowRef = useRef<HTMLSpanElement | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)

  // Synthesized amplitude for the dev door; real amplitude from the voice analyser otherwise.
  const rigRef = useRef<RecordingRig | null>(null)
  const getAmp = () => {
    if (rigRef.current?.fake) {
      const t = performance.now() / 1000
      return 0.06 + 0.1 * Math.abs(Math.sin(t * 2.3)) + 0.06 * Math.abs(Math.sin(t * 7.7)) + 0.05 * Math.random()
    }
    return voiceApiRef.current?.getAmplitude?.() ?? 0
  }
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
      {
        getAmp,
        onMode: setMode,
        reduced: () => !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      }
    )
  }
  rigRef.current.fake = !!devFakeRecording

  // Auto-grow the note field up to maxHeight (then it scrolls).
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`
  }

  useEffect(() => {
    if (typing) {
      inputRef.current?.focus()
      autoGrow(inputRef.current)
    }
  }, [typing])

  // Mount/unmount the rig (visibility listener + clock).
  useEffect(() => {
    const r = rigRef.current!
    r.mount()
    return () => {
      r.destroy()
      voiceApiRef.current?.reset()
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
      if (noSpeechTimerRef.current) window.clearTimeout(noSpeechTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the freshest transcript for the stop handler.
  useEffect(() => {
    latestTranscript.current = voice.transcript
  }, [voice.transcript])

  // Recognition error → route to the right graceful surface by error code (chunk 9). Reset the disc
  // out of any in-flight record beat first, then branch — never dead-end:
  //   not-allowed / service-not-allowed / audio-capture → 15a mic-denied (gray disc + type-instead)
  //   no-speech                                          → 15b no-speech toast (re-record or type)
  //   network                                            → 15d offline (relay unreachable → Capture)
  //   anything else                                      → open the typing door (the safe fallback)
  useEffect(() => {
    if (voice.voiceState !== 'error') return
    if (mode === 'in' || mode === 'recording') rigRef.current?.forceIdle()
    const code = voice.errorCode
    if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
      setNoSpeech(false)
      setMicDenied(true)
    } else if (code === 'no-speech') {
      flashNoSpeech()
    } else if (code === 'network') {
      onNetworkError?.()
    } else {
      onOpenTyping()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.voiceState])

  // Dev door: kick the fake cycle once mounted (delay lets the mock photo settle).
  useEffect(() => {
    if (!devFakeRecording) return
    const id = window.setTimeout(() => {
      const r = rigRef.current
      if (r && r.mode === 'idle') r.beatIn()
    }, 450)
    return () => window.clearTimeout(id)
  }, [devFakeRecording])

  const hasNote = note.trim().length > 0

  // Open the typing door — the primary escape from every graceful state. Clears the mic-denied /
  // no-speech surfaces (the coach chose to type) before handing off to the parent.
  const openTyping = () => {
    clearGraceful()
    onOpenTyping()
  }

  const startRec = () => {
    const r = rigRef.current
    if (!r || locked) return
    // Fresh attempt — drop any prior graceful surface (a mic-denied retry re-requests permission; the
    // 15b toast clears the moment we re-arm). Also cancel a still-pending stop-timeout so a previous
    // take's empty-transcript check can't fire flashNoSpeech against THIS new recording.
    clearGraceful()
    if (stopTimeoutRef.current) { window.clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null }
    if (!devFakeRecording && !voice.isSupported) {
      // No speech recognition (e.g. desktop Firefox) — open the typing door instead of a dead mic.
      onOpenTyping()
      return
    }
    if (!devFakeRecording) voice.startRecording()
    r.beatIn()
  }

  const stopRec = () => {
    const r = rigRef.current
    if (!r) return
    r.beatOut()
    if (devFakeRecording) {
      // Demo note so the "note taken" idle + re-record affordance are reviewable in the sandbox.
      onNoteChange('Beam, rings, then a foam-pit landing.')
      setTookVoice(true)
      return
    }
    voice.stopRecording()
    // Read the finalized transcript after the recognizer settles; it lands as the raw note
    // ("Structure it ✨" is chunk 3 — this stays the raw note the typing door edits).
    // latestTranscript keeps updating from onresult until reset(), so a slightly generous ceiling
    // catches late-finalizing results. The id is stored + cleared on unmount so a fast back-out
    // can't fire this against a torn-down flow. (Full no-speech UX is chunk 9.)
    if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current)
    stopTimeoutRef.current = window.setTimeout(() => {
      stopTimeoutRef.current = null
      const t = latestTranscript.current.trim()
      if (t) {
        onNoteChange(t)
        setTookVoice(true)
      } else {
        // 15b — the take finished with nothing transcribed (the recognizer heard no words and never
        // fired a no-speech error). Surface the retry toast; the note is untouched. Never a dead end.
        flashNoSpeech()
      }
    }, 600)
  }

  const onButtonTap = () => {
    const r = rigRef.current
    if (!r || locked || structuring) return
    // 15a — the gray disc retries the mic (re-requests permission). If still blocked the recognizer
    // re-errors back into micDenied; if the coach enabled it in Settings, recording proceeds.
    if (micOff) { startRec(); return }
    if (typing) {
      // full ↑ (text exists) = dismiss the keyboard + structure; dimmed-dead ↑ (empty) = no-op.
      if (hasNote) { onCloseTyping(); onStructure?.() }
      return
    }
    if (hasNote) { onStructure?.(); return } // ↑ face → structure the raw note
    if (r.mode === 'idle') startRec()
    else if (r.mode === 'recording') stopRec()
  }

  const recording = mode === 'recording' || mode === 'in' || mode === 'out'

  // Chunk 10 (item ③): surface the live record-cycle state up to Capture (gates the hero-photo tap).
  useEffect(() => {
    onRecActiveChange?.(recording)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  // ── disc third face (gate A) — reconcile mic ↔ ↑ at idle ────────────────────────────────────────
  // The RecordingRig owns the mic↔✓ crossfade DURING the record cycle (mode in/recording/out); this
  // effect owns the mic↔↑ crossfade at rest. A non-empty note (spoken or typed) OR an open keyboard
  // makes the disc the ↑; while typing with empty text the ↑ rides DIMMED (0.4) and dead (the June Q4b
  // pattern — it brightens dim→full the moment text exists). Face changes crossfade 280ms (the dock's
  // xfade). Runs only at mode idle, so it never fights the rig's writes to the same opacity.
  useEffect(() => {
    if (recording) return
    // 15a — the muted-mic face owns the disc; the mic/✓/↑ faces stay hidden (the disc is inert-ish,
    // a tap retries the mic). The muted face is a plain always-mounted layer toggled by `micOff`.
    if (micOff) {
      faceFade(arrowRef.current, 0, 0)
      faceFade(micRef.current, 0, 0)
      if (checkRef.current) checkRef.current.style.opacity = '0'
      return
    }
    const reduced = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const dur = reduced ? 0 : 280
    const wantArrow = typing || hasNote
    faceFade(arrowRef.current, wantArrow ? (typing && !hasNote ? 0.4 : 1) : 0, dur)
    faceFade(micRef.current, wantArrow ? 0 : 1, dur)
    if (checkRef.current) checkRef.current.style.opacity = '0'
  }, [recording, typing, hasNote, micOff])

  // The disc's role at rest: ↑ (structure) when a note exists or the keyboard is open, else mic.
  const discIsArrow = !recording && (typing || hasNote)
  // Dimmed-dead ↑: keyboard open with no text yet. Tap is a no-op until text exists.
  const arrowDead = typing && !hasNote
  // 15a a11y: the mic-off state is announced ONCE by the hidden role=alert region below; the controls
  // then carry only their distinct ACTION (retry the mic / type a note) so VoiceOver doesn't re-read
  // "microphone is off" on every focus (mirrors the developError "keep it out of the name" pattern).
  const discLabel = micOff
    ? 'Retry microphone'
    : structuring
      ? 'Structuring the note'
      : mode === 'recording'
        ? 'Stop recording'
        : discIsArrow
          ? 'Structure the note with AI'
          : 'Record a voice note'

  // 15a/15d raise the dock to bottom:74 to clear the Settings / reassurance line beneath it. Only at
  // rest — while typing the keyboard-lift owns the offset and the sub-lines are hidden.
  const raised = !typing && (micOff || offline)

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
        gap: 12,
        minHeight: 66,
        padding: '0px 6px 0px 20px',
        borderRadius: 33,
        // SOLID lit navy (see header note) — no backdrop-filter.
        background: 'rgb(12,19,34)',
        boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
        transform: lift ? `translateY(-${lift}px)` : 'none',
        transition: 'transform 220ms cubic-bezier(0.3,0.8,0.3,1)',
      }}
    >
      {/* left region — note / typing door (idle) overlaid by the waveform (recording) */}
      <div style={{ position: 'relative', flex: '1 1 0%', minHeight: 30, display: 'flex', alignItems: 'center' }}>
        {typing ? (
          <textarea
            ref={inputRef}
            value={note}
            onChange={(e) => {
              onNoteChange(e.target.value)
              autoGrow(e.currentTarget)
            }}
            onBlur={onCloseTyping}
            rows={1}
            placeholder="Add a note… (optional)"
            aria-label="Add a note"
            style={{
              flex: '1 1 0%',
              alignSelf: 'center',
              margin: '9px 0',
              padding: 0,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-inter), sans-serif',
              fontWeight: 400,
              fontSize: 13.5,
              lineHeight: '18px',
              color: 'rgb(231,238,250)',
              maxHeight: 90,
            }}
          />
        ) : (
          <>
            {/* placeholder / note text — the typing door. Fades out during recording. */}
            <div
              ref={placeholderRef}
              aria-hidden={mode !== 'idle'}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: mode === 'idle' ? 'auto' : 'none',
              }}
            >
              {structuring ? (
                // The parse is in flight — the label slot carries a calm status (the disc is dimmed +
                // frozen). No spinner theatre; role=status announces it once.
                <span
                  role="status"
                  aria-live="polite"
                  style={{ flex: '1 1 0%', padding: '13px 0', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 13.5, color: 'rgb(159,176,200)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  Structuring…
                </span>
              ) : (
                <button
                  type="button"
                  onClick={openTyping}
                  // The failure announcement is owned by the role=alert child below — keep it OUT of
                  // the accessible name so VoiceOver doesn't double-speak it (once as alert, once as name).
                  aria-label={micOff ? 'Type a note instead' : hasNote ? `Edit note: ${note}` : 'Add a note (optional)'}
                  aria-disabled={locked}
                  tabIndex={mode === 'idle' ? 0 : -1}
                  style={{
                    flex: '1 1 0%',
                    // hit-slop: pad the tap target back to ≥44px without moving the (align-centre) text.
                    minHeight: 44,
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: '13px 0',
                    cursor: 'text',
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 400,
                    fontSize: 13.5,
                    // 15a label ink rgb(205,216,234) (frame tpl748); else the note/normal ramp.
                    color: micOff ? 'rgb(205,216,234)' : hasNote || developError ? 'rgb(231,238,250)' : 'rgb(159,176,200)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {micOff ? (
                    // 15a — "Mic's off — tap here to type instead" (frame tpl748). Tapping opens typing.
                    COPY_MIC_DENIED
                  ) : developError ? (
                    // Failure lands in the SAME label slot; disc returns to ↑, the raw note is intact
                    // (tap to edit, or tap ↑ to retry). role=alert announces the failure once.
                    <span role="alert" style={{ color: 'rgb(159,176,200)' }}>Couldn&rsquo;t structure — try again</span>
                  ) : hasNote ? note : <>Add a note… <span style={{ color: 'rgb(91,107,134)' }}>(optional)</span></>}
                </button>
              )}
            </div>

            {/* live waveform — 46 bars, transform-only drive. Hidden at rest (opacity 0). */}
            <div
              ref={barsWrapRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                overflow: 'hidden',
                // decorative overlay — must never intercept the note-field tap beneath it
                pointerEvents: 'none',
              }}
            >
              {BARS.map((b, i) => (
                <div
                  key={i}
                  style={{
                    flex: '0 0 auto',
                    width: 3,
                    height: b.h,
                    borderRadius: 2,
                    background: b.c,
                    opacity: 0,
                    transformOrigin: 'center',
                    willChange: 'transform',
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* re-record — 8c didn't author it; styles now match 8d's authored "↺ try again" (frame tpl259:
          Inter 500 13px rgb(159,176,200), gap 7, ↺ 15px). Visible only after a voice take, at idle. */}
      {tookVoice && mode === 'idle' && !typing && (
        <button
          type="button"
          onClick={startRec}
          aria-label="Try again — re-record voice note"
          aria-disabled={locked}
          className="transition-transform active:scale-[0.94]"
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            minHeight: 44,
            border: 'none',
            background: 'transparent',
            padding: '0 6px',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 500,
            fontSize: 13,
            color: 'rgb(159,176,200)',
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>↺</span> try again
        </button>
      )}

      {/* recording timer — out of the idle flow (display:none) so the idle dock matches 8a exactly */}
      <div
        ref={timerRef}
        role="timer"
        aria-label="Recording time"
        style={{
          display: recording ? 'block' : 'none',
          flex: '0 0 auto',
          fontFamily: 'var(--font-inter), sans-serif',
          fontWeight: 500,
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
          color: 'rgb(159,176,200)',
          opacity: 0,
        }}
      >
        0:00
      </div>

      {/* the disc — ONE 54px footprint telling a continuous story: mic (idle, no note) → ✓ (recording)
          → ↑ (a note exists, spoken or typed → tap = structure). Faces crossfade at the dock's xfade. */}
      <button
        type="button"
        onClick={onButtonTap}
        aria-label={discLabel}
        aria-disabled={locked || structuring || arrowDead}
        className="transition-transform active:scale-[0.94]"
        style={{
          flex: '0 0 auto',
          position: 'relative',
          width: 54,
          height: 54,
          borderRadius: 27,
          border: 'none',
          padding: 0,
          // 15a — the disc greys out (frame tpl749 rgb(58,67,88)); otherwise the accent.
          background: micOff ? DENIED_DISC : ACCENT,
          // dim + freeze the disc while the parse is in flight (the label carries "Structuring…").
          opacity: structuring ? 0.55 : 1,
          // Pointer-dead when the disc does nothing: while structuring, and while the ↑ is the
          // dimmed-dead face (keyboard open, no text). This also stops the press-feedback flash on a
          // no-op tap AND removes the blur→click race that could otherwise fall through to startRec;
          // on iOS a tap then falls to the dock behind and simply dismisses the keyboard.
          pointerEvents: structuring || arrowDead ? 'none' : 'auto',
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
        {/* 15a muted-mic face — always mounted, shown only while the mic is off (no crossfade needed). */}
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: micOff ? 1 : 0 }}>
          <MutedMicGlyph />
        </span>
      </button>
    </div>

    {/* 15a — the Settings line beneath the raised dock (frame tpl755). Guidance only: no web API can
        deep-link to iOS mic settings from Safari/a PWA, so this is authored text, not a button. The
        assertive announcement of the mic-denied state lives in the role=alert region below. */}
    {!typing && micOff && (
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 46, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 12, color: 'rgb(91,107,134)' }}>{COPY_SETTINGS}</span>
      </div>
    )}

    {/* 15d — the offline reassurance line beneath the raised dock (frame tpl877). Polite: the coach's
        recording isn't lost, capture/record/type all keep working. */}
    {!typing && !micOff && offline && (
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 50, display: 'flex', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
        <span role="status" aria-live="polite" style={{ fontFamily: INTER, fontWeight: 400, fontSize: 11.5, lineHeight: 1.4, color: 'rgb(159,176,200)' }}>{COPY_OFFLINE}</span>
      </div>
    )}

    {/* 15b — the frosted no-speech retry toast (frame tpl785). Assertive (an error). */}
    {!typing && noSpeechShown && <GracefulToast text={COPY_NO_SPEECH} assertive />}

    {/* Assertive announcement for the mic-denied transition (the visible line above is aria-hidden). */}
    {micOff && (
      <div role="alert" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        Microphone is off. Type a note instead, or turn on the mic in Settings.
      </div>
    )}
   </>
  )
}
