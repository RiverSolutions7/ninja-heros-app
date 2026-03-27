'use client'

import { useState } from 'react'
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ClassCard({ cls, showActions = true, showHandoffRemove = false }: ClassCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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

  // Block type indicators for collapsed header
  const hasWarmup = cls.blocks.some((b) => b.type === 'warmup')
  const hasLane = cls.blocks.some((b) => b.type === 'lane')
  const hasGame = cls.blocks.some((b) => b.type === 'game')

  return (
    <div className="card overflow-hidden">
      {/* Card header — tap to expand/collapse */}
      <div
        className="px-4 py-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className={`font-heading text-base leading-tight truncate${cls.title ? ' text-text-primary' : ' text-text-dim'}`}>
              {cls.title || 'Untitled Class'}
            </p>
            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-text-dim">{formatShortDate(cls.class_date)}</span>
              <span className="text-text-dim/40 text-xs leading-none">·</span>
              <span className="text-xs text-text-dim truncate max-w-[140px]">{cls.age_group}</span>
              {/* Block type dots */}
              {(hasWarmup || hasLane || hasGame) && (
                <div className="flex items-center gap-1 ml-0.5">
                  {hasWarmup && <span className="w-2 h-2 rounded-full bg-accent-gold inline-block" />}
                  {hasLane && <span className="w-2 h-2 rounded-full bg-accent-fire inline-block" />}
                  {hasGame && <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />}
                </div>
              )}
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-text-dim flex-shrink-0 mt-0.5 transition-transform duration-300 ease-in-out${expanded ? ' rotate-180' : ''}`}
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
      </div>

      {/* Smooth expand/collapse via CSS Grid height trick */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          {/* Top border slides in with content */}
          <div className="border-t border-bg-border" />

          {/* Blocks */}
          <div className="divide-y divide-bg-border">
            {cls.blocks.map((block, blockIdx) => {
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
                const laneNumber =
                  cls.blocks
                    .slice(0, blockIdx)
                    .filter((b) => b.type === 'lane').length + 1

                const heading = block.data.instructor_name
                  ? `Lane ${laneNumber} — ${block.data.instructor_name}`
                  : `Lane ${laneNumber}`

                return (
                  <div key={block.block.id} className="border-l-4 border-accent-fire">
                    {/* Lane header with gradient */}
                    <div className="px-4 py-3 bg-gradient-to-r from-accent-fire/[0.10] to-transparent">
                      <span className="font-heading text-sm text-accent-fire">{heading}</span>
                    </div>

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
                                      onClick={(e) => { e.stopPropagation(); setLightboxUrl(url) }}
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
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
            onClick={() => setLightboxUrl(null)}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Station photo"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
