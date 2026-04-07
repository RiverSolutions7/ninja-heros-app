'use client'

import { useRef, useState } from 'react'
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
  const touchStartX = useRef(0)

  function lbPrev() {
    setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.urls.length) % lb.urls.length } : null)
  }
  function lbNext() {
    setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.urls.length } : null)
  }

  const photoUrls = cls.blocks.flatMap((b) =>
    b.type === 'lane'
      ? b.stations.flatMap((s) =>
          s.photo_urls?.length > 0
            ? s.photo_urls
            : s.photo_url ? [s.photo_url] : []
        )
      : []
  )
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
          <div onClick={(e) => e.stopPropagation()}>
            {showActions && (
              <ClassCardMenu
                classId={cls.id}
                currentFolderId={cls.folder_id}
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

          {/* Blocks */}
          <div className="divide-y divide-bg-border">
            {cls.blocks.map((block) => {
              if (block.type === 'warmup') {
                return (
                  <div key={block.block.id} className="border-l-4 border-accent-gold">
                    <div className="px-4 py-3 bg-gradient-to-r from-accent-gold/[0.10] to-transparent">
                      <div className="flex items-center gap-2.5">
                        <span className="text-accent-gold font-heading text-xs uppercase tracking-wider">
                          Warm-Up
                        </span>
                        <span className="badge badge-time">{block.data.time}</span>
                      </div>
                    </div>
                    <div className="px-4 pb-3 pt-2.5">
                      <p className="text-sm text-text-primary leading-relaxed">
                        {block.data.description}
                      </p>
                      {block.data.skill_focus && (
                        <p className="text-xs text-text-muted mt-1.5">
                          Focus: {block.data.skill_focus}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              if (block.type === 'lane') {
                return (
                  <div key={block.block.id} className="border-l-4 !border-l-accent-fire">
                    {/* Lane header with gradient — only shown when a name was entered */}
                    {block.data.instructor_name && (
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-fire/[0.10] to-transparent">
                        <span className="font-heading text-sm text-accent-fire">
                          {block.data.instructor_name}
                        </span>
                      </div>
                    )}

                    {/* Core skills */}
                    {block.data.core_skills.length > 0 && (
                      <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                        {block.data.core_skills.map((skill) => (
                          <span key={skill} className="badge badge-skill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stations */}
                    {block.stations.length > 0 && (
                      <div className="px-4 pb-4 space-y-3.5">
                        {block.stations.map((station, stIdx) => (
                          <div key={station.id} className="space-y-2">
                            {/* Photos row */}
                            {(() => {
                              const urls = station.photo_urls?.length > 0
                                ? station.photo_urls
                                : station.photo_url ? [station.photo_url] : []
                              return urls.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
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
                              ) : null
                            })()}
                            {/* Text */}
                            <div className="min-w-0">
                              {station.equipment && (
                                <p className="text-xs font-bold text-accent-blue mb-1">
                                  {station.equipment}
                                </p>
                              )}
                              <p className="text-sm text-text-primary leading-snug">
                                {station.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lane video */}
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
                    {/* Game header with gradient */}
                    <div className="px-4 py-3 bg-gradient-to-r from-accent-green/[0.10] to-transparent">
                      <div className="flex items-center gap-2.5">
                        <span className="text-accent-green font-heading text-xs uppercase tracking-wider">
                          Game
                        </span>
                        <span className="text-sm font-bold text-text-primary truncate">
                          {block.data.name}
                        </span>
                      </div>
                    </div>
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
                  </div>
                )
              }

              return null
            })}
          </div>

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
