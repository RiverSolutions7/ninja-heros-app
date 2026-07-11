// @design-locked — built from design-export/capture/frames/8a-photo-loaded.html, 8b-empty.html,
// 8a-w-sort-whisper.html, 8d-develop-reveal.html (the pixel truth). Every color/size/radius/opacity
// here is copied from those frames. The photo hero is a natural whole-photo band (clamped 16:9 ↔ 4:5,
// never cropped) — the frame's square placeholder is one instance of that band. Frosted glass is used
// ONLY over the photo (chip, whisper) and stays STATIC; the dock is solid lit navy (see IdleDock).
//
// Develop reveal (chunk 3, revised gate A 2026-07-09): after a note lands, the continuity disc becomes
// ↑ (the "Structure it ✨" pill is dead, ledger §4 corrected) and tapping it POSTs /api/develop; on
// success the photo hero is
// replaced by the DevelopedCard and the develop rig (motion-dc.js dvStage/dvReveal) deepens a scrim +
// cascades the card content. FREEZE ASSERT: the animated scrim (DevelopedCard tpl239) is a plain rgba
// linear-gradient, never a backdrop-filter — nothing here animates over a backdrop-filter. Save
// handoff LAW: header "Save" is present pre-develop and DISAPPEARS the moment the card develops;
// "Save to library" (in the develop dock) owns the finish from then on.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import IdleDock from './IdleDock'
import GracefulToast from './GracefulToast'
import WhisperLozenge from './WhisperLozenge'
import DevelopedCard, { type DevelopResult, type DevelopCascadeRefs } from './DevelopedCard'
import NotesDoc from './NotesDoc'
import PhotoViewer from './PhotoViewer'
import Celebrate, { type CelebrateRefs } from './Celebrate'
import { saveComponent, updateComponentTitle, type SaveCardInput } from '@/app/lib/saveComponent'
import { fallbackTitle, titleFromPhoto, titleFromText } from '@/app/lib/titleForCard'
import { shareCard } from '@/app/lib/shareCard'

export interface Photo {
  url: string
  id: string
  /** The captured File — carried so Save can upload it. Absent for dev-mock photos (svg asset). */
  file?: File
}

export interface CaptureProps {
  photos: Photo[]
  note: string
  onNoteChange: (v: string) => void
  onAddPhotos: (files: File[]) => void
  onBack: () => void
  showWhisper?: boolean
  devFakeRecording?: boolean
  /** Dev door: resolve /api/develop with mock data instead of a real fetch (no API-key burn). */
  devMockDevelop?: boolean
  /** Dev door (?dev=developed): jump straight into the developed state with this mock result. */
  startDeveloped?: DevelopResult | null
  /** Dev door (?dev=notes): open straight into the expanded NotesDoc over startDeveloped. */
  startExpanded?: boolean
  /** component_types.name for the saved row (wired to the type/age sheet in chunk 6). Default 'station'. */
  saveType?: string
  /** Age groups for the saved row (curriculums). Wired in chunk 6; a placeholder default until then. */
  saveCurriculums?: string[]
  /** Dev door: run the save morph/celebrate WITHOUT a DB write (exercise the motion, no test rows). */
  devMockSave?: boolean
  /** Continue on the celebrate screen → reset to a fresh empty capture (parent revokes photo URLs). */
  onContinue?: () => void
  /** Live type + ages eyebrow ("Station · Ages 5–7"), from the TypeAgeSheet flow state (chunk 6).
   *  Rendered in the header chip + every card eyebrow (DevelopedCard / NotesDoc / Celebrate). */
  eyebrow?: string
  /** Chip tap → open the TypeAgeSheet (owned by the /log route). */
  onEditTypeAge?: () => void
  /** Photo stack-chip tap AND the whisper's "Sort →" → open the PhotoSheet (owned by the /log route).
   *  Chunk 10 (item ⑤): live in run mode too — the route scopes the sheet to the current station. */
  onManagePhotos?: () => void
  /** Chunk 10 (item ③): reorder photos to this id order (index 0 = cover). Used by the full-screen
   *  viewer's "Make cover". The route maps it to the single-flow photos[] or the station's subset. */
  onReorderPhotos?: (orderedIds: string[]) => void
  /** Multi-station stepper mode (chunk 8). When set, Capture runs ONE station of a run: it shows the
   *  stepper line (13a), relabels the finish CTA ("Save & next station →" until the last, then "Save to
   *  library"), and DELEGATES the save to `onStationSave` (page.tsx owns the pipeline + segment tick +
   *  swap + the plural celebrate) — the single-flow grow-morph/Celebrate is skipped in run mode. */
  run?: CaptureRun | null
  /** Dev door (?dev=state15a|15b|15c|15d, prod-guarded upstream): force a graceful state for review.
   *  '15a'/'15b' drive the IdleDock surfaces; '15c' forces the develop-error screen; '15d' forces the
   *  offline reassurance. Mock photos/note are seeded by the /log route. */
  devForceState?: '15a' | '15b' | '15c' | '15d' | null
}

export interface CaptureRun {
  /** 0-based index of the current station. */
  index: number
  /** total stations in the run. */
  total: number
  /** page-controlled: the current station's save is in flight — disables the finish CTA + header Save. */
  saving: boolean
  /** page-controlled: the current station's save FAILED (network/offline). Shows the save-failure toast
   *  and re-enables the CTA for a retry; the station does NOT advance (draft + earlier rows intact). */
  saveError?: boolean
  /** Save the current station. `kind`: 'structured' (from a developed card) or 'photo' (header Save,
   *  photos only). page.tsx runs the pipeline, ticks the segment, swaps to the next station (or shows
   *  the plural celebrate on the last). */
  onStationSave: (kind: 'structured' | 'photo', card: DevelopResult | null) => void
}

// Fallback eyebrow — used only if the parent hasn't wired the live one. NEVER shows duration.
const EYEBROW = 'Station · Ages 5–7'

// Dev-loop mock — mirrors the frame 8d glimpse so the card + cascade verify without an API call.
const MOCK_DEVELOP: DevelopResult = {
  title: 'Balance Gauntlet',
  setup_steps: ['Cross the balance beam', 'Grab the rings'],
  cues: 'Keep eyes forward and arms wide for balance.',
  skills: ['balance', 'grip', 'agility'],
  equipment: ['balance beam', 'rings'],
  duration_minutes: null,
}

const INTER = 'var(--font-inter), sans-serif'

// Save-failure copy (chunk 9) — UNAUTHORED (no export frame covers a failed insert). Reassures that
// the draft is safe and points at the retry. Flagged for River. role=alert (assertive).
const COPY_SAVE_FAIL = 'Couldn’t save — your card is safe. Try again.'

