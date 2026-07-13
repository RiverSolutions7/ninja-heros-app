// @design-locked — built from design-export/capture/frames/8d-develop-reveal.html (tpl235 card).
// Every color/size/radius/opacity/spacing here is copied from that frame. The card is an absolutely
// positioned, geometry-animatable layer at the frame's exact geometry {left:8, top:92, w:374, h:374,
// r:20, z:30} — chunk 5's save morph animates left/top/width/height/borderRadius from that start box,
// so the root MUST stay a plain positioned div (no transforms baked in).
//
// Two reveal surfaces the develop rig (design-export/capture/motion-dc.js dvStage/dvReveal) drives via
// refs: (1) the DEEP scrim (tpl239, plain rgba linear-gradient — NEVER a backdrop-filter, so it is
// safe to animate opacity over the photo; asserted in the header note of Capture) starts at opacity 0
// and deepens to 1; (2) the content elements (eyebrow → title → step1 → step2 → "Review & edit ›" →
// chips) resolve dim→crisp with a small upward settle. They render at opacity:0 initially so there is
// no flash before the rig runs.
//
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import type { RefObject } from 'react'

export interface DevelopResult {
  title: string
  setup_steps: string[]
  /** CHUNK 12 ④: null = the coach DELETED the cues (callout gone; saves as no cues). '' = the develop
   *  parse found none (the notes doc still offers the add placeholder). */
  cues: string | null
  skills: string[]
  equipment: string[]
  duration_minutes: number | null
}

// NOTE: element type params are non-null (RefObject<HTMLDivElement>, not <… | null>) so the refs
// assign cleanly to a DOM `ref` under @types/react 18 (which compares the ref arg covariantly).
// useRef<HTMLDivElement | null>(null) in the parent still satisfies these.
export interface DevelopCascadeRefs {
  scrim: RefObject<HTMLDivElement>
  label: RefObject<HTMLDivElement>
  title: RefObject<HTMLDivElement>
  step1: RefObject<HTMLDivElement>
  step2: RefObject<HTMLDivElement>
  /** CHUNK N1: the "Review & edit ›" + "✦ Critique" row (was the bare Review button). The cascade
   *  reveals the whole row as one beat, so both affordances resolve together. */
  more: RefObject<HTMLDivElement>
  chips: RefObject<HTMLDivElement>
}

export interface DevelopedCardProps {
  photoUrl: string
  /** Type + ages line (uppercased in the eyebrow). NEVER duration. Wired to the type/age sheet ch.6. */
  eyebrow: string
  data: DevelopResult
  refs: DevelopCascadeRefs
  /** "Review & edit ›" — opens the notes doc (chunk 4). No-op stub until then. */
  onExpand: () => void
  /** CHUNK N1: "✦ Critique" — opens the notes doc WITH the mini-dock focused (the AI critique door).
   *  Undefined = the chip is hidden (e.g. a card with no revisable content). */
  onCritique?: () => void
  /** CHUNK 16 ① (N4): tap any skill pill → open the SkillsSheet. Undefined = pills stay static (e.g.
   *  mid-cascade / saving — a morphing card's chips are not controls). Pill visuals are unchanged; the
   *  tappable version wraps each pill in a ≥44px-tall transparent hit target (pointerEvents re-enabled,
   *  the overlay above is pointerEvents:none). */
  onEditSkills?: () => void
  /** CHUNK 11.5 (River ✎ note, 2026-07-11): tap the photo area → open the full-screen PhotoViewer at
   *  the cover. Undefined = tap-to-view disabled (no photo, OR the parent is mid-cascade / saving — the
   *  photo is not a control then). When set, a transparent hit layer covers the card BELOW the text/CTA
   *  overlay, so "Review & edit ›" and the skill chips still get their taps first. */
  onViewPhoto?: () => void
  /** CHUNK 12 ⑤ (save-morph regression): the 11.5 photo blend must NOT ride the morphing card — a
   *  masked img inside an overflow-hidden card whose geometry is being animated is an iOS re-raster
   *  hazard (photo drops out → a navy card morphing over the navy celebrate backdrop = the grow morph
   *  reads as gone), and even where it paints, the landed 96×64 thumb keeps a navy-dissolved bottom
   *  instead of the chunk-5 clean photo thumb. Capture passes false while saving; default true keeps
   *  River's at-rest blend exactly as chunk 11.5 shipped it. */
  blend?: boolean
  /** Root ref for chunk 5's geometry morph (card → library thumb). */
  cardRef?: RefObject<HTMLDivElement>
  /** Content-overlay ref (chunk 5): the save morph fades the text/scrim out as the card shrinks to a
   *  clean photo thumb. Not a design value — a wiring handle. */
  overlayRef?: RefObject<HTMLDivElement>
  /** Root z-index. Default 30 (the frame). Chunk 5's morph elevates it to 60 so the shrinking card
   *  rides above the celebrate backdrop as it lands in the thumb slot. */
  zIndex?: number
  /** Card top (px). Default 92 (single flow, frame 8d). The multi-station stepper (13c) drops it to
   *  112 to clear the stepper line at top:88 — the morph is skipped in run mode so this is safe. */
  top?: number
}

