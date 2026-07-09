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

// Crossfade a disc face to a target opacity. Mirrors RecordingRig.fade (animate + pin style.opacity
// so the end value survives React re-renders). dur ≤ 0 (reduced motion) = instant set.
function faceFade(el: HTMLElement | null, to: number, dur: number) {
  if (!el) return
  if (dur <= 0) {
    el.getAnimations().forEach((a) => a.cancel())
    el.style.opacity = String(to)
    return
  }
  el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }], { duration: dur, easing: 'ease', fill: 'backwards' })
  el.style.opacity = String(to)
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

// The Continuity ↑ — the disc's THIRD face (a non-empty note exists → tap = structure). UNAUTHORED
// in any export frame (River's gate-A decision, 2026-07-09) — FLAGGED for his next eyeball pass. Drawn
// path-filled in the same weighted language as CheckGlyph (a ~3.4px shaft + rounded head, white fill),
// so mic → ✓ → ↑ read as one continuous glyph family across the 54px footprint.
function ArrowGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.4C12.42 4.4 12.82 4.57 13.1 4.86L19.14 11.04C19.72 11.63 19.71 12.58 19.12 13.16C18.53 13.74 17.58 13.73 17 13.14L13.7 9.76V18.9C13.7 19.84 12.94 20.6 12 20.6C11.06 20.6 10.3 19.84 10.3 18.9V9.76L7 13.14C6.42 13.73 5.47 13.74 4.88 13.16C4.29 12.58 4.28 11.63 4.86 11.04L10.9 4.86C11.18 4.57 11.58 4.4 12 4.4Z"
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
  arrow: () => HTMLElement | null
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
      this.fade(this.el.arrow(), 0, d)
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
    this.fade(this.el.arrow(), 0, xfade * factor)
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
    cancel(this.el.placeholder()); cancel(this.el.mic()); cancel(this.el.arrow()); cancel(this.el.check()); cancel(this.el.timer())
    this.barEls().forEach((b) => b.getAnimations().forEach((a) => a.cancel()))
    const p = this.el.placeholder(); if (p) p.style.opacity = '1'
    const m = this.el.mic(); if (m) m.style.opacity = '1'
    const a = this.el.arrow(); if (a) a.style.opacity = '0'
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
  // Gate-A (2026-07-09): the disc's THIRD face. A non-empty note (spoken or typed) turns the disc into
  // ↑ — tapping it runs the structure/parse path (/api/develop, owned by Capture). The pill is dead.
  onStructure?: () => void
  // True while /api/develop is in flight → "Structuring…" fills the dock's label slot (role=status)
  // and the disc dims/disables. (Same instant as `locked`; a distinct prop for the label copy.)
  structuring?: boolean
  // True after a failed parse → "Couldn't structure — try again" (role=alert) fills the label slot;
  // the disc returns to ↑ and the raw note is preserved.
  developError?: boolean
}

// The dock's resting offset from the layout-viewport bottom (its `bottom: 46`). The keyboard occludes
// `occluded` px measured from that same bottom edge, so to sit the dock FLUSH on the keyboard we lift
// it by exactly `occluded − 46` (its resting gap is already 46px above the bottom).
const DOCK_BOTTOM = 46

// Pin the dock flush to the on-screen keyboard using the visual viewport (iOS + any third-party
// keyboard, e.g. Wispr Flow). The occluded region = window.innerHeight − (vv.offsetTop + vv.height)
// is the EXACT height the keyboard covers (measured, never estimated), so the dock lands with zero
// gap regardless of keyboard height/toolbars. Transform-only (the caller translateY's the dock);
// rAF-throttled so a burst of resize/scroll events collapses to one write per frame.
function useKeyboardLift(active: boolean) {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    let raf = 0
    const compute = () => {
      raf = 0
      if (!active) { setLift(0); return }
      const occluded = window.innerHeight - (vv.offsetTop + vv.height)
      // flush on the keyboard: raise by the occluded height minus the dock's resting bottom gap.
      setLift(Math.max(0, occluded - DOCK_BOTTOM))
    }
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(compute)
    }
    // measure immediately on activation, then follow the viewport as the keyboard animates in/out.
    compute()
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
    }
  }, [active])
  return lift
}

export default function IdleDock({ note, onNoteChange, typing, onOpenTyping, onCloseTyping, devFakeRecording, locked = false, onStructure, structuring = false, developError = false }: IdleDockProps) {
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
    if (!r || locked || structuring) return
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

  // ── disc third face (gate A) — reconcile mic ↔ ↑ at idle ────────────────────────────────────────
  // The RecordingRig owns the mic↔✓ crossfade DURING the record cycle (mode in/recording/out); this
  // effect owns the mic↔↑ crossfade at rest. A non-empty note (spoken or typed) OR an open keyboard
  // makes the disc the ↑; while typing with empty text the ↑ rides DIMMED (0.4) and dead (the June Q4b
  // pattern — it brightens dim→full the moment text exists). Face changes crossfade 280ms (the dock's
  // xfade). Runs only at mode idle, so it never fights the rig's writes to the same opacity.
  useEffect(() => {
    if (recording) return
    const reduced = !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const dur = reduced ? 0 : 280
    const wantArrow = typing || hasNote
    faceFade(arrowRef.current, wantArrow ? (typing && !hasNote ? 0.4 : 1) : 0, dur)
    faceFade(micRef.current, wantArrow ? 0 : 1, dur)
    if (checkRef.current) checkRef.current.style.opacity = '0'
  }, [recording, typing, hasNote])

  // The disc's role at rest: ↑ (structure) when a note exists or the keyboard is open, else mic.
  const discIsArrow = !recording && (typing || hasNote)
  // Dimmed-dead ↑: keyboard open with no text yet. Tap is a no-op until text exists.
  const arrowDead = typing && !hasNote
  const discLabel = structuring
    ? 'Structuring the note'
    : mode === 'recording'
      ? 'Stop recording'
      : discIsArrow
        ? 'Structure the note with AI'
        : 'Record a voice note'

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
                  onClick={onOpenTyping}
                  aria-label={developError ? `Couldn't structure — try again. Edit note: ${note}` : hasNote ? `Edit note: ${note}` : 'Add a note (optional)'}
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
                    color: hasNote || developError ? 'rgb(231,238,250)' : 'rgb(159,176,200)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {developError ? (
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
          background: ACCENT,
          // dim + freeze the disc while the parse is in flight (the label carries "Structuring…").
          opacity: structuring ? 0.55 : 1,
          pointerEvents: structuring ? 'none' : 'auto',
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
  )
}
