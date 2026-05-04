// ============================================================
// Component Detail Sheet — unified editorial detail view
// ------------------------------------------------------------
// Used from:
//   • Library list — reference-only; no add-to-plan action here.
//     The planner's own ComponentPickerModal is the entry point
//     for building a plan.
//   • ComponentPickerModal (passes onAdd + isInPlan explicitly)
//     so the "Add to plan" / "Added ✓" footer appears in picker
//     context only.
//
// Design principles:
//   • One voice per screen — hero image + title own the frame.
//   • Typography IS the UI — no chip-and-box-per-field chrome.
//   • One hot color — fire red, used sparingly (meta line + CTA).
//   • Editorial spacing — negative space is content.
//   • Identity stats ("Taught N times", "Last used X") drive the
//     reward loop; coach sees their own history every open.
// ============================================================

'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { ComponentRow } from '@/app/lib/database.types'
import { fetchComponentUsage, type ComponentUsage } from '@/app/lib/queries'
import { supabase } from '@/app/lib/supabase'

interface ComponentDetailSheetProps {
  component: ComponentRow
  onClose: () => void
  /** If provided, called instead of the default library-add behavior. */
  onAdd?: () => void
  /** Overrides in-plan detection when provided (picker passes this explicitly). */
  isInPlan?: boolean
  /**
   * Presentation mode.
   *   'default'   — browsing / planning context (Add-to-plan CTA).
   *   'afterSave' — just-logged celebratory context. Footer swaps to
   *                 Back-to-Library + Log-another. When paired with
   *                 libraryRank, a celebration header is shown above
   *                 the hero.
   */
  mode?: 'default' | 'afterSave'
  /** Called when the coach taps "Log another" in afterSave mode. */
  onLogAnother?: () => void
  /**
   * Total components in the coach's library (incl. the one just logged).
   * When provided in afterSave mode, rendered as the big fire-red number
   * in the celebration header above the hero — the visual signal that
   * the library is growing.
   */
  libraryRank?: number
}

// ── Formatters ───────────────────────────────────────────────────────────────
function formatDaysSince(d: number | null): string {
  if (d === null) return 'Never'
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return '1 week ago'
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  if (d < 60) return '1 month ago'
  return `${Math.floor(d / 30)} months ago`
}

