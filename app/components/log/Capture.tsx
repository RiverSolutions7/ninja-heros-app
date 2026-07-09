// @design-locked — built from design-export/capture/frames/8a-photo-loaded.html, 8b-empty.html,
// 8a-w-sort-whisper.html, 8d-develop-reveal.html (the pixel truth). Every color/size/radius/opacity
// here is copied from those frames. The photo hero is a natural whole-photo band (clamped 16:9 ↔ 4:5,
// never cropped) — the frame's square placeholder is one instance of that band. Frosted glass is used
// ONLY over the photo (chip, whisper) and stays STATIC; the dock is solid lit navy (see IdleDock).
//
// Develop reveal (chunk 3): after a note lands, "Structure it ✨" (an OPT-IN, ledger-only action —
// NOT authored in any frame; flagged for River) POSTs /api/develop; on success the photo hero is
// replaced by the DevelopedCard and the develop rig (motion-dc.js dvStage/dvReveal) deepens a scrim +
// cascades the card content. FREEZE ASSERT: the animated scrim (DevelopedCard tpl239) is a plain rgba
// linear-gradient, never a backdrop-filter — nothing here animates over a backdrop-filter. Save
// handoff LAW: header "Save" is present pre-develop and DISAPPEARS the moment the card develops;
// "Save to library" (in the develop dock) owns the finish from then on.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PhotoActionMenu from '@/app/components/log-flow/PhotoActionMenu'
import IdleDock from './IdleDock'
import WhisperLozenge from './WhisperLozenge'
import DevelopedCard, { type DevelopResult, type DevelopCascadeRefs } from './DevelopedCard'
import NotesDoc from './NotesDoc'

export interface Photo {
  url: string
  id: string
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
}

// Type + ages eyebrow. Static until the type/age sheet is wired (chunk 6). NEVER shows duration.
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

// The develop-state dock (frame 8d tpl259): "↺ try again" re-record · "Save to library" CTA.
// DELIBERATE DIVERGENCE (same rationale as IdleDock): the export authored this dock frosted
// (rgba(12,19,34,0.55) + backdrop-filter blur), but the build tokens mandate a SOLID lit-navy dock,
// and this is the SAME bottom dock as the recording/idle state (which is solid) — a frosted↔solid
// flip between states would jar, and chunk 5's save morph FADES this dock (animation ⇒ solid, per the
// freeze rule). So the surface is solid rgb(12,19,34) with the frame's 1px inset ring + drop shadow;
// every other value (height 52, radius 26, padding, the blue Save button, try-again text) is exact.
// NOTE for River: "Save to library" is authored BLUE (rgb(42,107,219)) in the frame, not the orange
// accent — kept per the Fidelity Law; flag if you want it orange.
function DevelopDock({ onTryAgain, onSave }: { onTryAgain: () => void; onSave: () => void }) {
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
        aria-label="Try again — re-record the voice note"
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, border: 'none', background: 'transparent', padding: '0 6px', margin: '0 -6px', cursor: 'pointer', fontFamily: INTER, fontWeight: 500, fontSize: 13, color: 'rgb(159,176,200)' }}
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>↺</span>
        <span>try again</span>
      </button>
      {/* The button is a transparent ≥44px hit area; the visible pill keeps the authored 40px. */}
      <button
        type="button"
        onClick={onSave}
        aria-label="Save to library"
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, padding: '0px 20px', borderRadius: 20, background: 'rgb(42,107,219)', fontFamily: INTER, fontWeight: 700, fontSize: 13.5, color: 'rgb(255,255,255)' }}>
          Save to library
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
function DiscardConfirm({ onDiscard, onCancel }: { onDiscard: () => void; onCancel: () => void }) {
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
      aria-label="Discard draft"
      onClick={onCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(8,12,26,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 390, margin: '0 12px 24px', background: 'rgb(20,28,50)', border: '1px solid rgb(42,52,80)', borderRadius: 20, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 17, color: 'rgb(255,255,255)', textAlign: 'center' }}>Discard this draft?</span>
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)', textAlign: 'center' }}>Your note and the structured card won&rsquo;t be saved.</span>
        <button
          ref={discardRef}
          type="button"
          onClick={onDiscard}
          className="transition-transform active:scale-[0.98]"
          style={{ minHeight: 48, border: 'none', borderRadius: 14, background: 'rgb(255,90,31)', cursor: 'pointer', fontFamily: INTER, fontWeight: 700, fontSize: 15, color: 'rgb(255,255,255)' }}
        >
          Discard
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