const INTER = 'var(--font-inter), sans-serif'
const ACCENT = 'rgb(255,90,31)'

// One developed step row (number + text). settleRef is the cascade handle for this row.
function StepRow({ n, text, settleRef }: { n: number; text: string; settleRef: RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={settleRef}
      style={{ display: 'flex', gap: 9, fontFamily: INTER, fontWeight: 400, fontSize: 13.5, color: 'rgb(231,238,250)', opacity: 0 }}
    >
      <span style={{ fontWeight: 700, color: ACCENT }}>{n}</span>
      <span>{text}</span>
    </div>
  )
}

export default function DevelopedCard({ photoUrl, eyebrow, data, refs, onExpand, onCritique, onEditSkills, onViewPhoto, blend = true, cardRef, overlayRef, zIndex = 30, top = 92 }: DevelopedCardProps) {
  const steps = data.setup_steps.slice(0, 2)
  const skills = data.skills.slice(0, 3)

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        top,
        left: 8,
        width: 374,
        height: 374,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'rgba(0,0,0,0.55) 0px 24px 60px',
        // base fill behind the photo — also covers the voice-only (no-photo) develop edge case.
        background: 'rgb(20,28,50)',
        zIndex,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Obstacle course station"
          style={{
            display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
            // CHUNK 11.5 — THE BLEND (River ✎ note, 2026-07-11: "should look like a nice blend on the
            // component view card"). UNAUTHORED, all values FLAGGED for River's eyeball: a bottom-fading
            // mask so the cover photo DISSOLVES into the card's own base fill (rgb(20,28,50), the authored
            // no-photo edge fill) instead of reading as a hard cover-crop rectangle under the scrim. The
            // authored deep-scrim (tpl239) then darkens that navy zone exactly as before — no new hues, no
            // blur (freeze-rule safe). Cover geometry is KEPT (not object-fit:contain): the 374×374 box is
            // authored and chunk 5's save morph animates it whole — a letterboxed contain would fight both.
            // Tradeoff (flagged): the photo is still cover-cropped, so tap-to-view (contain, all angles) is
            // how the WHOLE photo is seen. Fade window 60%→100% of the card height.
            // CHUNK 12 ⑤: the mask is DROPPED while the card is the save-morph star (blend=false) — see
            // the `blend` prop note. React removes it in the same commit the morph's layout effect starts,
            // so the shrinking card is the clean, unmasked cover for every morph frame + the landing.
            ...(blend
              ? {
                  maskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0) 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 60%, rgba(0,0,0,0) 100%)',
                }
              : null),
          }}
        />
      )}

      {/* CHUNK 11.5 — tap-to-view hit layer. Covers the whole card but sits BELOW the overlay (which is
          pointerEvents:none). Only the "Review & edit ›" button re-enables pointerEvents:auto, and it is
          painted after this layer → it wins its own hit area. The skill chips are decorative (no onClick,
          inherit pointerEvents:none), as are the title/steps — taps on any of those fall through to here
          and open the viewer, which is fine. Rendered only when tap-to-view is enabled (photo present, not
          mid-cascade, not saving) — a transparent layer, no visual delta. */}
      {photoUrl && onViewPhoto && (
        <button
          type="button"
          onClick={onViewPhoto}
          aria-label="View the full course photo"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            border: 'none', background: 'transparent', padding: 0, margin: 0,
            cursor: 'zoom-in', WebkitTapHighlightColor: 'transparent',
          }}
        />
      )}

      <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* static base scrim (tpl238) — always on */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)' }} />
        {/* DEEP scrim (tpl239) — plain rgba gradient, NO backdrop-filter. Rig-managed opacity 0→1. */}
        <div
          ref={refs.scrim}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.55) 42%, rgba(8,12,26,0.88) 100%)', opacity: 0 }}
        />

        {/* content stack (tpl240) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: '0px 18px 16px' }}>
          <div
            ref={refs.label}
            style={{ fontFamily: INTER, fontWeight: 700, fontSize: 10, letterSpacing: '2.2px', textTransform: 'uppercase', color: ACCENT, opacity: 0 }}
          >
            {eyebrow}
          </div>
          <div ref={refs.title} style={{ fontFamily: INTER, fontWeight: 800, fontSize: 24, letterSpacing: '-0.6px', color: 'rgb(255,255,255)', opacity: 0 }}>
            {data.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps[0] !== undefined && <StepRow n={1} text={steps[0]} settleRef={refs.step1} />}
            {steps[1] !== undefined && <StepRow n={2} text={steps[1]} settleRef={refs.step2} />}
          </div>
          {/* "Review & edit ›" + "✦ Critique" row (chunk N1). The row is the cascade beat (refs.more);
              both buttons re-enable pointerEvents (the overlay above is pointerEvents:none). */}
          {/* gap 14 with 6px horizontal hit-slop each: the two invisible tap-boxes clear by ~2px (no
              overlap → no mis-tap; polish blocker 4). Vertical slop (16px) still gives ≥44px height. */}
          <div ref={refs.more} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 14, opacity: 0 }}>
            <button
              type="button"
              onClick={onExpand}
              aria-label="Review and edit the full card"
              style={{
                border: 'none',
                background: 'transparent',
                // Invisible hit-slop → ≥44px tap target: the negative margin cancels the padding so
                // the visible 12px text keeps the frame's stack rhythm. Not a design value.
                padding: '16px 6px',
                margin: '-16px -6px',
                cursor: 'pointer',
                pointerEvents: 'auto',
                fontFamily: INTER,
                fontWeight: 400,
                fontSize: 12,
                color: 'rgb(159,176,200)',
                whiteSpace: 'nowrap',
              }}
            >
              Review &amp; edit ›
            </button>
            {/* "✦ Critique" — the AI door (chunk N1). UNAUTHORED (no frame drew it) — text-chip language,
                ✦ in the accent, "Critique" in the muted CTA ink; hit-slop padded to ≥44px. FLAGGED for
                River (exact treatment: bordered pill vs bare text, mark glyph, placement). */}
            {onCritique && (
              <button
                type="button"
                onClick={onCritique}
                aria-label="Critique this card with AI"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: 'none',
                  background: 'transparent',
                  padding: '16px 6px',
                  margin: '-16px -6px',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  fontFamily: INTER,
                  fontWeight: 600,
                  fontSize: 12,
                  color: 'rgb(159,176,200)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span aria-hidden="true" style={{ color: ACCENT, fontSize: 12, lineHeight: 1 }}>✦</span>
                Critique
              </button>
            )}
          </div>
          {skills.length > 0 && (
            <div ref={refs.chips} style={{ display: 'flex', gap: 6, marginTop: 3, opacity: 0 }}>
              {skills.map((s) => {
                const pill = (
                  <span
                    style={{ fontFamily: INTER, fontWeight: 600, fontSize: 10, color: 'rgb(159,176,200)', padding: '4px 8px', border: '1px solid rgb(42,52,80)', borderRadius: 9 }}
                  >
                    {s}
                  </span>
                )
                // CHUNK 16 ① — tappable pill: the exact visual span wrapped in a transparent ≥44px-tall
                // hit target (vertical hit-slop only — no horizontal expansion so adjacent chips can't
                // steal each other's taps). pointerEvents re-enabled (the overlay above is none).
                return onEditSkills ? (
                  <button
                    key={s}
                    type="button"
                    onClick={onEditSkills}
                    aria-label={`${s}. Edit skills`}
                    style={{ display: 'inline-flex', alignItems: 'center', border: 'none', background: 'transparent', padding: '12px 0', margin: '-12px 0', cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    {pill}
                  </button>
                ) : (
                  <span key={s}>{pill}</span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