// The develop-state dock (frame 8d tpl259): "↺ try again" re-record · "Save to library" CTA.
// DELIBERATE DIVERGENCE (same rationale as IdleDock): the export authored this dock frosted
// (rgba(12,19,34,0.55) + backdrop-filter blur), but the build tokens mandate a SOLID lit-navy dock,
// and this is the SAME bottom dock as the recording/idle state (which is solid) — a frosted↔solid
// flip between states would jar, and chunk 5's save morph FADES this dock (animation ⇒ solid, per the
// freeze rule). So the surface is solid rgb(12,19,34) with the frame's 1px inset ring + drop shadow;
// every other value (height 52, radius 26, padding, the blue Save button, try-again text) is exact.
// NOTE for River: "Save to library" is authored BLUE (rgb(42,107,219)) in the frame, not the orange
// accent — kept per the Fidelity Law; flag if you want it orange.
// saveLabel: "Save to library" (single flow / last station) or "Save & next station →" (13c, mid-run).
// The 13c CTA is the SAME blue button, only the words change. disabled dims it while the run's
// per-station save is in flight (page awaits the pipeline before swapping stations).
function DevelopDock({ onTryAgain, onSave, saveLabel = 'Save to library', disabled = false, tryAgainLabel = 'Try again — re-record the voice note' }: { onTryAgain: () => void; onSave: () => void; saveLabel?: string; disabled?: boolean; tryAgainLabel?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 46,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        height: 52,
        padding: '0px 6px 0px 18px',
        borderRadius: 26,
        background: 'rgb(12,19,34)',
        boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
      }}
    >
      <button
        type="button"
        onClick={onTryAgain}
        aria-label={tryAgainLabel}
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, border: 'none', background: 'transparent', padding: '0 6px', margin: '0 -6px', cursor: 'pointer', fontFamily: INTER, fontWeight: 500, fontSize: 13, color: 'rgb(159,176,200)' }}
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>↺</span>
        <span>try again</span>
      </button>
      {/* The button is a transparent ≥44px hit area; the visible pill keeps the authored 40px. */}
      <button
        type="button"
        onClick={() => { if (!disabled) onSave() }}
        aria-label={saveLabel}
        aria-disabled={disabled}
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, border: 'none', background: 'transparent', padding: 0, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, padding: '0px 20px', borderRadius: 20, background: 'rgb(42,107,219)', fontFamily: INTER, fontWeight: 700, fontSize: 13.5, color: 'rgb(255,255,255)', whiteSpace: 'nowrap' }}>
          {saveLabel}
        </span>
      </button>
    </div>
  )
}

// Draft-discard confirm — NOT authored in any export frame (no fidelity conflict). The shared
// ConfirmSheet primitive was evaluated and REJECTED here: it renders in the old app's tokens
// (font-heading = Russo One, accent-fire, Tailwind radii) which the flow's pinned tokens ban
// (Inter only, #ff5a1f, screen-local surfaces). This screen-local sheet covers the a11y contract
// itself: focus moves in on open, Tab is trapped between the two buttons, Escape cancels.
function DiscardConfirm({
  onDiscard,
  onCancel,
  title = 'Discard this draft?',
  body = 'Your note and the structured card won’t be saved.',
  confirmLabel = 'Discard',
}: {
  onDiscard: () => void
  onCancel: () => void
  title?: string
  body?: string
  confirmLabel?: string
}) {
  const discardRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Focus the safe action first (destructive confirm shouldn't be the accidental Enter target).
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      } else if (e.key === 'Tab') {
        const first = discardRef.current
        const last = cancelRef.current
        if (!first || !last) return
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        } else if (document.activeElement !== first && document.activeElement !== last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(8,12,26,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 390, margin: '0 12px 24px', background: 'rgb(20,28,50)', border: '1px solid rgb(42,52,80)', borderRadius: 20, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 17, color: 'rgb(255,255,255)', textAlign: 'center' }}>{title}</span>
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)', textAlign: 'center' }}>{body}</span>
        <button
          ref={discardRef}
          type="button"
          onClick={onDiscard}
          className="transition-transform active:scale-[0.98]"
          style={{ minHeight: 48, border: 'none', borderRadius: 14, background: 'rgb(255,90,31)', cursor: 'pointer', fontFamily: INTER, fontWeight: 700, fontSize: 15, color: 'rgb(255,255,255)' }}
        >
          {confirmLabel}
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="transition-transform active:scale-[0.98]"
          style={{ minHeight: 44, border: '1px solid rgb(42,52,80)', borderRadius: 14, background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 14, color: 'rgb(231,238,250)' }}
        >
          Keep editing
        </button>
      </div>
    </div>
  )
}

// ── develop rig — ports motion-dc.js dvStage/dvReveal (dvCfg {total:940, stagger:105, settle:8,
// scrim:1}). Operates on refs via WAAPI (document timeline). ────────────────────────────────────
const DV = { total: 940, stagger: 105, settle: 8, scrim: 1 }
function dvEls(r: DevelopCascadeRefs): HTMLElement[] {
  return [r.label, r.title, r.step1, r.step2, r.more, r.chips].map((x) => x.current).filter(Boolean) as HTMLElement[]
}
function dvFade(el: HTMLElement | null, to: number, dur: number) {
  if (!el) return
  // fill:'both' so the WAAPI end value keeps winning over the element's JSX-declared opacity:0 even
  // if React re-renders after the reveal (an imperative el.style.opacity would get clobbered back).
  el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: String(to) }], { duration: dur, easing: 'ease', fill: 'both' })
  el.style.opacity = String(to)
}
function dvStage(r: DevelopCascadeRefs) {
  const s = r.scrim.current
  if (s) { s.getAnimations().forEach((a) => a.cancel()); s.style.opacity = '0' }
  dvEls(r).forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.style.opacity = '0'; el.style.transform = 'none' })
}
function dvReveal(r: DevelopCascadeRefs, reduced: boolean) {
  const { total, stagger, settle, scrim } = DV
  const els = dvEls(r)
  const s = r.scrim.current
  if (reduced) {
    const d = 250
    // No pre-set of style.opacity here: dvFade reads the CURRENT computed opacity as its start
    // value, so pre-setting the target would make it animate 1→1 (instant pop, not a 250ms fade).
    if (s) dvFade(s, scrim, d)
    els.forEach((el) => { el.style.transform = 'none'; dvFade(el, 1, d) })
    return
  }
  // scrim deepens first (plain rgba layer — safe to animate). fill:'both' persists the deepened end
  // state over any post-reveal React re-render (the scrim's JSX opacity is 0).
  if (s) {
    s.style.opacity = String(scrim)
    s.animate([{ opacity: 0 }, { opacity: scrim }], { duration: total * 0.4, easing: 'ease-out', fill: 'both' })
  }
  // elements resolve dim→crisp with a small upward settle. fill:'both' = start value held during the
  // delay (was 'backwards') AND end value held after finish (survives React clobbering opacity:0).
  els.forEach((el, i) => {
    const delay = total * 0.25 + i * stagger
    el.style.opacity = '1'
    el.style.transform = 'translateY(0px)'
    el.animate(
      [
        { opacity: 0, transform: `translateY(${settle}px)` },
        { opacity: 0.55, transform: `translateY(${settle * 0.35}px)`, offset: 0.55 },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      { duration: total * 0.55, delay, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' }
    )
  })
}
function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// ── save morph — ports motion-dc.js onSaveTap (the grow-morph of the DevelopedCard into the celebrate
// thumb slot + the celebrate beats). Baked spring: 390ms, ζ=0.591, ωn=6.6, sampled to 33 WAAPI
// keyframes; shadow 24px/60px/0.55 → 4px/10px/0. The real app is not transform-scaled (unlike the dev
// harness), so geometry is in literal px (scale = 1). Nothing here animates over a backdrop-filter.
interface Geom { left: number; top: number; w: number; h: number; r: number }
const MS_START: Geom = { left: 8, top: 92, w: 374, h: 374, r: 20 }

function msSpring(t: number): number {
  if (t >= 1) return 1
  const zeta = 0.591, wn = 6.6, wd = wn * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + ((zeta * wn) / wd) * Math.sin(wd * t))
}
function msShadowStr(p: number): string {
  const oy = 24 + (4 - 24) * p, bl = 60 + (10 - 60) * p, a = Math.max(0, 0.55 + (0 - 0.55) * p)
  return `0 ${oy.toFixed(1)}px ${bl.toFixed(1)}px rgba(0,0,0,${a.toFixed(3)})`
}
function msApplyGeom(card: HTMLElement, g: Geom) {
  card.style.left = g.left + 'px'
  card.style.top = g.top + 'px'
  card.style.width = g.w + 'px'
  card.style.height = g.h + 'px'
  card.style.borderRadius = g.r + 'px'
  card.style.boxShadow = msShadowStr(1)
}
function msTargetGeom(slot: HTMLElement, screen: HTMLElement): Geom {
  const sr = screen.getBoundingClientRect()
  const r = slot.getBoundingClientRect()
  return { left: r.left - sr.left, top: r.top - sr.top, w: r.width, h: r.height, r: 10 }
}
// The four chrome layers fade out together (header · dots · dock · card overlay) — 150ms each.
function msFadeOut(els: Array<HTMLElement | null>) {
  els.forEach((el) => {
    if (!el) return
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease', fill: 'forwards' })
  })
}
// The celebrate beats: bg 320@80 · celeb 260@120 · inner translateY 14→0 420@120 · check scale 420@200.
function msRunCeleb(r: CelebrateRefs) {
  const { bg, celeb, inner, check } = r
  if (bg.current) { bg.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 80, easing: 'ease', fill: 'both' }) }
  if (celeb.current) { celeb.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, easing: 'ease', fill: 'both' }) }
  if (inner.current) { inner.current.animate([{ transform: 'translateY(14px)' }, { transform: 'translateY(0px)' }], { duration: 420, delay: 120, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' }) }
  if (check.current) { check.current.animate([{ transform: 'scale(0.5)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, delay: 200, easing: 'cubic-bezier(0.34,1.4,0.64,1)', fill: 'both' }) }
}
// Reduced-motion celebrate: quick fades only (no geometry animation).
function msRunCelebReduced(r: CelebrateRefs) {
  if (r.bg.current) r.bg.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 120, fill: 'both' })
  if (r.celeb.current) r.celeb.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 140, fill: 'both' })
}

// Clamp the natural aspect (w/h) of the cover photo to the band range [16:9 … 4:5].
const AR_MIN = 4 / 5 // tallest allowed (0.8)
const AR_MAX = 16 / 9 // widest allowed (1.778)

function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TypeChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 8 5" fill="none" aria-hidden="true">
      <path d="M1 1l3 3 3-3" stroke="#9fb0c8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StackCountGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.6" y="1.2" width="8" height="8" rx="2" stroke="#e7eefa" strokeWidth="1.3" transform="rotate(6 7.6 5.2)" />
      <rect x="1.8" y="4.4" width="8" height="8" rx="2" fill="rgba(12,19,34,0.9)" stroke="#e7eefa" strokeWidth="1.3" />
    </svg>
  )
}