function formatDateAdded(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  if (d.getFullYear() === new Date().getFullYear()) {
    return `${month} ${day}`
  }
  return `${month} ${day} '${String(d.getFullYear()).slice(2)}`
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ComponentDetailSheet({
  component,
  onClose,
  onAdd,
  isInPlan: isInPlanProp,
  mode = 'default',
  onLogAnother,
  libraryRank,
}: ComponentDetailSheetProps) {
  const router = useRouter()
  const photos = (component.photos ?? []).filter(Boolean)
  const skills = component.skills ?? []

  // Photo swipe state
  const [photoIndex, setPhotoIndex] = useState(0)
  const touchStartX = useRef(0)

  // Usage stats — fetched on mount, used for the reward-loop identity row
  const [usage, setUsage] = useState<ComponentUsage | null>(null)

  // CTA state — used only in picker context (when onAdd is provided)
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle')

  // Share confirmation — transient "Link copied" flash on the share button
  const [shareCopied, setShareCopied] = useState(false)

  // Overflow menu + delete flow
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting'>('idle')

  // Photo lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Video hero play state
  const [videoPlaying, setVideoPlaying] = useState(false)

  // In picker context, isInPlan comes from the prop. Library context has no
  // in-plan detection (the library is reference-only, not an add surface).
  const isInPlan = isInPlanProp ?? false

  useEffect(() => {
    let cancelled = false
    fetchComponentUsage(component.id)
      .then((u) => { if (!cancelled) setUsage(u) })
      .catch(() => { if (!cancelled) setUsage({ timesUsed: 0, lastUsed: null, daysSince: null }) })
    return () => { cancelled = true }
  }, [component.id])

  useEffect(() => {
    if (!overflowOpen) setDeleteState('idle')
  }, [overflowOpen])

  function handleSwipe(e: React.TouchEvent) {
    if (photos.length < 2) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) setPhotoIndex((i) => (i + 1) % photos.length)
    else if (diff < -50) setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
  }

  function handleEdit() {
    router.push(`/library/log-component/${component.id}`)
    onClose()
  }

  async function handleDelete() {
    setDeleteState('deleting')
    await supabase.from('components').delete().eq('id', component.id)
    onClose()
    router.refresh()
  }

  /**
   * Share: build the public URL, prefer native share sheet on mobile
   * (so the coach can pick Messages / Mail / etc.), fall back to
   * clipboard copy on desktop or when share is declined.
   */
  async function handleShare() {
    const url = `${window.location.origin}/component/${component.id}`
    const shareData: ShareData = {
      title: component.title,
      text: `${component.title} — Ninja H.E.R.O.S.`,
      url,
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        return
      } catch {
        /* user dismissed or API threw — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2200)
    } catch {
      /* silent fail — clipboard denied */
    }
  }

  function handleAdd() {
    if (!onAdd || isInPlan || addState !== 'idle') return
    // Picker flow only — caller closes the sheet itself.
    setAddState('adding')
    onAdd()
    setAddState('added')
  }

  const metaLine = [
    component.type === 'station' ? 'Station' : 'Game',
    component.curriculum,
  ]
    .filter(Boolean)
    .join('  ·  ')
    .toUpperCase()

  const durationValue = component.duration_minutes
    ? `${component.duration_minutes}`
    : '—'
  const durationLabel = component.duration_minutes ? 'Minutes' : 'Duration'

  const showCelebration = mode === 'afterSave' && typeof libraryRank === 'number'

  const sheet = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
      className="bg-bg-primary overflow-y-auto animate-slide-in-right"
      onClick={() => setOverflowOpen(false)}
    >
      {/* ── Celebration header (afterSave only) ──────────────────────────── */}
      {/* Editorial Strava-style stat block. Big fire-red number, thin uppercase
          labels above/below. Signals "your library is growing" without confetti
          or toast chrome — typography carries the pride. */}
      {showCelebration && (
        <div className="px-6 pt-10 pb-7 text-center">
          <p
            className="font-heading text-accent-fire leading-none"
            style={{ fontSize: 'clamp(56px, 14vw, 88px)' }}
          >
            {libraryRank}
          </p>
          <p className="text-text-muted text-[11px] font-heading tracking-[0.2em] uppercase mt-3">
            {libraryRank === 1 ? 'Component in your Library' : 'Components in your Library'}
          </p>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: '52vh' }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={handleSwipe}
      >
        {component.video_url ? (
          videoPlaying ? (
            <video
              src={component.video_url}
              autoPlay
              playsInline
              controls
              className="absolute inset-0 w-full h-full object-cover bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // Paused: gradient thumbnail + frosted-glass play button
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setVideoPlaying(true)}
            >
              {/* Thumbnail background — same composed gradient as no-photo fallback */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1540] via-[#0a0f24] to-[#2a1020]">
                <div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(circle at 72% 18%, rgba(232,64,64,0.38), transparent 58%)' }}
                />
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)' }}
                />
              </div>
              {/* Dark scrim */}
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                    <path d="M3 2l16 10L3 22V2z" fill="#fff" />
                  </svg>
                </div>
              </div>
              {/* VIDEO chip */}
              <div
                className="absolute left-0 right-0 flex justify-center"
                style={{ bottom: 92 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    background: 'rgba(6,10,28,0.62)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="square">
                    <rect x="2" y="2" width="20" height="20" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5" />
                  </svg>
                  <span
                    className="font-heading"
                    style={{ fontSize: 9, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}
                  >
                    Video
                  </span>
                </div>
              </div>
            </div>
          )
        ) : photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photoIndex]}
            alt={`${component.title} photo ${photoIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
            draggable={false}
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
          />
        ) : (
          // No-photo fallback — composed gradient, never a flat empty box
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1540] via-[#0a0f24] to-[#2a1020]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 72% 18%, rgba(232,64,64,0.38), transparent 58%)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
              }}
            />
          </div>
        )}

        {/* Legibility gradient: dark at bottom for title, clear at top */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />

        {/* Back button — floating, glass */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white/95 hover:bg-black/60 active:scale-95 transition-all"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            minHeight: '40px',
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Three-dot overflow menu */}
        <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setOverflowOpen((o) => !o)}
            aria-label="More options"
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white/95 hover:bg-black/60 active:scale-95 transition-all"
            style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', minHeight: '40px' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>

          {overflowOpen && (
            <div
              className="absolute right-0 top-12 w-44 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(20,28,50,0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {deleteState === 'confirm' || deleteState === 'deleting' ? (
                <div className="px-4 py-4 flex flex-col gap-3">
                  <p className="text-white text-[13px] font-heading leading-snug">
                    Delete &ldquo;{component.title}&rdquo;? This can&rsquo;t be undone.
                  </p>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteState === 'deleting'}
                    className="w-full py-2.5 rounded-xl bg-accent-fire text-white font-heading text-[13px] tracking-wide active:opacity-80 disabled:opacity-60"
                  >
                    {deleteState === 'deleting' ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteState('idle')}
                    className="w-full py-2 text-text-muted font-heading text-[12px] tracking-wide"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-white/90 hover:bg-white/[0.06] active:bg-white/[0.10] transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-heading text-[13px] tracking-wide">Edit</span>
                  </button>
                  <div className="border-t border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => setDeleteState('confirm')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-accent-fire hover:bg-accent-fire/[0.08] active:bg-accent-fire/[0.14] transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="font-heading text-[13px] tracking-wide">Delete</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dot indicators — only if multiple photos */}
        {photos.length > 1 && (
          <div
            className="absolute left-0 right-0 flex justify-center gap-1.5 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
          >
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-[5px] rounded-full transition-all duration-200 ${
                  i === photoIndex ? 'w-5 bg-white' : 'w-[5px] bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Title + meta — below hero ─────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-accent-fire text-[10px] font-heading tracking-[0.22em] mb-2">
          {metaLine}
        </p>
        <h1
          className="font-heading text-white leading-[1.02]"
          style={{ fontSize: 'clamp(28px, 7.5vw, 40px)' }}
        >
          {component.title}
        </h1>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      {/* pb-32 only when the sticky footer is present (afterSave or picker);
          pb-28 in library-browse context to clear the Share FAB. */}
      <div className={`px-6 pt-2 ${mode === 'afterSave' || onAdd !== undefined ? 'pb-32' : 'pb-28'}`}>
        {/* Stat row — shown only in picker / afterSave context, not library browse */}
        {(mode === 'afterSave' || onAdd !== undefined) && (
          <div className="grid grid-cols-3 gap-3 pb-7 border-b border-white/[0.06]">
            <Stat value={durationValue} label={durationLabel} />
            <Stat
              value={formatDateAdded(component.created_at)}
              label="Added"
            />
            <Stat
              value={usage ? formatDaysSince(usage.daysSince) : '—'}
              label="Last used"
            />
          </div>
        )}

        {/* Skills — fire-red chip pills, no header label */}
        {skills.length > 0 && (
          <div className="pt-7 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full border border-accent-fire/60 text-accent-fire text-[12px] font-heading tracking-wide"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Description — numbered steps, no header label */}
        {component.description && (
          <div className="pt-7">
            {(() => {
              const steps = component.description!.split('\n').map(s => s.trim().replace(/^[•\-*]\s*/, '')).filter(Boolean)
              return (
                <div className="flex flex-col">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-7 h-7 rounded-full border border-accent-fire flex items-center justify-center">
                          <span className="font-heading text-accent-fire text-[12px]">{i + 1}</span>
                        </div>
                        {i < steps.length - 1 && (
                          <div
                            className="flex-1 border-l border-dashed border-accent-fire/30 my-1"
                            style={{ minHeight: '20px' }}
                          />
                        )}
                      </div>
                      <p className="text-text-primary text-[15px] leading-relaxed pb-4 flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* Equipment — prose */}
        {component.equipment && (
          <Section label="Setup">
            <p className="text-text-primary text-[15px] leading-relaxed">
              {component.equipment}
            </p>
          </Section>
        )}

        {/* External video link — unobtrusive, not a chip */}
        {component.video_link && (
          <Section label="Reference">
            <a
              href={component.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent-fire text-[15px] hover:underline underline-offset-4"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Watch reference
            </a>
          </Section>
        )}
      </div>

      {/* ── Share FAB — library browse context only ──────────────────────── */}
      {mode === 'default' && onAdd === undefined && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleShare() }}
          aria-label={shareCopied ? 'Link copied' : 'Share component'}
          className={[
            'fixed bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-glow-fire transition-all active:scale-95',
            shareCopied ? 'bg-accent-green' : 'bg-accent-fire',
          ].join(' ')}
          style={{ zIndex: 10010 }}
        >
          {shareCopied ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          )}
        </button>
      )}

      {/* ── Sticky CTA footer ────────────────────────────────────────────── */}
      {/* Shown only in picker context (onAdd provided) or after a save.
          The library browse context is reference-only — no add-to-plan here. */}
      {(mode === 'afterSave' || onAdd !== undefined) && (
        <div
          className="fixed inset-x-0 bottom-0 px-6 pt-5 bg-bg-primary"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 bottom-full h-10 bg-gradient-to-t from-bg-primary to-transparent"
          />
          <div className="max-w-2xl mx-auto">
            {mode === 'afterSave' ? (
              // Just-logged celebratory context — primary is Back to Library
              // (the coach's most common next move), with a quiet link to keep
              // logging if they're in flow.
              <div className="flex flex-col items-center gap-3.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full font-heading text-[15px] tracking-wide py-4 rounded-2xl bg-accent-fire text-white active:scale-[0.98] transition-all"
                  style={{ minHeight: '52px' }}
                >
                  Back to Library
                </button>
                {onLogAnother && (
                  <button
                    type="button"
                    onClick={onLogAnother}
                    className="text-[13px] font-heading text-text-muted tracking-wide hover:text-text-primary active:opacity-70"
                    style={{ minHeight: '32px' }}
                  >
                    + Log another component
                  </button>
                )}
              </div>
            ) : addState === 'added' ? (
              // Picker: just added — green confirmation bar.
              <div className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl bg-accent-green/10 border border-accent-green/30">
                <svg
                  className="w-5 h-5 text-accent-green flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="flex-1 font-heading text-[14px] text-accent-green tracking-wide">
                  Added to plan
                </span>
              </div>
            ) : isInPlan ? (
              // Picker: component was already in the plan when this sheet opened.
              <div className="w-full flex items-center gap-3 py-3.5 px-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <svg
                  className="w-5 h-5 text-accent-green/80 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="flex-1 font-heading text-[14px] text-text-muted tracking-wide">
                  Already in plan
                </span>
              </div>
            ) : (
              // Picker: idle — primary Add to plan button.
              <button
                type="button"
                onClick={handleAdd}
                disabled={addState !== 'idle'}
                className={[
                  'w-full font-heading text-[15px] tracking-wide py-4 rounded-2xl transition-all',
                  'bg-accent-fire text-white shadow-glow-fire',
                  addState === 'idle' ? 'active:scale-[0.98]' : 'opacity-80',
                ].join(' ')}
                style={{ minHeight: '52px' }}
              >
                {addState === 'adding' ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    Adding…
                  </span>
                ) : (
                  <>Add to plan</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ── Photo lightbox ────────────────────────────────────────────────────────
  const lightbox = lightboxOpen && photos.length > 0 ? (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 10050 }}
      onClick={() => setLightboxOpen(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={handleSwipe}
    >
      {/* X close */}
      <button
        type="button"
        onClick={() => setLightboxOpen(false)}
        aria-label="Close photo"
        className="absolute top-4 left-4 w-11 h-11 flex items-center justify-center text-white active:opacity-60 transition-opacity"
        style={{ zIndex: 10051 }}
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Photo — object-contain so full image is always visible */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[photoIndex]}
        alt={`${component.title} photo ${photoIndex + 1}`}
        className="w-full h-full object-contain"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Counter — only when multiple photos */}
      {photos.length > 1 && (
        <p
          className="absolute font-heading text-white/80 text-sm tracking-widest"
          style={{ bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
        >
          {photoIndex + 1} / {photos.length}
        </p>
      )}
    </div>
  ) : null

  if (typeof window === 'undefined') return null
  return (
    <>
      {createPortal(sheet, document.body)}
      {lightbox && createPortal(lightbox, document.body)}
    </>
  )
}

// ── Stat primitive — no borders, no box; type does the work ──────────────────
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        className="font-heading text-text-primary leading-none"
        style={{ fontSize: 'clamp(18px, 5vw, 22px)' }}
      >
        {value}
      </p>
      <p className="text-text-dim text-[10px] font-heading tracking-[0.2em] uppercase mt-2">
        {label}
      </p>
    </div>
  )
}

// ── Section primitive — muted label, no header chrome, generous rhythm ───────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-7">
      <p className="text-text-dim text-[10px] font-heading tracking-[0.22em] uppercase mb-3">
        {label}
      </p>
      {children}
    </div>
  )
}
