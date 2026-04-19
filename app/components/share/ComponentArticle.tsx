// ============================================================
// Component article — one component rendered as an editorial
// "article" for share pages. Used by both /plan/[id] (one per
// plan item) and /component/[id] (standalone share of a single
// library component). Plain ComponentCard is too compact — a
// stranger can't run a station from just a title and thumbnail.
//
// What it shows:
//   • tappable hero photo (+ lightbox for all photos)
//   • type / curriculum / duration meta
//   • title
//   • "How it runs" prose (the library description)
//   • Setup (equipment), Skills, video
//   • Optional session-specific coach note at the foot
// ============================================================

'use client'

import { useState } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'

const TYPE_META: Record<ComponentType, { label: string; accent: string; border: string }> = {
  station: { label: 'STATION', accent: 'text-accent-blue', border: 'border-l-accent-blue' },
  game: { label: 'GAME', accent: 'text-accent-green', border: 'border-l-accent-green' },
}

interface ComponentArticleProps {
  component: ComponentRow
  /**
   * Override the library's default duration (e.g. the plan-session
   * duration — what this class actually runs). Omit for the
   * standalone /component/[id] share.
   */
  sessionDuration?: number | null
  /** Session-specific coach annotation. Omit on standalone component shares. */
  coachNote?: string | null
}

export default function ComponentArticle({ component, sessionDuration, coachNote }: ComponentArticleProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const c = component
  const meta = TYPE_META[c.type]
  const photos = (c.photos ?? []).filter(Boolean)
  const skills = c.skills ?? []
  const duration = sessionDuration ?? c.duration_minutes

  return (
    <>
      <article
        className={[
          'relative rounded-2xl overflow-hidden bg-bg-card border border-bg-border border-l-4',
          meta.border,
        ].join(' ')}
      >
        {/* ── Hero photo — tappable for lightbox ─────────────────── */}
        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="relative block w-full bg-black active:opacity-90 transition-opacity"
            style={{ aspectRatio: '4 / 3' }}
            aria-label={`View photos of ${c.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0]}
              alt={c.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* More-photos badge — signals tap behavior on multi-photo items */}
            {photos.length > 1 && (
              <span
                className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-black/70 text-white text-[11px] font-heading px-2.5 py-1 rounded-full"
                style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                +{photos.length - 1}
              </span>
            )}
          </button>
        )}

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide mb-2">
            <span className={meta.accent}>{meta.label}</span>
            {c.curriculum && (
              <>
                <span className="text-text-dim/40">·</span>
                <span className="text-text-dim">{c.curriculum}</span>
              </>
            )}
            {duration != null && (
              <>
                <span className="text-text-dim/40">·</span>
                <span className="text-text-dim">{duration} min</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            className="font-heading text-text-primary leading-[1.15]"
            style={{ fontSize: 'clamp(19px, 5vw, 22px)' }}
          >
            {c.title}
          </h3>

          {/* How it runs — library description */}
          {c.description && (
            <div className="mt-5">
              <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-text-dim mb-2">
                How it runs
              </p>
              <p className="text-[15px] text-text-primary/92 leading-[1.65] whitespace-pre-wrap">
                {c.description}
              </p>
            </div>
          )}

          {/* Setup — equipment */}
          {c.equipment && (
            <div className="mt-5">
              <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-text-dim mb-2">
                Setup
              </p>
              <p className="text-[14px] text-text-primary/90 leading-[1.65] whitespace-pre-wrap">
                {c.equipment}
              </p>
            </div>
          )}

          {/* Skills — dot-separated prose */}
          {skills.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-text-dim mb-2">
                Skills
              </p>
              <p className="text-[14px] text-text-primary/90 leading-relaxed">
                {skills.map((s, i) => (
                  <span key={s}>
                    {i > 0 && <span className="text-text-dim/50 mx-2 select-none">·</span>}
                    <span>{s}</span>
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Uploaded video — inline HTML5 player */}
          {c.video_url && (
            <div className="mt-5">
              <video
                src={c.video_url}
                controls
                playsInline
                className="w-full rounded-xl bg-black"
                style={{ maxHeight: '320px' }}
              />
            </div>
          )}

          {/* External video link */}
          {c.video_link && (
            <a
              href={c.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent-fire text-[14px] mt-5 hover:underline underline-offset-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Watch reference
            </a>
          )}

          {/* Coach's session note — italic, offset by a thin divider */}
          {coachNote && (
            <div className="mt-6 pt-5 border-t border-bg-border/60">
              <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-text-dim mb-2">
                Coach&apos;s note
              </p>
              <p className="text-[14px] italic text-text-primary/88 leading-[1.7] whitespace-pre-line">
                {coachNote}
              </p>
            </div>
          )}
        </div>
      </article>

      {/* Photo lightbox — opens on hero tap */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
