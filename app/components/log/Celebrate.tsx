// @design-locked — built from design-export/capture/frames/8f-saved-celebration.html (the settled
// look) reconciled with the HIDDEN celebrate overlay authored inside 8d-develop-reveal.html (tpl221:
// the morph's DOM anatomy — msCelebBg / msCeleb / msCelebInner / msCheck / msThumbSlot). Every
// color/size/radius/opacity/spacing here is copied from those frames.
//
// The save morph (motion-dc.js onSaveTap, ported in Capture) grows the DevelopedCard into `thumbSlot`
// while these layers fade/settle in. So this component is BOTH the morph target (staged, opacity 0,
// empty slot — Capture animates it in via `refs`) AND the standalone settled screen (staged=false:
// everything visible, the slot shows the cover — the ?dev=celebrate door + the no-card arrival paths).
//
// FREEZE: nothing here animates over a backdrop-filter — there is none. The only motion is opacity +
// transform on plain layers, driven from Capture. Title tap-to-rename mirrors NotesDoc's inline-edit
// look (hairline underline, blue caret). polish-audit: flag a11y / tap-targets / state — not values.
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

const INTER = 'var(--font-inter), sans-serif'

export interface CelebrateRefs {
  /** msCelebBg — the opaque cover + top wash. Staged: fades 0→1 (the morph's backdrop). */
  bg: RefObject<HTMLDivElement>
  /** msCeleb — the whole content wrapper (check + text + thumb + buttons). Fades 0→1. */
  celeb: RefObject<HTMLDivElement>
  /** msCelebInner — the centered column. translateY 14→0. */
  inner: RefObject<HTMLDivElement>
  /** msCheck — the check disc. scale 0.5→1.08→1. */
  check: RefObject<HTMLDivElement>
  /** msThumbSlot — the 96×64 landing slot the card grows into. */
  thumbSlot: RefObject<HTMLDivElement>
}

export interface CelebrateProps {
  eyebrow: string
  title: string
  photoUrl: string
  /** Staged for the morph: bg/celeb start at opacity 0 (Capture animates them in). When false the
   *  screen is statically visible (settled 8f look) — the ?dev=celebrate door. */
  staged?: boolean
  /** Morph target shows an EMPTY slot (the card lands there). Settled/no-card paths show the cover. */
  showThumbPhoto?: boolean
  refs?: CelebrateRefs
  onShare: () => void
  onContinue: () => void
  onRename: (next: string) => void
}

function CheckGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.6 4.6L19 7.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Celebrate({
  eyebrow,
  title,
  photoUrl,
  staged = false,
  showThumbPhoto = true,
  refs,
  onShare,
  onContinue,
  onRename,
}: CelebrateProps) {
  const [renaming, setRenaming] = useState(false)
  const [announce, setAnnounce] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Politely announce arrival to screen readers (set after mount so the live region fires).
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounce('Saved'), 60)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (renaming && inputRef.current) {
      const el = inputRef.current
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [renaming])

  const commitRename = (raw: string) => {
    const next = raw.trim()
    if (next && next !== title) onRename(next)
    setRenaming(false)
  }

  const hidden = staged ? 0 : 1

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        pointerEvents: staged ? 'none' : 'auto',
      }}
    >
      {/* msCelebBg — opaque dark cover + the frame's subtle top wash (tpl381). Staged: fades in. */}
      <div
        ref={refs?.bg}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%) top / 100% 320px no-repeat, rgb(8,12,26)',
          opacity: hidden,
        }}
      />

      {/* msCeleb — the content wrapper (fades in as a whole). pointerEvents restored so buttons work
          once the morph hands off (Capture flips this layer live by clearing the staged flag). */}
      <div ref={refs?.celeb} style={{ position: 'absolute', inset: 0, opacity: hidden, pointerEvents: staged ? 'none' : 'auto' }}>
        {/* centered column (tpl382) — msCelebInner translateY */}
        <div
          ref={refs?.inner}
          style={{
            position: 'absolute',
            inset: '120px 36px 160px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            textAlign: 'center',
          }}
        >
          {/* check disc (tpl383) — msCheck scale */}
          <div
            ref={refs?.check}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'linear-gradient(rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%), rgb(20,28,50)',
              boxShadow: 'rgb(42,52,80) 0px 0px 0px 1px inset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckGlyph />
          </div>

          {/* headline + subline (tpl386) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 27, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'rgb(255,255,255)' }}>
              Logged. Forever.
            </span>
            <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)' }}>
              {title} is in your library.
            </span>
          </div>

          {/* the landed card (tpl389) — thumb slot + eyebrow + title (tap the title to rename) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 18px 10px 10px', borderRadius: 16, background: 'rgb(20,28,50)', border: '1px solid rgb(42,52,80)' }}>
            <div
              ref={refs?.thumbSlot}
              style={{ width: 96, height: 64, borderRadius: 10, overflow: 'hidden', flex: '0 0 auto', background: 'rgb(12,19,34)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {showThumbPhoto && photoUrl && (
                <img src={photoUrl} alt="Saved station thumbnail" style={{ display: 'block', width: 96, height: 64, borderRadius: 10, objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgb(255,90,31)' }}>
                {eyebrow}
              </span>
              {renaming ? (
                <input
                  ref={inputRef}
                  defaultValue={title}
                  aria-label="Rename this card"
                  onBlur={(e) => commitRename(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                    else if (e.key === 'Escape') { e.preventDefault(); setRenaming(false) }
                  }}
                  style={{
                    minWidth: 80,
                    maxWidth: 200,
                    border: 'none',
                    borderBottom: '1px solid rgb(58,77,119)',
                    paddingBottom: 2,
                    background: 'transparent',
                    outline: 'none',
                    fontFamily: INTER,
                    fontWeight: 700,
                    fontSize: 13.5,
                    letterSpacing: '-0.2px',
                    color: 'rgb(255,255,255)',
                    caretColor: 'rgb(42,107,219)',
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  aria-label={`${title}. Tap to rename`}
                  // Invisible hit-slop → ≥44px tap height on the small title; negative margin keeps the
                  // authored card layout. Not a design value.
                  style={{ textAlign: 'left', border: 'none', background: 'transparent', padding: '12px 8px', margin: '-12px -8px', cursor: 'text', fontFamily: INTER, fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.2px', color: 'rgb(231,238,250)' }}
                >
                  {title}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Share · Continue (tpl394) */}
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 46, display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onShare}
            className="transition-transform active:scale-[0.97]"
            style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, border: 'none', background: 'rgb(20,28,50)', boxShadow: 'rgb(42,52,80) 0px 0px 0px 1px inset', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 14.5, color: 'rgb(231,238,250)' }}
          >
            Share
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="transition-transform active:scale-[0.97]"
            style={{ flex: '1 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, border: 'none', background: 'rgb(255,90,31)', cursor: 'pointer', fontFamily: INTER, fontWeight: 700, fontSize: 14.5, color: 'rgb(255,255,255)' }}
          >
            Continue
          </button>
        </div>
      </div>

      {/* polite arrival announcement */}
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {announce}
      </div>
    </div>
  )
}
