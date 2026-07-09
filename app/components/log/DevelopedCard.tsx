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
  cues: string
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
  more: RefObject<HTMLButtonElement>
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
  /** Root ref for chunk 5's geometry morph (card → library thumb). */
  cardRef?: RefObject<HTMLDivElement>
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

export default function DevelopedCard({ photoUrl, eyebrow, data, refs, onExpand, cardRef }: DevelopedCardProps) {
  const steps = data.setup_steps.slice(0, 2)
  const skills = data.skills.slice(0, 3)

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        top: 92,
        left: 8,
        width: 374,
        height: 374,
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'rgba(0,0,0,0.55) 0px 24px 60px',
        // base fill behind the photo — also covers the voice-only (no-photo) develop edge case.
        background: 'rgb(20,28,50)',
        zIndex: 30,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Obstacle course station"
          style={{ display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
          {/* "Review & edit ›" — real button (opens notes doc, chunk 4). pointerEvents restored on it
              only (the overlay above is pointerEvents:none). */}
          <button
            ref={refs.more}
            type="button"
            onClick={onExpand}
            aria-label="Review and edit the full card"
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'transparent',
              // Invisible hit-slop → ≥44px tap target: the negative margin cancels the padding so
              // the visible 12px text keeps the frame's stack rhythm. Not a design value.
              padding: '16px 10px',
              margin: '-16px -10px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              fontFamily: INTER,
              fontWeight: 400,
              fontSize: 12,
              color: 'rgb(159,176,200)',
              opacity: 0,
            }}
          >
            Review &amp; edit ›
          </button>
          {skills.length > 0 && (
            <div ref={refs.chips} style={{ display: 'flex', gap: 6, marginTop: 3, opacity: 0 }}>
              {skills.map((s) => (
                <span
                  key={s}
                  style={{ fontFamily: INTER, fontWeight: 600, fontSize: 10, color: 'rgb(159,176,200)', padding: '4px 8px', border: '1px solid rgb(42,52,80)', borderRadius: 9 }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
