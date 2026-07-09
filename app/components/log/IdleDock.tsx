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
'use client'

import { useEffect, useRef, useState } from 'react'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

const ACCENT = 'rgb(255,90,31)'

// ─── frame 8c bar geometry — 46 center-mirrored bars, 3px wide, 2px gap ──────────────────────
// heights + positional white ramp (#5b6b86 → #8fa0bd → #c8d4e8 → #e7eefa) copied exactly from
// 8c-recording.html tpl150–195. The brightest/tallest cluster (idx 24–30) sits just right of centre
// — the live edge. LIVE marks the tallest bar (idx 27, h29, #e7eefa).
const C1 = 'rgb(91,107,134)'
const C2 = 'rgb(143,160,189)'
const C3 = 'rgb(200,212,232)'
const C4 = 'rgb(231,238,250)'
const BARS: { h: number; c: string }[] = [
  { h: 3, c: C1 }, { h: 3, c: C1 }, { h: 3, c: C1 }, { h: 5, c: C1 }, { h: 5, c: C1 },
  { h: 6, c: C1 }, { h: 8, c: C1 }, { h: 7, c: C1 }, { h: 10, c: C2 }, { h: 10, c: C2 },
  { h: 8, c: C1 }, { h: 10, c: C2 }, { h: 15, c: C2 }, { h: 10, c: C2 }, { h: 12, c: C2 },
  { h: 15, c: C2 }, { h: 20, c: C3 }, { h: 16, c: C2 }, { h: 19, c: C3 }, { h: 17, c: C3 },
  { h: 22, c: C3 }, { h: 21, c: C3 }, { h: 23, c: C3 }, { h: 22, c: C3 }, { h: 27, c: C4 },
  { h: 25, c: C4 }, { h: 23, c: C3 }, { h: 29, c: C4 }, { h: 27, c: C4 }, { h: 23, c: C3 },
  { h: 27, c: C4 }, { h: 23, c: C3 }, { h: 17, c: C3 }, { h: 18, c: C3 }, { h: 15, c: C2 },
  { h: 18, c: C3 }, { h: 21, c: C3 }, { h: 19, c: C3 }, { h: 15, c: C2 }, { h: 12, c: C2 },
  { h: 12, c: C2 }, { h: 9, c: C2 }, { h: 11, c: C2 }, { h: 12, c: C2 }, { h: 8, c: C1 },
  { h: 10, c: C2 },
]
const NBARS = BARS.length // 46
const LIVE = 27 // live-edge bar index (tallest in the frame)

// wave drive tuning — the amplitude envelope around the frame's fixed shape
const WAVE_STEP = 60 // ms per one-bar leftward scroll of the history buffer
const WAVE_GAIN = 3.0
const WAVE_FLOOR = 0.34 // scaleY on silence — bars settle low, never to zero
// leading-edge taper for bars to the right of LIVE (echoes the live edge down to the right)
const rightTaper = (i: number) => {
  const d = (i - LIVE) / (NBARS - 1 - LIVE)
  return Math.pow(1 - d, 1.5)
}

function MicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#ffffff" />
      <path d="M5.2 11.5a6.8 6.8 0 0 0 13.6 0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.6v2.9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// The Continuity ✓ — the mic's exact 54px footprint transformed. Custom weighted glyph, copied from
// 8c-recording.html tpl204 (incl. the translate(1px,-1px) optical nudge).
function CheckGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: 'translate(1px, -1px)' }}>
      <path
        d="M3.9 11.8C4.45 11.15 5.45 11.1 6.05 11.7L9.6 15.15L18.5 5.4C19.1 4.75 20.1 4.75 20.7 5.35C21.3 5.95 21.32 6.95 20.72 7.6L10.95 18.35C10.22 19.15 9.0 19.17 8.28 18.4L3.98 13.85C3.42 13.25 3.38 12.42 3.9 11.8Z"
        fill="#ffffff"
      />
    </svg>
  )
}

type Mode = 'idle' | 'in' | 'recording' | 'out'

