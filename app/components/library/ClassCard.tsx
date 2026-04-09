'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { FullClass } from '@/app/lib/database.types'
import ClassCardMenu from './ClassCardMenu'
import RemoveFromHandoffButton from '@/app/components/handoff/RemoveFromHandoffButton'

interface ClassCardProps {
  cls: FullClass
  showActions?: boolean
  showHandoffRemove?: boolean
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCurriculumColor(ageGroup: string): string {
  const g = ageGroup.toLowerCase()
  if (g.includes('mini')) return '#7c3aed'
  if (g.includes('junior')) return '#d97706'
  if (g.includes('teen')) return '#0ea5e9'
  if (g.includes('adult')) return '#059669'
  return '#e84040'
}

export default function ClassCard({ cls, showActions = true, showHandoffRemove = false }: ClassCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)
  const [shareToast, setShareToast] = useState(false)
  const touchStartX = useRef(0)

  function handleShare() {
    const url = `${window.location.origin}/class/${cls.id}`
    const title = cls.title || 'Ninja H.E.R.O.S. Class'
    const text = `${title} — ${cls.age_group} · ${formatShortDate(cls.class_date)}`
    if (navigator.share) {
      navigator.share({ title, text, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      })
    }
  }

  function lbPrev() {
    setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length } : null)
  }
  function lbNext() {
    setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.urls.length } : null)
  }

  const blockPhotoUrls = cls.blocks.flatMap((b) =>
    b.type === 'lane'
      ? b.stations.flatMap((s) =>
          s.photo_urls?.length > 0
            ? s.photo_urls
            : s.photo_url ? [s.photo_url] : []
        )
      : []
  )
  const classLevelPhotos = (cls.photos ?? [])
  const photoUrls = [...classLevelPhotos, ...blockPhotoUrls]
  const laneVideoUrls = cls.blocks
    .filter((b): b is Extract<typeof b, { type: 'lane' }> => b.type === 'lane')
    .map((b) => b.data.video_url)
    .filter(Boolean) as string[]
  const gameVideoUrls = cls.blocks
    .filter((b): b is Extract<typeof b, { type: 'game' }> => b.type === 'game')
    .map((b) => b.data.video_url)
    .filter(Boolean) as string[]

  const thumbnailColor = getCurriculumColor(cls.age_group ?? '')

  return (
    <div className="border-b border-white/[0.06]">
      {/* Row header — tap to expand/collapse */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none active:bg-white/[0.03] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
          {photoUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrls[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: thumbnailColor + '33' }}
            >
              {/* Ninja star icon */}
              <svg
                className="w-6 h-6 opacity-80"
                viewBox="0 0 24 24"
                fill="none"
                stroke={thumbnailColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className={`font-heading text-[15px] leading-snug truncate${cls.title ? ' text-text-primary' : ' text-text-dim'}`}>
            {cls.title || 'Untitled Class'}
          </p>
          <p className="text-xs text-text-dim mt-0.5 truncate">
            {cls.age_group}
            {cls.age_group && ' · '}
            {formatShortDate(cls.class_date)}
          </p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-text-dim/50 flex-shrink-0 transition-transform duration-300 ease-in-out${expanded ? ' rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>

        {/* Action buttons — stop propagation so they don't toggle expand */}
        {(showActions || showHandoffRemove) && (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {showActions && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share class"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-fire/10 text-accent-fire hover:bg-accent-fire/20 transition-colors flex-shrink-0"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            )}
            {showActions && cls.blocks.length > 0 && (
              <Link
                href={`/class/${cls.id}/run`}
                aria-label="Run class"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-accent-fire hover:bg-accent-fire/10 transition-colors flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </Link>
            )}
            {showActions && (
              <ClassCardMenu
                classId={cls.id}
                inHandoff={cls.in_handoff}
                photoUrls={photoUrls}
                laneVideoUrls={laneVideoUrls}
                gameVideoUrls={gameVideoUrls}
              />
            )}
            {showHandoffRemove && (
              <RemoveFromHandoffButton classId={cls.id} />
            )}
          </div>
        )}
      </div>

      {/* Smooth expand/collapse via CSS Grid height trick */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {/* Top border slides in with content */}
          <div className="border-t border-bg-border" />

          {/* Blocks — timeline layout */}
          <div className="divide-y divide-bg-border">
            {(() => {
              let stationCount = 0
              return cls.blocks.map((block) => {
                if (block.type === 'warmup') {
                  return (
                    <div key={block.block.id} className="border-l-4 border-accent-gold">
                      {/* Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-gold/[0.10] to-transparent">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">🔥</span>
                          <span className="text-accent-gold font-heading text-xs uppercase tracking-wider">
                            Warm Up
                          </span>
                          <span className="badge badge-time">{block.data.time}</span>
                        </div>
                      </div>
                      {/* Body */}
                      {(block.data.description || block.data.skill_focus) && (
                        <div className="px-4 pb-3 pt-2">
                          {block.data.description && (
                            <p className="text-sm text-text-primary leading-relaxed">
                              {block.data.description}
                            </p>
                          )}
                          {block.data.skill_focus && (
                            <p className="text-xs text-text-muted mt-1.5">
                              Focus: {block.data.skill_focus}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                if (block.type === 'lane') {
                  stationCount += 1
                  const sNum = stationCount
                  return (
                    <div key={block.block.id} className="border-l-4 border-accent-fire">
                      {/* Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-fire/[0.10] to-transparent">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">📍</span>
                          <span className="text-accent-fire font-heading text-xs uppercase tracking-wider">
                            Station {sNum}
                            {block.data.instructor_name ? ` — ${block.data.instructor_name}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Skills */}
                      {block.data.core_skills.length > 0 && (
                        <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5">
                          {block.data.core_skills.map((skill) => (
                            <span key={skill} className="badge badge-skill">{skill}</span>
                          ))}
                        </div>
                      )}

                      {/* Sub-stations */}
                      {block.stations.length > 0 && (
                        <div className="px-4 pb-4 pt-2 space-y-4">
                          {block.stations.map((station, stIdx) => {
                            const urls = station.photo_urls?.length > 0
                              ? station.photo_urls
                              : station.photo_url ? [station.photo_url] : []
                            return (
                              <div key={station.id}>
                                {station.equipment && (
                                  <p className="text-xs font-bold text-accent-blue mb-1.5">
                                    {station.equipment}
                                  </p>
                                )}
                                {urls.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {urls.map((url, photoIdx) => (
                                      <button
                                        key={photoIdx}
                                        type="button"
                                        className="flex-shrink-0"
                                        onClick={(e) => { e.stopPropagation(); setLightbox({ urls, index: photoIdx }) }}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={url}
                                          alt={`Station ${stIdx + 1} photo ${photoIdx + 1}`}
                                          className="w-20 h-20 rounded-xl object-cover border border-bg-border shadow-card hover:scale-105 transition-transform duration-200 cursor-pointer"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {station.description && (
                                  <p className="text-sm text-text-primary leading-snug">
                                    {station.description}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Course video */}
                      {block.data.video_url && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">
                            Course Video
                          </p>
                          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
                            <video
                              src={block.data.video_url}
                              controls
                              playsInline
                              className="w-full"
                              style={{ maxHeight: '240px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (block.type === 'game') {
                  return (
                    <div key={block.block.id} className="border-l-4 border-accent-green">
                      {/* Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-green/[0.10] to-transparent">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">🎮</span>
                          <span className="text-accent-green font-heading text-xs uppercase tracking-wider">
                            Game
                          </span>
                          {block.data.name && (
                            <span className="text-sm font-bold text-text-primary truncate">
                              — {block.data.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Body */}
                      {(block.data.description || block.data.video_link || block.data.video_url) && (
                        <div className="px-4 pb-3 pt-2.5">
                          {block.data.description && (
                            <p className="text-sm text-text-primary leading-relaxed mb-2">
                              {block.data.description}
                            </p>
                          )}
                          {block.data.video_link && (
                            <a
                              href={block.data.video_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue hover:bg-accent-blue/20 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.5a8.19 8.19 0 004.77 1.52V6.56a4.85 4.85 0 01-1-.13z" />
                              </svg>
                              Watch video
                            </a>
                          )}
                          {block.data.video_url && (
                            <div className="mt-3">
                              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">
                                Game Video
                              </p>
                              <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
                                <video
                                  src={block.data.video_url}
                                  controls
                                  playsInline
                                  className="w-full"
                                  style={{ maxHeight: '240px' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                }

                return null
              })
            })()}
          </div>

          {/* Class-level photos (Quick Log) */}
          {classLevelPhotos.length > 0 && cls.blocks.length === 0 && (
            <div className="px-4 py-3 border-t border-bg-border">
              <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Photos</p>
              <div className="flex flex-wrap gap-2">
                {classLevelPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); setLightbox({ urls: classLevelPhotos, index: idx }) }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Class photo ${idx + 1}`}
                      className="w-20 h-20 rounded-xl object-cover border border-bg-border shadow-card hover:scale-105 transition-transform duration-200 cursor-pointer"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {cls.notes && (
            <div className="px-4 py-3 border-t border-bg-border bg-white/[0.02]">
              <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-1.5">
                Coach Notes
              </p>
              <p className="text-sm text-text-muted leading-relaxed italic">{cls.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Link copied toast */}
      {shareToast &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-bg-card border border-bg-border rounded-xl px-4 py-2.5 shadow-2xl text-sm text-text-primary whitespace-nowrap pointer-events-none">
            <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Link copied!
          </div>,
          document.body
        )}

      {/* Photo lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX
            if (diff > 50) lbNext()
            else if (diff < -50) lbPrev()
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.urls[lightbox.index]}
            alt="Station photo"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.urls.length > 1 && (
            <div
              className="absolute bottom-6 left-0 right-0 flex justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.urls.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === lightbox.index ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
