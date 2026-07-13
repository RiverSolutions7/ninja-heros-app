// @design-locked — the shared recording-dock rig, extracted VERBATIM from IdleDock.tsx (chunks 1–3)
// so BOTH the capture dock (IdleDock) and the notes-editing mini-dock (MiniDock, chunk N1) drive the
// EXACT same motion from ONE source (the Fidelity Law bans a drifting second copy). Nothing here is
// new — it is the same RecordingRig / 46-bar geometry / disc glyphs / face crossfade / keyboard-lift
// that shipped in IdleDock, moved out so it can be reused. Bar geometry + beat structure mirror
// design-export/capture/motion-dc.js (recording rig {bloom:190, stagger:28, bounce:0, xfade:280}).
// polish-audit: flag only a11y / motion-perf / bugs — not the design values.
'use client'

import { useEffect, useState } from 'react'

// ─── frame 8c bar geometry — 46 center-mirrored bars, 3px wide, 2px gap ──────────────────────
// heights + positional white ramp (#5b6b86 → #8fa0bd → #c8d4e8 → #e7eefa) copied exactly from
// 8c-recording.html tpl150–195. The brightest/tallest cluster (idx 24–30) sits just right of centre
// — the live edge. LIVE marks the tallest bar (idx 27, h29, #e7eefa).
const C1 = 'rgb(91,107,134)'
const C2 = 'rgb(143,160,189)'
const C3 = 'rgb(200,212,232)'
const C4 = 'rgb(231,238,250)'
export const BARS: { h: number; c: string }[] = [
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
export function faceFade(el: HTMLElement | null, to: number, dur: number) {
  if (!el) return
  if (dur <= 0) {
    el.getAnimations().forEach((a) => a.cancel())
    el.style.opacity = String(to)
    return
  }
  el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }], { duration: dur, easing: 'ease', fill: 'backwards' })
  el.style.opacity = String(to)
}

export function MicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#ffffff" />
      <path d="M5.2 11.5a6.8 6.8 0 0 0 13.6 0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.6v2.9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 15a mic-denied glyph — the mic in the muted #7c88a0 ink over the gray disc (frame tpl750). Same
// silhouette as MicGlyph so the disc reads as "the mic, but off" (not a different icon).
export function MutedMicGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="#7c88a0" />
      <path d="M5.2 11.5a6.8 6.8 0 0 0 13.6 0" stroke="#7c88a0" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18.6v2.9" stroke="#7c88a0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// The Continuity ✓ — the mic's exact 54px footprint transformed. Custom weighted glyph, copied from
// 8c-recording.html tpl204 (incl. the translate(1px,-1px) optical nudge).
export function CheckGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: 'translate(1px, -1px)' }}>
      <path
        d="M3.9 11.8C4.45 11.15 5.45 11.1 6.05 11.7L9.6 15.15L18.5 5.4C19.1 4.75 20.1 4.75 20.7 5.35C21.3 5.95 21.32 6.95 20.72 7.6L10.95 18.35C10.22 19.15 9.0 19.17 8.28 18.4L3.98 13.85C3.42 13.25 3.38 12.42 3.9 11.8Z"
        fill="#ffffff"
      />
    </svg>
  )
}

// The Continuity ↑ — the disc's THIRD face (a non-empty note exists → tap = structure/apply).
// UNAUTHORED in any export frame (River's gate-A decision, 2026-07-09) — FLAGGED for his eyeball pass.
// Drawn path-filled in the same weighted language as CheckGlyph (a ~3.4px shaft + rounded head, white
// fill), so mic → ✓ → ↑ read as one continuous glyph family across the disc footprint.
export function ArrowGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.4C12.42 4.4 12.82 4.57 13.1 4.86L19.14 11.04C19.72 11.63 19.71 12.58 19.12 13.16C18.53 13.74 17.58 13.73 17 13.14L13.7 9.76V18.9C13.7 19.84 12.94 20.6 12 20.6C11.06 20.6 10.3 19.84 10.3 18.9V9.76L7 13.14C6.42 13.73 5.47 13.74 4.88 13.16C4.29 12.58 4.28 11.63 4.86 11.04L10.9 4.86C11.18 4.57 11.58 4.4 12 4.4Z"
        fill="#ffffff"
      />
    </svg>
  )
}

export type Mode = 'idle' | 'in' | 'recording' | 'out'

export interface RigEls {
  bars: () => HTMLElement | null
  timer: () => HTMLElement | null
  placeholder: () => HTMLElement | null
  mic: () => HTMLElement | null
  check: () => HTMLElement | null
  arrow: () => HTMLElement | null
}
export interface RigOpts {
  getAmp: () => number
  onMode: (m: Mode) => void
  reduced: () => boolean
}

// The recording rig — mirrors motion-dc.js beat STRUCTURE exactly. Mutates the DOM through refs
// (WAAPI on the document timeline), so beat timing survives React re-renders and tab-away throttling.
export class RecordingRig {
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

// Pin a bottom-anchored dock flush to the on-screen keyboard using the visual viewport (iOS + any
// third-party keyboard, e.g. Wispr Flow). The occluded region = window.innerHeight − (vv.offsetTop +
// vv.height) is the EXACT height the keyboard covers (measured, never estimated), so the dock lands
// with zero gap regardless of keyboard height/toolbars. Transform-only (the caller translateY's the
// dock); rAF-throttled so a burst of resize/scroll events collapses to one write per frame.
// `dockBottom` = the dock's resting `bottom` offset (its gap above the layout-viewport bottom); the
// lift raises it by exactly `occluded − dockBottom`. Both the capture dock and the mini-dock rest at
// bottom:46, so 46 is the shared default.
export function useKeyboardLift(active: boolean, dockBottom = 46) {
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
      setLift(Math.max(0, occluded - dockBottom))
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
  }, [active, dockBottom])
  return lift
}