interface RigEls {
  bars: () => HTMLElement | null
  timer: () => HTMLElement | null
  placeholder: () => HTMLElement | null
  mic: () => HTMLElement | null
  check: () => HTMLElement | null
}
interface RigOpts {
  getAmp: () => number
  onMode: (m: Mode) => void
  reduced: () => boolean
}

// The recording rig — mirrors motion-dc.js beat STRUCTURE exactly. Mutates the DOM through refs
// (WAAPI on the document timeline), so beat timing survives React re-renders and tab-away throttling.
class RecordingRig {
  cfg = { bloom: 190, stagger: 28, bounce: 0, xfade: 280 }
  mode: Mode = 'idle'
  fake = false // dev door: synthesize amplitude instead of a real mic

  private rafId: number | null = null
  private waveRaf: number | null = null
  private timeouts: number[] = []
  private tickActive = false
  private tickBase = 0
  private ring = new Float32Array(LIVE + 1)
  private acc = 0
  private lastT = 0
  private onVis = () => {}

  constructor(private el: RigEls, private opts: RigOpts) {}

  mount() {
    // recording clock survives tab-away; nothing runs until the mic button is tapped
    this.onVis = () => {
      if (document.hidden) this.stopTick()
      else if (this.mode === 'recording' && this.tickActive) this.startTick(this.tickBase)
    }
    document.addEventListener('visibilitychange', this.onVis)
  }
  destroy() {
    document.removeEventListener('visibilitychange', this.onVis)
    this.stopTick()
    this.stopWave()
    this.clearTimers()
  }