// Empty-state photo-stack button glyph (8b) — two offset photo frames, custom 1.5px rounded strokes.
function PhotoStackGlyph() {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" fill="none" aria-hidden="true">
      <rect x="6" y="9" width="24" height="18" rx="4" transform="rotate(-6 18 18)" stroke="#8fa0bd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <g>
        <rect x="12" y="13" width="24" height="18" rx="4" fill="#141c32" stroke="#e7eefa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18.5" cy="18.5" r="1.8" stroke="#e7eefa" strokeWidth="1.3" />
        <path d="M13.5 27.5 L20 21 L24 24.5 L28.5 20 L34.5 27.5" stroke="#e7eefa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// Header — grid 1fr/auto/1fr. Back · type-age chip (opens the TypeAgeSheet) · Save (pre-develop only).
// Save handoff LAW: once `developed`, the header Save is gone — "Save to library" owns the finish.
function Header({ empty, developed, eyebrow, onBack, onSave, onEditTypeAge, busy = false }: { empty: boolean; developed: boolean; eyebrow: string; onBack: () => void; onSave?: () => void; onEditTypeAge?: () => void; busy?: boolean }) {
  const saveDisabled = empty || busy
  // Invisible hit-slop → ≥44px tap targets without moving the visible glyph/text (negative margin
  // cancels the padding so the header grid doesn't shift). Not a design value — a safety dimension.
  const hit: React.CSSProperties = { minHeight: 0, padding: '14px 18px', margin: '-14px -18px' }
  return (
    <div
      style={{
        position: 'absolute',
        top: 46,
        left: 0,
        right: 0,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0px 20px',
        height: 40,
        zIndex: 3,
      }}
    >
      <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={onBack} aria-label="Back" style={{ ...hit, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <BackChevron />
        </button>
      </div>
      <div style={{ justifySelf: 'center', display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onEditTypeAge}
          aria-haspopup="dialog"
          aria-label={`${eyebrow}. Change type and ages`}
          style={{ ...hit, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, letterSpacing: '-0.1px', color: 'rgb(231,238,250)' }}>
            {eyebrow}
          </span>
          <TypeChevron />
        </button>
      </div>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
        {!developed && (
          <button
            type="button"
            aria-label="Save"
            aria-disabled={saveDisabled}
            onClick={() => { if (!saveDisabled) onSave?.() }}
            style={{ ...hit, border: 'none', background: 'transparent', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, color: 'rgb(255,255,255)', opacity: saveDisabled ? 0.45 : 1, cursor: saveDisabled ? 'default' : 'pointer' }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}

// Stepper line (frames 13a-1 / 13a-2 / 13c) — the segment progress under the type/age chip. Segments
// 22×4px r2: current bright #e7eefa · done mid #5b6b86 · pending dim rgb(45,58,90). Label "Station N
// of N" Inter 600 11px #9fb0c8. The whole Capture remounts per station, so the live-region announce is
// set post-mount (a fresh live region doesn't fire on initial render — mirrors Celebrate's pattern).
const STEP_CURRENT = 'rgb(231,238,250)'
const STEP_DONE = 'rgb(91,107,134)'
const STEP_PENDING = 'rgb(45,58,90)'
function StepperLine({ index, total }: { index: number; total: number }) {
  const [announce, setAnnounce] = useState('')
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounce(`Station ${index + 1} of ${total}`), 60)
    return () => window.clearTimeout(id)
  }, [index, total])
  return (
    <div style={{ position: 'absolute', top: 88, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, zIndex: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: 22, height: 4, borderRadius: 2, background: i === index ? STEP_CURRENT : i < index ? STEP_DONE : STEP_PENDING }} />
        ))}
      </div>
      <span aria-hidden="true" style={{ fontFamily: INTER, fontWeight: 600, fontSize: 11, color: 'rgb(159,176,200)' }}>
        Station {index + 1} of {total}
      </span>
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {announce}
      </div>
    </div>
  )
}

type Phase = 'capture' | 'developing' | 'developed'

export default function Capture({ photos, note, onNoteChange, onAddPhotos, onBack, showWhisper = false, devFakeRecording = false, devMockDevelop = false, startDeveloped = null, startExpanded = false, saveType = 'station', saveCurriculums = [], devMockSave = false, onContinue, eyebrow = EYEBROW, onEditTypeAge, onManagePhotos, onReorderPhotos, run = null, devForceState = null }: CaptureProps) {
  const empty = photos.length === 0
  // Multi-station stepper mode (chunk 8). heroTop drops the photo/card to 112 (13a/13c) to clear the
  // stepper line at top:88; the single flow keeps 92 (8a/8d) — the save morph (skipped in run mode)
  // reads MS_START.top:92 unchanged.
  const runMode = !!run
  const heroTop = runMode ? 112 : 92
  const isLastStation = runMode && run.index + 1 >= run.total
  const [typing, setTyping] = useState(false)
  // Chunk 10 (item ③): the hero now BROWSES — heroIndex is the photo the band shows (the D2 dots
  // track it); heroAspects holds each photo's natural aspect (the band resizes to the shown photo,
  // keeping the natural-band law per photo). viewerOpen = the full-screen viewer; recActive = the
  // dock's live record cycle (the hero is NOT a tap target during a take).
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroAspects, setHeroAspects] = useState<Record<string, number>>({})
  const [viewerOpen, setViewerOpen] = useState(false)
  const [recActive, setRecActive] = useState(false)
  // CHUNK 11.5: true while the develop reveal cascade is playing — the developed card's photo is not a
  // tap target until it settles (a mid-cascade viewer open would fight the deepening scrim / settle).
  const [cascadeActive, setCascadeActive] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [phase, setPhase] = useState<Phase>('capture')
  const [developed, setDeveloped] = useState<DevelopResult | null>(null)
  const [developError, setDevelopError] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // ── graceful states (chunk 9) ──────────────────────────────────────────────────────────────────
  // offline: the real connection signal (navigator.onLine + a failed develop/save + a 'network' voice
  // error). Blocks structuring with the 15d reassurance; capture/record/type stay usable. saveError:
  // a failed insert in the single flow — holds the celebrate, shows the retry toast, draft intact.
  // inserting: the awaited insert is in flight (Save disabled) — the celebrate only mounts on success.
  const [offline, setOffline] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [inserting, setInserting] = useState(false)
  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    if (typeof navigator !== 'undefined') setOffline(!navigator.onLine)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])
  const showOffline = offline || devForceState === '15d'
  // Expanded editorial notes doc (chunk 4). Opened by "Review & edit ›"; back returns to the glimpse.
  const [expanded, setExpanded] = useState(false)
  const isDeveloped = phase === 'developed'

  // ── save + celebrate (chunk 5) ──────────────────────────────────────────────────────────────────
  // savePhase: 'idle' before Save · 'run' during the morph/arrival · 'done' once settled (Celebrate
  // live). saveMode: 'morph' grows the DevelopedCard into the thumb slot; 'arrive' fades Celebrate in
  // (no source card — photo-only header Save, or Save from the notes doc).
  const [savePhase, setSavePhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [saveMode, setSaveMode] = useState<'morph' | 'arrive'>('morph')
  const [celebTitle, setCelebTitle] = useState('')
  const saving = savePhase !== 'idle'
  const showNotes = isDeveloped && expanded && !saving

  // Cascade refs — the develop rig drives these on the DevelopedCard (WAAPI over the doc timeline).
  const cardRef = useRef<HTMLDivElement | null>(null)
  const dvScrim = useRef<HTMLDivElement | null>(null)
  const dvLabel = useRef<HTMLDivElement | null>(null)
  const dvTitle = useRef<HTMLDivElement | null>(null)
  const dvStep1 = useRef<HTMLDivElement | null>(null)
  const dvStep2 = useRef<HTMLDivElement | null>(null)
  const dvMore = useRef<HTMLButtonElement | null>(null)
  const dvChips = useRef<HTMLDivElement | null>(null)
  const cascade: DevelopCascadeRefs = { scrim: dvScrim, label: dvLabel, title: dvTitle, step1: dvStep1, step2: dvStep2, more: dvMore, chips: dvChips }

  // Save-morph refs. screenRef = the Capture root (coordinate origin for the slot measurement).
  // overlayRef = the card's text/scrim overlay (fades out as it shrinks). chromeRef/dotsRef =
  // header+dock / pill dots (fade out). The celebrate refs are handed to <Celebrate refs={…}/>.
  const screenRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const chromeRef = useRef<HTMLDivElement | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const dotsRef = useRef<HTMLDivElement | null>(null)
  const celebBg = useRef<HTMLDivElement | null>(null)
  const celebWrap = useRef<HTMLDivElement | null>(null)
  const celebInner = useRef<HTMLDivElement | null>(null)
  const celebCheck = useRef<HTMLDivElement | null>(null)
  const thumbSlot = useRef<HTMLDivElement | null>(null)
  const celebRefs: CelebrateRefs = { bg: celebBg, celeb: celebWrap, inner: celebInner, check: celebCheck, thumbSlot }

  // Persistence bookkeeping: the saved row id (for rename/title-swap), the user's manual rename (wins
  // over the async AI title), and a rename queued before the id exists.
  const savedIdRef = useRef<string | null>(null)
  const userRenamedRef = useRef(false)
  const pendingRenameRef = useRef<string | null>(null)
  const saveGenRef = useRef(0)

  const cover = photos[0]
  // Clamp heroIndex when photos shrink (sheet removals / station swaps).
  useEffect(() => {
    if (heroIndex >= photos.length && photos.length > 0) setHeroIndex(photos.length - 1)
    else if (photos.length === 0 && heroIndex !== 0) setHeroIndex(0)
  }, [photos.length, heroIndex])
  const heroPhoto = photos[Math.min(heroIndex, Math.max(0, photos.length - 1))]
  const setHeroAspect = useCallback((id: string, ar: number) => {
    setHeroAspects((prev) => (prev[id] === ar ? prev : { ...prev, [id]: ar }))
  }, [])
  const clampBand = (ar: number | undefined) => (ar ? Math.min(AR_MAX, Math.max(AR_MIN, ar)) : 1)
  // The band sizes to the SHOWN photo (natural-band per photo); the 15c hero stays on the cover.
  const bandAspect = clampBand(heroPhoto ? heroAspects[heroPhoto.id] : undefined)
  const coverBandAspect = clampBand(cover ? heroAspects[cover.id] : undefined)

  // CHUNK 11.5: open the full-screen viewer at a given index (clamped). Shared with the hero: sets
  // heroIndex so the viewer opens on the intended photo and the hero/card/band stay in sync on close.
  // The developed card + notes band both open at the COVER (index 0 = what they display).
  const openViewerAt = useCallback((i: number) => {
    if (photos.length === 0) return
    setHeroIndex(Math.max(0, Math.min(photos.length - 1, i)))
    setViewerOpen(true)
  }, [photos.length])

  const pickMedia = () => fileRef.current?.click()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onAddPhotos(files)
    e.target.value = ''
  }

  // Dev door (?dev=developed | ?dev=notes): jump straight into the developed state with mock data;
  // ?dev=notes additionally opens the expanded NotesDoc.
  useEffect(() => {
    if (startDeveloped) {
      setDeveloped(startDeveloped)
      setPhase('developed')
      if (startExpanded) setExpanded(true)
    }
  }, [startDeveloped, startExpanded])

  // Dev door (?dev=state15c): force the develop-error screen (mock note + photo seeded by the route).
  useEffect(() => {
    if (devForceState === '15c') setDevelopError(true)
  }, [devForceState])

  // Run the reveal once the developed card is mounted. This effect runs after the DOM commit, so the
  // cascade refs are already attached — dvStage hides everything (belt on top of the card's JSX
  // opacity:0), then dvReveal deepens the scrim + cascades the content. Run synchronously (no rAF): the
  // reveal keyframes start at opacity 0 so there's no flash, and rAF is suspended in a backgrounded tab.
  useEffect(() => {
    if (phase !== 'developed') return
    dvStage(cascade)
    const reduced = prefersReduced()
    dvReveal(cascade, reduced)
    // CHUNK 11.5: hold tap-to-view off the developed card until the cascade FULLY settles. The last
    // cascade element (chips, i=5) starts at total*0.25 + 5*stagger and runs total*0.55, so the true
    // finish is total*0.8 + 5*stagger (≈1277ms), NOT the raw DV.total — derive it so the guard matches
    // its own promise. Reduced path = a single 250ms dvFade.
    setCascadeActive(true)
    const holdMs = reduced ? 300 : Math.round(DV.total * 0.8 + 5 * DV.stagger) + 80
    const t = window.setTimeout(() => setCascadeActive(false), holdMs)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // In-flight develop request — aborted on unmount, on back-out, and superseded by a newer attempt.
  const developAbortRef = useRef<AbortController | null>(null)
  const abortDevelop = useCallback(() => {
    developAbortRef.current?.abort()
    developAbortRef.current = null
  }, [])
  useEffect(() => () => developAbortRef.current?.abort(), [])

  // "Structure it ✨" → POST /api/develop (or a mocked resolve in the dev loop). On failure, return to
  // the raw note intact with a quiet retry (the full graceful screen is chunk 9 — never dead-end).
  // Stale/aborted responses are ignored (the controller is the request's identity token).
  const structure = useCallback(async () => {
    if (phase !== 'capture') return
    const text = note.trim()
    if (!text) return
    // 15d — offline blocks structuring (the /api/develop relay is unreachable). Don't spin a doomed
    // fetch: keep the raw note, surface the reassurance. The coach can still Save the raw note now, or
    // tap ↑ again once back online. Capture/record/type stay usable.
    if (!devMockDevelop && typeof navigator !== 'undefined' && !navigator.onLine) {
      setDevelopError(false)
      setOffline(true)
      return
    }
    abortDevelop()
    const ac = new AbortController()
    developAbortRef.current = ac
    setDevelopError(false)
    setPhase('developing')
    try {
      let data: DevelopResult
      if (devMockDevelop) {
        // Abortable mock delay — the dev loop must honor back-out exactly like the real fetch.
        await new Promise<void>((resolve, reject) => {
          const id = window.setTimeout(resolve, 550)
          ac.signal.addEventListener('abort', () => {
            window.clearTimeout(id)
            reject(new DOMException('aborted', 'AbortError'))
          })
        })
        data = MOCK_DEVELOP
      } else {
        const res = await fetch('/api/develop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
          signal: ac.signal,
        })
        if (!res.ok) throw new Error(`develop ${res.status}`)
        const raw = (await res.json()) as Partial<DevelopResult>
        // Validate the shape before rendering — a malformed body takes the quiet-retry path,
        // never a render throw.
        if (typeof raw.title !== 'string' || !Array.isArray(raw.setup_steps) || !Array.isArray(raw.skills)) {
          throw new Error('develop bad shape')
        }
        data = {
          title: raw.title,
          setup_steps: raw.setup_steps.filter((s): s is string => typeof s === 'string'),
          cues: typeof raw.cues === 'string' ? raw.cues : '',
          skills: raw.skills.filter((s): s is string => typeof s === 'string'),
          equipment: Array.isArray(raw.equipment) ? raw.equipment.filter((s): s is string => typeof s === 'string') : [],
          duration_minutes: typeof raw.duration_minutes === 'number' ? raw.duration_minutes : null,
        }
      }
      if (ac.signal.aborted || developAbortRef.current !== ac) return // stale — a back-out or newer attempt owns the state
      setDeveloped(data)
      setPhase('developed')
    } catch {
      if (ac.signal.aborted || developAbortRef.current !== ac) return // aborted/stale — whoever aborted set the state
      setPhase('capture')
      // The connection dropped mid-request → route to 15d (offline), not the 15c parse-fail screen.
      if (typeof navigator !== 'undefined' && !navigator.onLine) setOffline(true)
      else setDevelopError(true)
    } finally {
      if (developAbortRef.current === ac) developAbortRef.current = null
    }
  }, [phase, note, devMockDevelop, abortDevelop])

  // ── Save pipeline (chunk 9 rework — the insert is now AWAITED before the celebrate) ─────────────
  // The silent-save-failure gap is closed here: the insert must SUCCEED before "Logged. Forever." can
  // appear. On failure we hold the celebrate, raise the retry toast, and keep the draft (photos/note/
  // card) exactly. The AI title is still best-effort + async (it never blocks the celebration).
  //   kind: 'structured' (developed card) · 'photo' (photo-only header Save) · 'raw' (15c raw note).
  type SaveKind = 'structured' | 'photo' | 'raw'

  // Best-effort AI title, resolved AFTER the celebrate is up (fills in quietly; a later Continue bumps
  // saveGenRef so a stale resolution can't write to an abandoned save).
  const swapTitle = useCallback(
    async (kind: SaveKind, card: DevelopResult | null, id: string | null) => {
      const gen = saveGenRef.current
      const t =
        kind === 'photo'
          ? await titleFromPhoto(photos[0]?.file ?? photos[0]?.url ?? '')
          : kind === 'raw' || (kind === 'structured' && card && !card.title.trim())
            ? await titleFromText(note)
            : null
      if (!t || userRenamedRef.current) return
      if (gen === saveGenRef.current) setCelebTitle(t)
      if (id) updateComponentTitle(id, t).catch((e) => console.warn('[save] title swap failed', e))
    },
    [photos, note],
  )

  // Kick off a save. Awaits the insert; only on success does it mount Celebrate (staged) + run the
  // morph (the layout effect below fires on savePhase 'run'). On failure it sets saveError (retry
  // toast) and leaves the draft untouched — the coach taps Save again to retry.
  const beginSave = useCallback(
    async (mode: 'morph' | 'arrive', kind: SaveKind, card: DevelopResult | null) => {
      if (saving || inserting) return
      setSaveError(false)
      savedIdRef.current = null
      userRenamedRef.current = false
      pendingRenameRef.current = null
      const seed = card?.title.trim() || fallbackTitle(saveType)

      let id: string | null = null
      if (!devMockSave) {
        const input: SaveCardInput = {
          type: saveType,
          title: seed,
          curriculums: saveCurriculums,
          setupSteps: kind === 'structured' && card ? card.setup_steps : [],
          cues: kind === 'structured' && card ? card.cues : '',
          skills: kind === 'structured' && card ? card.skills : [],
          equipment: kind === 'structured' && card ? card.equipment : [],
          durationMinutes: kind === 'structured' && card ? card.duration_minutes : null,
          // 'raw'/'photo' carry the raw note so a save with no structured steps never drops the coach's
          // words (saveComponent maps it into `description` when there are no steps/cues).
          rawNote: kind === 'raw' || kind === 'photo' ? (note.trim() || undefined) : undefined,
          photos: photos.map((p) => ({ file: p.file, url: p.url })),
        }
        setInserting(true)
        try {
          const res = await saveComponent(input)
          id = res.id
        } catch (e) {
          console.warn('[save] insert failed', e)
          setInserting(false)
          if (typeof navigator !== 'undefined' && !navigator.onLine) setOffline(true)
          setSaveError(true) // hold the celebrate; the draft is intact; Save retries
          return
        }
        setInserting(false)
      }

      savedIdRef.current = id
      setCelebTitle(seed)
      setSaveMode(mode)
      setSavePhase('run')
      void swapTitle(kind, card, id)
    },
    [saving, inserting, devMockSave, saveType, saveCurriculums, photos, note, swapTitle],
  )

  // Run the morph/arrival once Celebrate mounts (savePhase 'run'). Layout effect so the slot rect is
  // measured post-commit, pre-paint. Guarded to run once per entry via the ref latch.
  const morphRan = useRef(false)
  useLayoutEffect(() => {
    if (savePhase !== 'run') { morphRan.current = false; return }
    if (morphRan.current) return
    morphRan.current = true

    const reduced = prefersReduced()
    const chromeEls = [chromeRef.current, dotsRef.current, dockRef.current, overlayRef.current]

    if (saveMode === 'arrive') {
      // No source card — fade the celebrate in over an opaque backdrop.
      msFadeOut(chromeEls)
      if (reduced) msRunCelebReduced(celebRefs)
      else msRunCeleb(celebRefs)
      const t = window.setTimeout(() => setSavePhase('done'), reduced ? 300 : 660)
      return () => window.clearTimeout(t)
    }

    // Grow-morph: the DevelopedCard shrinks into the thumb slot.
    const card = cardRef.current, screen = screenRef.current, slot = thumbSlot.current
    if (!card || !screen || !slot) { setSavePhase('done'); return }
    const end = msTargetGeom(slot, screen)

    if (reduced) {
      msFadeOut(chromeEls)
      msApplyGeom(card, end)
      msRunCelebReduced(celebRefs)
      const t = window.setTimeout(() => setSavePhase('done'), 300)
      return () => window.clearTimeout(t)
    }

    msFadeOut(chromeEls)
    msRunCeleb(celebRefs)
    const N = 32, kf: Keyframe[] = []
    for (let i = 0; i <= N; i++) {
      const p = msSpring(i / N)
      kf.push({
        left: MS_START.left + (end.left - MS_START.left) * p + 'px',
        top: MS_START.top + (end.top - MS_START.top) * p + 'px',
        width: MS_START.w + (end.w - MS_START.w) * p + 'px',
        height: MS_START.h + (end.h - MS_START.h) * p + 'px',
        borderRadius: MS_START.r + (end.r - MS_START.r) * p + 'px',
        boxShadow: msShadowStr(Math.min(1, p)),
      })
    }
    msApplyGeom(card, end) // land exactly on the slot; WAAPI fill:forwards holds it
    const anim = card.animate(kf, { duration: 390, easing: 'linear', fill: 'forwards' })
    anim.onfinish = () => setSavePhase('done')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savePhase, saveMode])

  // While saving OR while the full-screen photo viewer is up, everything behind the overlay layer is
  // still in the DOM — take it out of the tab order + accessibility tree (`inert`) so keyboard/
  // VoiceOver users don't traverse invisible Back/Save/try-again/Review/hero controls behind it.
  // Covers the morph chrome, the photo-state chrome (arrive path), and the viewer (chunk 10 polish:
  // the viewer is aria-modal, but the sibling chrome must ALSO be inert or VO can walk out of it).
  // The celebrate + viewer layers are exempt via their data markers.
  useEffect(() => {
    const root = screenRef.current
    if (!root) return
    const overlayUp = saving || viewerOpen
    const kids = Array.from(root.children) as HTMLElement[]
    kids.forEach((k) => {
      if (k.hasAttribute('data-celebrate-layer') || k.hasAttribute('data-viewer-layer')) return
      if (overlayUp) { k.setAttribute('inert', ''); k.setAttribute('aria-hidden', 'true') }
      else { k.removeAttribute('inert'); k.removeAttribute('aria-hidden') }
    })
  }, [saving, viewerOpen])

  const handleRename = (next: string) => {
    userRenamedRef.current = true
    setCelebTitle(next)
    if (savedIdRef.current) updateComponentTitle(savedIdRef.current, next).catch((e) => console.warn('[save] rename failed', e))
    else pendingRenameRef.current = next // save still in flight — apply when the id lands
  }

  const handleShare = () => {
    void shareCard({
      title: celebTitle,
      eyebrow,
      photoUrl: photos[0]?.url ?? '',
      setupSteps: developed?.setup_steps ?? [],
      cues: developed?.cues ?? '',
    })
  }

  const handleContinue = () => {
    // Reset to a fresh empty capture (frame 8b). Parent revokes the saved photos' object URLs.
    saveGenRef.current += 1 // abandon any still-in-flight title swap for the finished save
    setSavePhase('idle')
    setSaveMode('morph')
    setCelebTitle('')
    setPhase('capture')
    setDeveloped(null)
    setDevelopError(false)
    setExpanded(false)
    setHeroIndex(0)
    setHeroAspects({})
    setViewerOpen(false)
    savedIdRef.current = null
    onContinue?.()
  }

  const handleBack = () => {
    // Run mode: backing out mid-run risks ONLY the current station's draft — earlier stations are
    // already saved library rows. Always confirm (the run-aware copy names that). Confirming exits the
    // whole run (page.tsx resets it); earlier saves stay. BUT ignore Back WHILE a station save is in
    // flight: exitRun can't cancel the pending insert, so a "discarded" station could still land —
    // block the tap until the awaited save resolves + advances (a beat later Back works again).
    if (runMode && run.saving) return
    if (runMode) { setConfirmDiscard(true); return }
    // Post-develop OR mid-develop, backing out risks the draft — confirm the discard. Confirming
    // aborts any in-flight develop; canceling lets it continue (if it resolves behind the sheet,
    // the card develops normally). The raw note itself is never lost either way.
    if (phase !== 'capture') setConfirmDiscard(true)
    else onBack()
  }

  // Interaction lock while the parse is in flight — the note is the request payload; editing or
  // re-recording mid-parse would desync what the developed card shows from what the coach sees.
  const locked = phase === 'developing'

  // ── hero swipe-browse + tap → full-screen viewer (chunk 10 item ③) ──────────────────────────────
  // The D2 dots promised browsing; the strip delivers it transform-only (direct style writes on a ref,
  // no per-move re-render, no layout thrash — the band's aspect only updates once per committed swipe).
  // Tap opens the PhotoViewer at rest ONLY: never during a take (recActive), mid-parse, while typing
  // (the tap's job there is dismissing the keyboard), under the action menu, or during the save morph.
  const heroStripRef = useRef<HTMLDivElement | null>(null)
  const heroDrag = useRef<{ startX: number; startY: number; dx: number; captured: boolean; moved: boolean } | null>(null)
  const heroTapAllowed = phase === 'capture' && !recActive && !typing && !saving
  const setHeroStrip = useCallback((dxPx: number, animate: boolean, index: number) => {
    const el = heroStripRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 260ms cubic-bezier(0.22,0.61,0.36,1)' : 'none'
    el.style.transform = `translateX(calc(${-index * 100}% + ${dxPx}px))`
  }, [])
  // Park the strip on the current index (animated — a viewer swipe or a committed hero swipe slides in).
  useLayoutEffect(() => {
    setHeroStrip(0, true, Math.min(heroIndex, Math.max(0, photos.length - 1)))
  }, [heroIndex, photos.length, setHeroStrip])
  const heroDown = (e: React.PointerEvent) => {
    // During a take the photo is not a control at all (polish #2): no tap AND no swipe-browse —
    // the whole gesture surface is dead until the recording cycle ends.
    if (photos.length === 0 || recActive) return
    heroDrag.current = { startX: e.clientX, startY: e.clientY, dx: 0, captured: false, moved: false }
  }
  const heroMove = (e: React.PointerEvent) => {
    const d = heroDrag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    d.dx = dx
    if (!d.moved && Math.hypot(dx, dy) > 8) d.moved = true
    if (!d.captured && d.moved && Math.abs(dx) > Math.abs(dy)) {
      d.captured = true
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    if (d.captured && photos.length > 1) {
      // rubber-band at the ends (0.35 damping)
      const atEdge = (heroIndex === 0 && dx > 0) || (heroIndex === photos.length - 1 && dx < 0)
      setHeroStrip(atEdge ? dx * 0.35 : dx, false, heroIndex)
    }
  }
  const heroUp = (e: React.PointerEvent) => {
    const d = heroDrag.current
    heroDrag.current = null
    if (!d) return
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    if (d.captured && photos.length > 1) {
      if (d.dx < -48 && heroIndex < photos.length - 1) setHeroIndex(heroIndex + 1)
      else if (d.dx > 48 && heroIndex > 0) setHeroIndex(heroIndex - 1)
      else setHeroStrip(0, true, heroIndex) // under-threshold → snap back
      return
    }
    if (!d.moved && heroTapAllowed) setViewerOpen(true)
  }
  const heroCancel = () => {
    heroDrag.current = null
    setHeroStrip(0, true, heroIndex)
  }
  // VoiceOver announce for hero browse (polish #4 — mirrors the viewer's live region). Populated only
  // on a CHANGE (not mount) so arriving on the screen doesn't speak a stray "Photo 1 of N".
  const [heroAnnounce, setHeroAnnounce] = useState('')
  const heroAnnouncedOnce = useRef(false)
  useEffect(() => {
    if (!heroAnnouncedOnce.current) { heroAnnouncedOnce.current = true; return }
    if (photos.length > 1) setHeroAnnounce(`Photo ${Math.min(heroIndex, photos.length - 1) + 1} of ${photos.length}`)
  }, [heroIndex, photos.length])

  // 15c — the develop-error screen (a full-screen state that REPLACES the capture dock: the authored
  // failure card + a try-again/Save-to-library bar). The raw note is preserved; "Add the steps
  // yourself →" returns to the editable capture; Save writes the raw note; try-again re-develops.
  const showDevelopError = developError && phase === 'capture' && !isDeveloped && !saving
  // The retry toast is global (it can sit over the developed screen OR the 15c screen). Run-mode
  // failures are page-owned (run.saveError).
  const showSaveError = (saveError || !!run?.saveError) && !saving

  return (
    <div
      ref={screenRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgb(8,12,26)',
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {showNotes && (
        <NotesDoc
          photoUrl={cover?.url ?? ''}
          eyebrow={eyebrow}
          data={developed ?? MOCK_DEVELOP}
          onChange={setDeveloped}
          onBack={() => setExpanded(false)}
          onTryAgain={() => { setExpanded(false); setPhase('capture'); setDeveloped(null); setDevelopError(false) }}
          // Run mode: a Save from the expanded notes doc must delegate to the stepper pipeline (not the
          // single-flow beginSave/Celebrate), same as the developed dock — else it desyncs the run.
          onSave={() => { if (runMode) run.onStationSave('structured', developed); else void beginSave('arrive', 'structured', developed) }}
          onEditTypeAge={onEditTypeAge}
          onViewPhoto={cover ? () => openViewerAt(0) : undefined}
        />
      )}

      {!showNotes && !showDevelopError && empty && !isDeveloped && (
        // Top light wash (8b).
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, background: 'linear-gradient(rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
      )}

      {/* Pre-develop header (with photo-only Save). Once developed, the header lives inside the
          chromeRef wrapper below so the save morph can fade it. In run mode header Save = "Save & next
          station" (the photo-only per-station path). */}
      {!showNotes && !isDeveloped && !showDevelopError && (
        <Header
          empty={empty}
          developed={false}
          eyebrow={eyebrow}
          onEditTypeAge={onEditTypeAge}
          onBack={handleBack}
          busy={runMode ? run.saving : inserting}
          // Single flow: a note present on a photo save is carried as the raw note (kind 'raw' → title
          // from text + the words land in `description`); photo-only stays 'photo' (vision title). Run
          // mode keeps the photo-only per-station path (its note flows through develop → 'structured').
          onSave={() => { if (runMode) run.onStationSave('photo', null); else void beginSave('arrive', note.trim() ? 'raw' : 'photo', null) }}
        />
      )}

      {/* Stepper line (13a/13c) — persists across this station's capture + developed states. */}
      {!showNotes && runMode && <StepperLine index={run.index} total={run.total} />}

      {!showNotes && !showDevelopError && (isDeveloped ? (
        <>
          <DevelopedCard
            photoUrl={cover?.url ?? ''}
            eyebrow={eyebrow}
            data={developed ?? MOCK_DEVELOP}
            refs={cascade}
            onExpand={() => setExpanded(true)}
            onViewPhoto={cover && !saving && !cascadeActive ? () => openViewerAt(0) : undefined}
            cardRef={cardRef}
            overlayRef={overlayRef}
            zIndex={saving ? 60 : 30}
            top={heroTop}
          />
          {/* developed-state chrome — faded together by the save morph (header · dots · dock). */}
          <div ref={chromeRef}>
            <Header empty={empty} developed eyebrow={eyebrow} onEditTypeAge={onEditTypeAge} onBack={handleBack} />
          </div>
          {/* screen-level pill dots (tpl255) — the morph fades these out. */}
          {photos.length > 0 && (
            <div ref={dotsRef} style={{ position: 'absolute', top: heroTop + 338, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              {photos.map((p, i) => (
                <div key={p.id} style={{ width: i === 0 ? 14 : 5, height: 5, borderRadius: 3, background: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }} />
              ))}
            </div>
          )}
        </>
      ) : empty ? (
        <div
          style={{
            position: 'absolute',
            inset: '120px 36px 160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 800, fontSize: 27, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'rgb(231,238,250)' }}>
              First, the course.
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)' }}>
              Snap the station as the kids will see it —<br />
              or just describe it with your voice below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => { if (!locked) pickMedia() }}
            aria-label="Add the course photos"
            aria-disabled={locked}
            style={{
              width: 68,
              height: 68,
              borderRadius: 34,
              minHeight: 0,
              padding: 0,
              background: 'rgb(20,28,50)',
              border: '1px solid rgb(42,52,80)',
              boxShadow: 'rgba(255,255,255,0.06) 0px 1px 0px inset, rgba(0,0,0,0.4) 0px 14px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <PhotoStackGlyph />
          </button>
        </div>
      ) : (
        // Photo hero — natural whole-photo band (8a). heroTop = 112 in run mode (clears the stepper).
        // Chunk 10 (item ③): the band hosts a transform-only SWIPE STRIP (browse between angles, the
        // dots follow) and a tap opens the full-screen viewer (rest states only — see heroTapAllowed).
        <div
          style={{
            position: 'absolute',
            top: heroTop,
            left: 8,
            right: 8,
            aspectRatio: String(bandAspect),
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: 'rgba(0,0,0,0.55) 0px 24px 60px',
          }}
        >
          <div
            role="button"
            tabIndex={heroTapAllowed ? 0 : -1}
            aria-label={`Course photo ${Math.min(heroIndex, photos.length - 1) + 1} of ${photos.length}.${heroTapAllowed ? ' View full screen.' : ''}${photos.length > 1 ? ' Swipe to browse.' : ''}`}
            onPointerDown={heroDown}
            onPointerMove={heroMove}
            onPointerUp={heroUp}
            onPointerCancel={heroCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (heroTapAllowed) setViewerOpen(true) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); setHeroIndex((i) => Math.max(0, i - 1)) }
              else if (e.key === 'ArrowRight') { e.preventDefault(); setHeroIndex((i) => Math.min(photos.length - 1, i + 1)) }
            }}
            style={{ position: 'absolute', inset: 0, touchAction: 'pan-y', cursor: heroTapAllowed ? 'zoom-in' : 'default', outline: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          >
            <div ref={heroStripRef} style={{ display: 'flex', width: '100%', height: '100%' }}>
              {photos.map((p, i) => (
                <div key={p.id} aria-hidden={i !== heroIndex} style={{ flex: '0 0 100%', height: '100%', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      if (img.naturalWidth && img.naturalHeight) setHeroAspect(p.id, img.naturalWidth / img.naturalHeight)
                    }}
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* bottom scrim */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)', pointerEvents: 'none' }} />

          {/* polite announce for the swipe-browse index (visually hidden) */}
          <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
            {heroAnnounce}
          </div>
          {/* D2 pill-progress dots (photo carousel position — track the swipe-browse index) */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 31, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
            {photos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  width: i === heroIndex ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === heroIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          {/* frosted stack-count chip (2+ photos) — static blur. ONE tap opens the PhotoSheet in BOTH
              modes (chunk 10 item ⑤ — River's gate-B fix: the chip was a dead static indicator mid-run;
              now the /log route scopes the sheet to the CURRENT station's photos in run mode). */}
          {photos.length >= 2 && (
            <button
              type="button"
              onClick={() => { if (!locked) onManagePhotos?.() }}
              aria-label={runMode ? `Manage this station's ${photos.length} photos` : `Manage ${photos.length} photos`}
              aria-disabled={locked}
              aria-haspopup="dialog"
              className="transition-transform active:scale-[0.96]"
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0px 11px',
                borderRadius: 14,
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(12,19,34,0.55)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset',
              }}
            >
              {/* invisible hit-slop → ≥44px tap target without growing the compact chip */}
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', minWidth: 44, height: 44 }} />
              <StackCountGlyph />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 12, color: 'rgb(231,238,250)' }}>
                {photos.length}
              </span>
            </button>
          )}
        </div>
      ))}

      {!showNotes && !showDevelopError && !empty && !isDeveloped && <WhisperLozenge visible={showWhisper} onSort={onManagePhotos} />}

      {!showNotes && !showDevelopError && (isDeveloped ? (
        <div ref={dockRef}>
          <DevelopDock
            onTryAgain={() => { setPhase('capture'); setDeveloped(null); setDevelopError(false) }}
            onSave={() => { if (runMode) run.onStationSave('structured', developed); else void beginSave('morph', 'structured', developed) }}
            saveLabel={runMode ? (isLastStation ? 'Save to library' : 'Save & next station →') : 'Save to library'}
            disabled={runMode ? run.saving : inserting}
          />
        </div>
      ) : (
        <>
          {/* Gate A (River, 2026-07-09): the "Structure it ✨" floating pill is GONE. The continuity
              disc IS the door — a non-empty note turns it into ↑ (tap = structure). The "Structuring…"
              status + the failure alert now live in the dock's own label slot (see IdleDock). */}
          <IdleDock
            note={note}
            onNoteChange={onNoteChange}
            typing={typing}
            onOpenTyping={() => { if (!locked) setTyping(true) }}
            onCloseTyping={() => setTyping(false)}
            devFakeRecording={devFakeRecording}
            locked={locked}
            onStructure={structure}
            structuring={phase === 'developing'}
            developError={developError && phase === 'capture'}
            offline={showOffline}
            onNetworkError={() => setOffline(true)}
            devForceState={devForceState === '15a' || devForceState === '15b' ? devForceState : null}
            onRecActiveChange={setRecActive}
          />
        </>
      ))}

      {/* 15c — the develop-error screen (frame 15c-ai-couldn-39-t-parse.html). Replaces the bare label
          alert: header (no Save) · photo hero · the authored failure card · a try-again / Save-to-library
          bar. Never a dead end — the raw note is preserved on every branch. */}
      {!showNotes && showDevelopError && (
        <>
          {/* Assertive announcement — the "structuring" attempt failed and the screen changed. VoiceOver
              users get no signal from the (focus-only) failure card, so announce it on mount. */}
          <div role="alert" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
            Couldn&rsquo;t structure the note. Add the steps yourself, save it as-is, or try again.
          </div>
          <Header empty={empty} developed eyebrow={eyebrow} onEditTypeAge={onEditTypeAge} onBack={handleBack} />
          {runMode && <StepperLine index={run.index} total={run.total} />}

          {!empty && (
            <div
              style={{
                position: 'absolute',
                top: heroTop,
                left: 8,
                right: 8,
                aspectRatio: String(coverBandAspect),
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: 'rgba(0,0,0,0.55) 0px 24px 60px',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url}
                alt="Obstacle course station"
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (img.naturalWidth && img.naturalHeight) setHeroAspect(cover.id, img.naturalWidth / img.naturalHeight)
                }}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)', pointerEvents: 'none' }} />
              {photos.length > 0 && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 31, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
                  {photos.map((p, i) => (
                    <div key={p.id} style={{ width: i === 0 ? 14 : 5, height: 5, borderRadius: 3, background: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* the authored failure card (frame tpl817). The whole card is the "add the steps yourself"
              action → returns to the editable capture (note intact, header Save available). */}
          <button
            type="button"
            onClick={() => { if (!inserting) setDevelopError(false) }}
            aria-label="Couldn't auto-fill this one. Add the steps yourself."
            style={{
              position: 'absolute',
              top: 498,
              left: 20,
              right: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 11,
              padding: '18px 20px',
              borderRadius: 16,
              background: 'rgb(20,28,50)',
              border: '1px solid rgb(42,52,80)',
              boxShadow: 'rgba(0,0,0,0.4) 0px 14px 30px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 13, color: 'rgb(231,238,250)' }}>{"Couldn't auto-fill this one."}</span>
            <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 13, color: 'rgb(255,122,47)' }}>Add the steps yourself →</span>
          </button>

          {/* try again → re-develop · Save to library → save the raw note now (never dead-ends). In a
              multi-station run the save/retry delegate to the page's stepper pipeline (NOT the single-flow
              beginSave/Celebrate) so a failed develop mid-run can't desync the run. */}
          <DevelopDock
            onTryAgain={() => { if (!inserting && !(runMode && run.saving)) void structure() }}
            onSave={() => { if (inserting || (runMode && run.saving)) return; if (runMode) run.onStationSave('photo', null); else void beginSave('arrive', 'raw', null) }}
            saveLabel="Save to library"
            disabled={inserting || (runMode ? run.saving : false)}
            tryAgainLabel="Try again — structure the note with AI"
          />
        </>
      )}

      {/* Save-failure retry toast (chunk 9) — assertive; the draft is intact, tapping Save retries.
          Suppressed behind the expanded notes doc (its own overlay owns that surface). */}
      {!showNotes && showSaveError && <GracefulToast text={COPY_SAVE_FAIL} assertive bottom={120} />}

      {/* Save + celebrate (chunk 5). Mounted staged so the thumb slot is measurable before the morph;
          goes live (staged=false) once settled. Morph shows an empty slot (the card lands there);
          arrival shows the cover in the slot. */}
      {saving && (
        <Celebrate
          eyebrow={eyebrow}
          title={celebTitle}
          photoUrl={cover?.url ?? ''}
          staged={savePhase === 'run'}
          showThumbPhoto={saveMode === 'arrive'}
          refs={celebRefs}
          onShare={handleShare}
          onContinue={handleContinue}
          onRename={handleRename}
        />
      )}

      {/* Full-screen photo viewer (chunk 10 item ③) — UNAUTHORED surface, values flagged in
          PhotoViewer.tsx. Opens from a hero tap at rest; index is SHARED with the hero (dots sync).
          "Make cover" reorders via the route (single flow photos[] or the run station's subset). */}
      {viewerOpen && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          index={Math.min(heroIndex, photos.length - 1)}
          onIndexChange={setHeroIndex}
          onMakeCover={(id) => {
            onReorderPhotos?.([id, ...photos.filter((p) => p.id !== id).map((p) => p.id)])
            setHeroIndex(0)
          }}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {confirmDiscard && (
        <DiscardConfirm
          onDiscard={() => { abortDevelop(); setConfirmDiscard(false); onBack() }}
          onCancel={() => setConfirmDiscard(false)}
          {...(runMode
            ? {
                title: 'Leave this station?',
                body: run.index > 0 ? 'Only this station’s draft is lost — your saved stations stay in your library.' : 'This station’s draft is lost.',
                confirmLabel: 'Leave',
              }
            : {})}
        />
      )}
    </div>
  )
}