// Header — grid 1fr/auto/1fr. Back · type-age chip (static, wired ch.6) · Save (pre-develop only).
// Save handoff LAW: once `developed`, the header Save is gone — "Save to library" owns the finish.
function Header({ empty, developed, onBack }: { empty: boolean; developed: boolean; onBack: () => void }) {
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
        {/* aria-haspopup deliberately omitted until the type/age sheet is wired (chunk 6) so SR
            users aren't told a popup exists that does nothing yet. */}
        <button
          type="button"
          aria-label="Station · Ages 5–7. Change type and ages"
          style={{ ...hit, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, letterSpacing: '-0.1px', color: 'rgb(231,238,250)' }}>
            Station · Ages 5–7
          </span>
          <TypeChevron />
        </button>
      </div>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center' }}>
        {!developed && (
          <button
            type="button"
            aria-label="Save"
            aria-disabled={empty}
            style={{ ...hit, border: 'none', background: 'transparent', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 15, color: 'rgb(255,255,255)', opacity: empty ? 0.45 : 1, cursor: 'pointer' }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}

type Phase = 'capture' | 'developing' | 'developed'

export default function Capture({ photos, note, onNoteChange, onAddPhotos, onBack, showWhisper = false, devFakeRecording = false, devMockDevelop = false, startDeveloped = null, startExpanded = false }: CaptureProps) {
  const empty = photos.length === 0
  const [typing, setTyping] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [coverAspect, setCoverAspect] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [phase, setPhase] = useState<Phase>('capture')
  const [developed, setDeveloped] = useState<DevelopResult | null>(null)
  const [developError, setDevelopError] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Expanded editorial notes doc (chunk 4). Opened by "Review & edit ›"; back returns to the glimpse.
  const [expanded, setExpanded] = useState(false)
  const isDeveloped = phase === 'developed'
  const showNotes = isDeveloped && expanded

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

  const cover = photos[0]
  const bandAspect = coverAspect ? Math.min(AR_MAX, Math.max(AR_MIN, coverAspect)) : 1

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

  // Run the reveal once the developed card is mounted. This effect runs after the DOM commit, so the
  // cascade refs are already attached — dvStage hides everything (belt on top of the card's JSX
  // opacity:0), then dvReveal deepens the scrim + cascades the content. Run synchronously (no rAF): the
  // reveal keyframes start at opacity 0 so there's no flash, and rAF is suspended in a backgrounded tab.
  useEffect(() => {
    if (phase !== 'developed') return
    dvStage(cascade)
    dvReveal(cascade, prefersReduced())
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
      setDevelopError(true)
    } finally {
      if (developAbortRef.current === ac) developAbortRef.current = null
    }
  }, [phase, note, devMockDevelop, abortDevelop])

  const handleBack = () => {
    // Post-develop OR mid-develop, backing out risks the draft — confirm the discard. Confirming
    // aborts any in-flight develop; canceling lets it continue (if it resolves behind the sheet,
    // the card develops normally). The raw note itself is never lost either way.
    if (phase !== 'capture') setConfirmDiscard(true)
    else onBack()
  }

  // "Structure it ✨" shows once a raw note exists (voice take or typed) and we're not mid-typing.
  const showStructure = phase === 'capture' && note.trim().length > 0 && !typing
  // Interaction lock while the parse is in flight — the note is the request payload; editing or
  // re-recording mid-parse would desync what the developed card shows from what the coach sees.
  const locked = phase === 'developing'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgb(8,12,26)',
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {showNotes && (
        <NotesDoc
          photoUrl={cover?.url ?? ''}
          eyebrow={EYEBROW}
          data={developed ?? MOCK_DEVELOP}
          onChange={setDeveloped}
          onBack={() => setExpanded(false)}
          onTryAgain={() => { setExpanded(false); setPhase('capture'); setDeveloped(null); setDevelopError(false) }}
          onSave={() => { /* save morph + persistence — chunk 5 */ }}
        />
      )}

      {!showNotes && empty && !isDeveloped && (
        // Top light wash (8b).
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, background: 'linear-gradient(rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none' }} />
      )}

      {!showNotes && <Header empty={empty} developed={isDeveloped} onBack={handleBack} />}

      {!showNotes && (isDeveloped ? (
        <>
          <DevelopedCard
            photoUrl={cover?.url ?? ''}
            eyebrow={EYEBROW}
            data={developed ?? MOCK_DEVELOP}
            refs={cascade}
            onExpand={() => setExpanded(true)}
            cardRef={cardRef}
          />
          {/* screen-level pill dots (tpl255) — sit behind the card now; chunk 5 fades them as the
              card morphs away. Rendered for fidelity + chunk-5 readiness. */}
          {photos.length > 0 && (
            <div style={{ position: 'absolute', top: 430, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
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
            onClick={() => { if (!locked) setMenuOpen(true) }}
            aria-label="Add the course photos"
            aria-disabled={locked}
            aria-haspopup="menu"
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
        // Photo hero — natural whole-photo band (8a).
        <div
          style={{
            position: 'absolute',
            top: 92,
            left: 8,
            right: 8,
            aspectRatio: String(bandAspect),
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
              if (img.naturalWidth && img.naturalHeight) setCoverAspect(img.naturalWidth / img.naturalHeight)
            }}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* bottom scrim */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)', pointerEvents: 'none' }} />

          {/* D2 pill-progress dots (photo carousel position) */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 31, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
            {photos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  width: i === 0 ? 14 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>

          {/* frosted stack-count chip (2+ photos) — static blur */}
          {photos.length >= 2 && (
            <div
              role="img"
              aria-label={`${photos.length} photos`}
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
                background: 'rgba(12,19,34,0.55)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset',
              }}
            >
              <StackCountGlyph />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: 12, color: 'rgb(231,238,250)' }}>
                {photos.length}
              </span>
            </div>
          )}
        </div>
      ))}

      {!showNotes && !empty && !isDeveloped && <WhisperLozenge visible={showWhisper} />}

      {!showNotes && (isDeveloped ? (
        <DevelopDock
          onTryAgain={() => { setPhase('capture'); setDeveloped(null); setDevelopError(false) }}
          onSave={() => { /* save morph + persistence — chunk 5 */ }}
        />
      ) : (
        <>
          {/* "Structure it ✨" — OPT-IN, ledger-only (authored in NO frame). Minimal lit-navy pill in
              the dock's surface language; the obvious next action after a take. FLAG for River (gate A).
              While parsing: a calm "Structuring…" in the same text styles (no spinner theater). */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 124, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
            {developError && phase === 'capture' && (
              <span role="alert" style={{ fontFamily: INTER, fontWeight: 400, fontSize: 12, color: 'rgb(159,176,200)' }}>Couldn&rsquo;t structure — try again</span>
            )}
            {phase === 'developing' ? (
              <span role="status" style={{ fontFamily: INTER, fontWeight: 500, fontSize: 13, color: 'rgb(159,176,200)' }}>Structuring…</span>
            ) : showStructure ? (
              <button
                type="button"
                onClick={structure}
                aria-label="Structure it — turn your note into a card"
                className="transition-transform active:scale-[0.97]"
                style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0px 20px', border: '1px solid rgb(42,52,80)', borderRadius: 22, background: 'rgb(20,28,50)', boxShadow: 'rgba(255,255,255,0.06) 0px 1px 0px inset, rgba(0,0,0,0.4) 0px 10px 24px', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 14, color: 'rgb(255,255,255)' }}
              >
                <span aria-hidden="true">✨</span>
                <span>Structure it</span>
              </button>
            ) : null}
          </div>

          <IdleDock
            note={note}
            onNoteChange={onNoteChange}
            typing={typing}
            onOpenTyping={() => { if (!locked) setTyping(true) }}
            onCloseTyping={() => setTyping(false)}
            devFakeRecording={devFakeRecording}
            locked={locked}
          />

          <PhotoActionMenu
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            onAddMedia={pickMedia}
            onReorder={() => { /* PhotoSheet reorder — chunk 7 */ }}
            onParsingSettings={() => { /* parsing settings — later */ }}
            origin="center bottom"
            style={{ left: 55, bottom: 160 }}
          />
        </>
      ))}

      {confirmDiscard && (
        <DiscardConfirm
          onDiscard={() => { abortDevelop(); setConfirmDiscard(false); onBack() }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </div>
  )
}