  private setMode(m: Mode) {
    this.mode = m
    this.opts.onMode(m)
  }
  private clearTimers() {
    this.timeouts.forEach(clearTimeout)
    this.timeouts = []
  }
  private after(fn: () => void, ms: number) {
    this.timeouts.push(window.setTimeout(fn, ms))
  }
  private barEls(): HTMLElement[] {
    const b = this.el.bars()
    return b ? (Array.from(b.children) as HTMLElement[]) : []
  }
  private fade(el: HTMLElement | null, to: number, dur: number, delay = 0) {
    if (!el) return
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }], {
      duration: dur,
      delay,
      easing: 'ease',
      fill: 'backwards',
    })
    el.style.opacity = String(to)
  }
  private reduced() {
    return this.opts.reduced()
  }

  // ── beatIn (mic tap): crossfade to ✓, bloom bars nearest-button-first, timer last ──────────
  beatIn(factor = 1) {
    if (this.mode !== 'idle') return
    this.setMode('in')
    const { bloom, stagger, bounce, xfade } = this.cfg
    const bars = this.barEls()
    const n = bars.length

    if (this.reduced()) {
      const d = 200 * factor
      this.fade(this.el.placeholder(), 0, d)
      this.fade(this.el.mic(), 0, d)
      this.fade(this.el.check(), 1, d)
      bars.forEach((b) => {
        b.style.transform = 'scaleY(1)'
        this.fade(b, 1, d)
      })
      this.fade(this.el.timer(), 1, d, d)
      this.after(() => {
        this.setMode('recording')
        this.beginTimer()
      }, d * 2)
      return
    }

    this.fade(this.el.placeholder(), 0, xfade * factor)
    this.fade(this.el.mic(), 0, xfade * factor)
    this.fade(this.el.check(), 1, xfade * factor)

    bars.forEach((b, i) => {
      const delay = (n - 1 - i) * stagger * factor // nearest to button (rightmost) first
      b.style.transform = 'scaleY(1) translateX(0px)'
      b.style.opacity = '1'
      b.animate(
        [
          { transform: 'scaleY(0) translateX(10px)', opacity: 0 },
          { transform: `scaleY(${1 + bounce}) translateX(-1px)`, opacity: 1, offset: 0.68 },
          { transform: 'scaleY(1) translateX(0px)', opacity: 1 },
        ],
        { duration: bloom * factor, delay, easing: 'cubic-bezier(0.34,1.2,0.64,1)', fill: 'backwards' }
      )
    })

    const total = ((n - 1) * stagger + bloom) * factor
    this.fade(this.el.timer(), 1, 160 * factor, total * 0.75) // timer last
    this.after(() => {
      this.setMode('recording')
      this.beginTimer()
      this.startWave()
    }, total)
  }

  // ── beatOut (✓ tap): bars sweep farthest-first toward the button, glyph crossfades back ─────
  beatOut(factor = 1) {
    if (this.mode !== 'recording') return
    this.setMode('out')
    this.stopTick()
    this.tickActive = false
    this.stopWave()
    const { bloom, stagger, xfade } = this.cfg
    const bars = this.barEls()
    const n = bars.length

    if (this.reduced()) {
      const d = 200 * factor
      this.fade(this.el.timer(), 0, d)
      bars.forEach((b) => this.fade(b, 0, d))
      this.fade(this.el.check(), 0, d, d)
      this.fade(this.el.mic(), 1, d, d)
      this.fade(this.el.placeholder(), 1, d, d)
      this.after(() => this.setMode('idle'), d * 2)
      return
    }

    this.fade(this.el.timer(), 0, 140 * factor) // timer out first
    const dur = bloom * 0.7
    bars.forEach((b, i) => {
      const delay = i * stagger * 0.8 * factor // farthest first, sweeping toward the button
      b.style.transform = 'scaleY(0) translateX(10px)'
      b.style.opacity = '0'
      b.animate(
        [
          { transform: 'scaleY(1) translateX(0px)', opacity: 1 },
          { transform: 'scaleY(0) translateX(10px)', opacity: 0 },
        ],
        { duration: dur * factor, delay, easing: 'cubic-bezier(0.55,0,0.85,0.4)', fill: 'backwards' }
      )
    })
    const barsTotal = ((n - 1) * stagger * 0.8 + dur) * factor
    this.fade(this.el.check(), 0, xfade * factor, barsTotal * 0.6)
    this.fade(this.el.mic(), 1, xfade * factor, barsTotal * 0.6)
    this.fade(this.el.placeholder(), 1, 180 * factor, barsTotal * 0.7)
    this.after(() => this.setMode('idle'), barsTotal + xfade * factor)
  }

  // Instantly reset to idle (permission denied / cancel) — no beat.
  forceIdle() {
    this.stopWave()
    this.stopTick()
    this.clearTimers()
    this.tickActive = false
    // cancel any in-flight bloom/crossfade so it can't keep overriding the reset styles
    const cancel = (el: HTMLElement | null) => { if (el) el.getAnimations().forEach((a) => a.cancel()) }
    cancel(this.el.placeholder()); cancel(this.el.mic()); cancel(this.el.check()); cancel(this.el.timer())
    this.barEls().forEach((b) => b.getAnimations().forEach((a) => a.cancel()))
    const p = this.el.placeholder(); if (p) p.style.opacity = '1'
    const m = this.el.mic(); if (m) m.style.opacity = '1'
    const c = this.el.check(); if (c) c.style.opacity = '0'
    const t = this.el.timer(); if (t) t.style.opacity = '0'
    this.barEls().forEach((b) => { b.style.opacity = '0'; b.style.transform = '' })
    this.setMode('idle')
  }

  // ── recording timer (rAF, visibility-gated) ────────────────────────────────────────────────
  beginTimer() {
    this.tickActive = true
    this.tickBase = 0
    this.startTick(0)
  }
  startTick(baseSec: number) {
    this.stopTick()
    const t0 = performance.now() - baseSec * 1000
    const loop = () => {
      if (document.hidden || !this.tickActive || this.mode !== 'recording') {
        this.rafId = null
        return
      }
      const s = (performance.now() - t0) / 1000
      this.tickBase = s
      const t = this.el.timer()
      if (t) t.textContent = Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }
  stopTick() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  // ── live waveform drive — transform-only, cheap, runs ONLY while recording ──────────────────
  // A short history ring feeds bars left of the live edge (scrolling away); the live edge and the
  // taper to its right track the current amplitude. Reduced motion leaves the bars static.
  startWave() {
    if (this.reduced()) return
    this.ring.fill(0)
    this.acc = 0
    this.lastT = performance.now()
    const loop = (now: number) => {
      if (this.mode !== 'recording') {
        this.waveRaf = null
        return
      }
      const bars = this.barEls()
      if (!bars.length) {
        this.waveRaf = requestAnimationFrame(loop)
        return
      }
      const amp = Math.max(0, Math.min(1, this.opts.getAmp()))
      this.acc += now - this.lastT
      this.lastT = now
      while (this.acc >= WAVE_STEP) {
        this.acc -= WAVE_STEP
        this.ring.copyWithin(0, 1) // scroll history left
        this.ring[LIVE] = amp
      }
      for (let i = 0; i < bars.length; i++) {
        let v: number
        if (i < LIVE) v = this.ring[i]
        else if (i === LIVE) v = amp
        else v = amp * rightTaper(i)
        const sy = Math.max(0.14, Math.min(1.28, WAVE_FLOOR + v * WAVE_GAIN))
        bars[i].style.transform = 'scaleY(' + sy.toFixed(3) + ') translateX(0px)'
      }
      this.waveRaf = requestAnimationFrame(loop)
    }
    this.waveRaf = requestAnimationFrame(loop)
  }
  stopWave() {
    if (this.waveRaf) {
      cancelAnimationFrame(this.waveRaf)
      this.waveRaf = null
    }
  }
}

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
}

