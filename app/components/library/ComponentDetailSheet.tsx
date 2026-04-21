// ============================================================
// Component Detail Sheet — unified editorial detail view
// ------------------------------------------------------------
// Used from:
//   • Library list (no onAdd prop → uses default library behavior:
//     writes the component into the current plan session draft
//     in sessionStorage, then auto-closes with a brief "Added" beat)
//   • ComponentPickerModal (passes onAdd + isInPlan explicitly)
//
// Design principles (see /preview/component/* mock for reference):
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
import type { ComponentRow, PlanItem } from '@/app/lib/database.types'
import { fetchComponentUsage, type ComponentUsage } from '@/app/lib/queries'
import { randomId } from '@/app/lib/uuid'

// Session storage key — must match TodaysPlanClient's SESSION_KEY
const PLAN_SESSION_KEY = 'ninja-plan-session'

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

// ── Default library-add behavior ─────────────────────────────────────────────
// Used when the sheet is opened from the library list (no onAdd prop).
// Writes directly into the same sessionStorage key the Today's Plan editor
// reads from, so the component shows up the next time the coach opens /plan.
function addToPlanSession(component: ComponentRow): void {
  try {
    const raw = sessionStorage.getItem(PLAN_SESSION_KEY)
    const items: PlanItem[] = raw ? JSON.parse(raw) : []
    const alreadyIn = items.some((i) => i.component?.id === component.id)
    if (alreadyIn) return
    const newItem: PlanItem = {
      localId: randomId(),
      component,
      isAdHoc: false,
      durationMinutes: component.duration_minutes,
      coachNote: null,
    }
    sessionStorage.setItem(PLAN_SESSION_KEY, JSON.stringify([...items, newItem]))
  } catch {
    /* ignore — quota or parse error */
  }
}

function detectInPlan(componentId: string): boolean {
  try {
    const raw = sessionStorage.getItem(PLAN_SESSION_KEY)
    if (!raw) return false
    const items: PlanItem[] = JSON.parse(raw)
    return items.some((i) => i.component?.id === componentId)
  } catch {
    return false
  }
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

  // Library-context in-plan detection (only used when prop is not provided)
  const [libraryInPlan, setLibraryInPlan] = useState(false)

  // CTA state — 'idle' | 'adding' | 'added'
  const [addState, setAddState] = useState<'idle' | 'adding' | 'added'>('idle')

  // Share confirmation — transient "Link copied" flash on the share button
  const [shareCopied, setShareCopied] = useState(false)

  const isInPlan = isInPlanProp ?? libraryInPlan

  useEffect(() => {
    let cancelled = false
    fetchComponentUsage(component.id)
      .then((u) => { if (!cancelled) setUsage(u) })
      .catch(() => { if (!cancelled) setUsage({ timesUsed: 0, lastUsed: null, daysSince: null }) })
    return () => { cancelled = true }
  }, [component.id])

  useEffect(() => {
    if (isInPlanProp === undefined) {
      setLibraryInPlan(detectInPlan(component.id))
    }
  }, [component.id, isInPlanProp])

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
    if (isInPlan || addState !== 'idle') return
    setAddState('adding')
    if (onAdd) {
      // Picker flow — caller closes the sheet itself.
      onAdd()
      setAddState('added')
    } else {
      // Library flow — write to the plan session and leave the sheet open
      // with a persistent green confirmation. Auto-closing made the success
      // moment invisible on mobile ("nothing happened" feeling) and dropped
      // the coach back on /library with no signal their plan had items.
      addToPlanSession(component)
      setAddState('added')
      setLibraryInPlan(true)
    }
  }

  function handleViewPlan() {
    onClose()
    router.push('/plan')
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
      className="bg-bg-primary overflow-y-auto"
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
        style={{ aspectRatio: '4 / 5', maxHeight: '78vh' }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
        onTouchEnd={handleSwipe}
      >
        {photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[photoIndex]}
            alt={`${component.title} photo ${photoIndex + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
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
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />

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

        {/* Top-right action cluster: Share + Edit */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Share — copies /component/[id] URL or opens native share sheet */}
          <button
            type="button"
            onClick={handleShare}
            aria-label={shareCopied ? 'Link copied' : 'Share component'}
            className={[
              'w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95',
              shareCopied
                ? 'bg-accent-green/30 text-white'
                : 'bg-black/40 text-white/95 hover:bg-black/60',
            ].join(' ')}
            style={{
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              minHeight: '40px',
            }}
          >
            {shareCopied ? (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            )}
          </button>

          {/* Edit pencil — discreet, mirror of back button */}
          <button
            type="button"
            onClick={handleEdit}
            aria-label="Edit component"
            className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white/95 hover:bg-black/60 active:scale-95 transition-all"
            style={{
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              minHeight: '40px',
            }}
          >
            <svg
              className="w-[18px] h-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
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

        {/* Title block — overlaid bottom-left */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          <p className="text-accent-fire text-[10px] font-heading tracking-[0.22em] mb-3">
            {metaLine}
          </p>
          <h1
            className="font-heading text-white leading-[1.02]"
            style={{ fontSize: 'clamp(30px, 8.5vw, 44px)' }}
          >
            {component.title}
          </h1>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-2 pb-32">
        {/* Stat row — 3-up, no per-stat borders, one thin divider below */}
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

        {/* Skills — single prose line, dot-separated */}
        {skills.length > 0 && (
          <Section label="Skills">
            <p className="text-text-primary text-[15px] leading-relaxed">
              {skills.map((s, i) => (
                <span key={s}>
                  {i > 0 && <span className="text-text-dim/50 mx-2 select-none">·</span>}
                  <span>{s}</span>
                </span>
              ))}
            </p>
          </Section>
        )}

        {/* Description — editorial prose */}
        {component.description && (
          <Section label="How it runs">
            <p className="text-text-primary text-[16px] leading-[1.7] whitespace-pre-wrap">
              {component.description}
            </p>
          </Section>
        )}

        {/* Equipment — prose */}
        {component.equipment && (
          <Section label="Setup">
            <p className="text-text-primary text-[15px] leading-relaxed">
              {component.equipment}
            </p>
          </Section>
        )}

        {/* Uploaded video */}
        {component.video_url && (
          <Section label="Video">
            <video
              src={component.video_url}
              controls
              playsInline
              className="w-full rounded-2xl bg-black"
              style={{ maxHeight: '320px' }}
            />
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

      {/* ── Sticky CTA footer ────────────────────────────────────────────── */}
      {/* Solid tap target (bg-bg-primary) so touches can't slip past on mobile
          Safari, plus a gradient fade above it (absolute, pointer-events-none)
          so the body content dissolves into the footer seamlessly — no hard
          slicer line. */}
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
            // Just added in this session — persistent green confirmation.
            // "View plan →" only shown in library context (picker is already on /plan).
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
              {!onAdd && (
                <button
                  type="button"
                  onClick={handleViewPlan}
                  className="text-[13px] font-heading text-accent-green tracking-wide hover:underline underline-offset-4 active:opacity-70"
                  style={{ minHeight: '32px' }}
                >
                  View plan →
                </button>
              )}
            </div>
          ) : isInPlan ? (
            // Component was already in the plan when this sheet opened.
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
              {!onAdd && (
                <button
                  type="button"
                  onClick={handleViewPlan}
                  className="text-[13px] font-heading text-text-muted tracking-wide hover:text-text-primary hover:underline underline-offset-4 active:opacity-70"
                  style={{ minHeight: '32px' }}
                >
                  View plan →
                </button>
              )}
            </div>
          ) : (
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
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(sheet, document.body) : null
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