// Lift the dock above the on-screen keyboard using the visual viewport (iOS).
function useKeyboardLift(active: boolean) {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const update = () => {
      if (!active) {
        setLift(0)
        return
      }
      const gap = window.innerHeight - (vv.height + vv.offsetTop)
      setLift(gap > 40 ? gap : 0)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])
  return lift
}

export default function IdleDock({ note, onNoteChange, typing, onOpenTyping, onCloseTyping, devFakeRecording, locked = false }: IdleDockProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const lift = useKeyboardLift(typing)

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the freshest transcript for the stop handler.
  useEffect(() => {
    latestTranscript.current = voice.transcript
  }, [voice.transcript])

  // Permission denied / recognition error mid-take → don't dead-end: reset + open the typing door
  // (the full graceful screens are chunk 9).
  useEffect(() => {
    if (voice.voiceState === 'error' && (mode === 'in' || mode === 'recording')) {
      rigRef.current?.forceIdle()
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

  const startRec = () => {
    const r = rigRef.current
    if (!r || locked) return
    if (!devFakeRecording && !voice.isSupported) {
      // No speech recognition (e.g. iOS Safari) — open the typing door instead of a dead mic.
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
      }
    }, 600)
  }

  const onButtonTap = () => {
    const r = rigRef.current
    if (!r || locked) return
    if (typing) {
      onCloseTyping()
      return
    }
    if (r.mode === 'idle') startRec()
    else if (r.mode === 'recording') stopRec()
  }

  const recording = mode === 'recording' || mode === 'in' || mode === 'out'

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 46,
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
              <button
                type="button"
                onClick={onOpenTyping}
                aria-label={hasNote ? `Edit note: ${note}` : 'Add a note (optional)'}
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
                  color: hasNote ? 'rgb(231,238,250)' : 'rgb(159,176,200)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hasNote ? note : <>Add a note… <span style={{ color: 'rgb(91,107,134)' }}>(optional)</span></>}
              </button>
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

      {/* the disc — mic (idle) morphs into the Continuity ✓ (recording). One 54px footprint. */}
      <button
        type="button"
        onClick={onButtonTap}
        aria-label={typing ? 'Close note field' : mode === 'recording' ? 'Stop recording' : 'Record a voice note'}
        aria-disabled={locked}
        className="transition-transform active:scale-[0.94]"
        style={{
          flex: '0 0 auto',
          position: 'relative',
          width: 54,
          height: 54,
          borderRadius: 27,
          border: 'none',
          padding: 0,
          background: ACCENT,
          cursor: 'pointer',
        }}
      >
        <span ref={micRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 }}>
          <MicGlyph />
        </span>
        <span ref={checkRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
          <CheckGlyph />
        </span>
      </button>
    </div>
  )
}
