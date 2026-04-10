'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FullClass, FullBlock } from '@/app/lib/database.types'

const SWIPE_THRESHOLD = 60

interface Props {
  cls: FullClass
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function RunViewClient({ cls }: Props) {
  // Steps: 0 = overview, 1..N = blocks
  const totalSteps = 1 + cls.blocks.length
  const isQuickLog = cls.blocks.length === 0
  const [step, setStep] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  function prev() { setStep((s) => Math.max(0, s - 1)) }
  function next() { setStep((s) => Math.min(totalSteps - 1, s + 1)) }

  // Arrow key navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' && step < totalSteps - 1) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step, totalSteps])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    // Ignore if not primarily horizontal or below threshold
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX > 0) next()
    else prev()
  }

  // Compute station number for lane blocks
  function getStationNumber(blockIndex: number): number {
    let count = 0
    for (let i = 0; i <= blockIndex; i++) {
      if (cls.blocks[i].type === 'lane') count++
    }
    return count
  }

  const progress = totalSteps > 1 ? ((step + 1) / totalSteps) * 100 : 100

  return (
    <div
      className="-mx-4 -mt-4 min-h-screen bg-bg-primary flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      {!isQuickLog && (
        <div className="h-1 bg-bg-border flex-shrink-0">
          <div
            className="h-full bg-accent-fire transition-all duration-300 ease-out rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <Link
          href={`/class/${cls.id}`}
          className="text-xs text-text-dim hover:text-text-muted transition-colors"
        >
          Exit
        </Link>
        {!isQuickLog && (
          <span className="text-xs text-text-dim font-heading">
            {step + 1} / {totalSteps}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {step === 0 ? (
          <OverviewStep cls={cls} />
        ) : (
          <BlockStep block={cls.blocks[step - 1]} blockIndex={step - 1} cls={cls} getStationNumber={getStationNumber} />
        )}
      </div>

      {/* Fixed bottom nav */}
      {!isQuickLog && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-bg-primary/95 backdrop-blur-sm border-t border-bg-border safe-area-pb">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 font-heading text-sm px-4 py-3 rounded-xl border border-bg-border text-text-muted disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all min-h-[48px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              type="button"
              onClick={next}
              disabled={step === totalSteps - 1}
              className="flex-1 inline-flex items-center justify-center gap-2 font-heading text-sm px-4 py-3 rounded-xl bg-accent-fire text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all shadow-glow-fire min-h-[48px]"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview Step                                                       */
/* ------------------------------------------------------------------ */
function OverviewStep({ cls }: { cls: FullClass }) {
  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <h1 className="font-heading text-2xl text-text-primary leading-tight">
          {cls.title || 'Untitled Class'}
        </h1>
        <p className="text-text-dim text-sm mt-1.5">
          {cls.age_group} · {formatDate(cls.class_date)}
        </p>
      </div>

      {cls.notes && (
        <div className="card p-4 mb-4">
          <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-1.5">Coach Notes</p>
          <p className="text-sm text-text-muted leading-relaxed italic">{cls.notes}</p>
        </div>
      )}

      {/* Block summary */}
      <div className="space-y-2">
        <p className="text-xs font-heading text-text-dim uppercase tracking-wider px-1">
          {cls.blocks.length} block{cls.blocks.length !== 1 ? 's' : ''} in this class
        </p>
        {cls.blocks.map((block, idx) => (
          <BlockSummaryCard key={block.block.id} block={block} index={idx} />
        ))}
      </div>

      {cls.blocks.length === 0 && cls.photos && cls.photos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-3 px-1">Photos</p>
          <div className="grid grid-cols-2 gap-2">
            {cls.photos.map((url, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={idx}
                src={url}
                alt={`Class photo ${idx + 1}`}
                className="w-full aspect-[4/3] rounded-xl object-cover border border-bg-border"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BlockSummaryCard({ block, index }: { block: FullBlock; index: number }) {
  const config = {
    warmup: { label: 'Warm-Up', color: 'border-accent-gold', accent: 'text-accent-gold', emoji: '🔥' },
    lane: { label: 'Station', color: 'border-accent-fire', accent: 'text-accent-fire', emoji: '📍' },
    game: { label: 'Game', color: 'border-accent-green', accent: 'text-accent-green', emoji: '🎮' },
  }[block.type]

  const subtitle =
    block.type === 'warmup' ? block.data.time :
    block.type === 'lane' ? (block.data.instructor_name || `${block.stations.length} station${block.stations.length !== 1 ? 's' : ''}`) :
    block.type === 'game' ? block.data.name : ''

  return (
    <div className={`card flex items-center gap-3 p-3 border-l-4 ${config.color}`}>
      <span className="text-lg">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-heading text-sm ${config.accent}`}>{config.label}</p>
        {subtitle && <p className="text-xs text-text-dim truncate">{subtitle}</p>}
      </div>
      <span className="text-xs text-text-dim font-heading">{index + 1}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Block Step                                                          */
/* ------------------------------------------------------------------ */
function BlockStep({
  block,
  blockIndex,
  cls,
  getStationNumber,
}: {
  block: FullBlock
  blockIndex: number
  cls: FullClass
  getStationNumber: (idx: number) => number
}) {
  if (block.type === 'warmup') return <WarmupStep block={block} />
  if (block.type === 'lane') return <LaneStep block={block} stationNumber={getStationNumber(blockIndex)} />
  if (block.type === 'game') return <GameStep block={block} />
  return null
}

function WarmupStep({ block }: { block: Extract<FullBlock, { type: 'warmup' }> }) {
  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">🔥</span>
        <h2 className="font-heading text-xl text-accent-gold">Warm-Up</h2>
        <span className="inline-block mt-2 px-3 py-1 rounded-full bg-accent-gold/15 text-accent-gold text-sm font-semibold">
          {block.data.time}
        </span>
      </div>

      {block.data.description && (
        <div className="card p-5 border-l-4 border-accent-gold">
          <p className="text-base text-text-primary leading-relaxed">{block.data.description}</p>
        </div>
      )}

      {block.data.skill_focus && (
        <div className="mt-4 text-center">
          <span className="text-xs text-text-dim uppercase tracking-wider">Focus</span>
          <p className="font-heading text-sm text-text-muted mt-1">{block.data.skill_focus}</p>
        </div>
      )}
    </div>
  )
}

function LaneStep({ block, stationNumber }: { block: Extract<FullBlock, { type: 'lane' }>; stationNumber: number }) {
  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">📍</span>
        <h2 className="font-heading text-xl text-accent-fire">
          Station {stationNumber}
        </h2>
        {block.data.instructor_name && (
          <p className="text-text-dim text-sm mt-1">{block.data.instructor_name}</p>
        )}
      </div>

      {block.data.core_skills.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {block.data.core_skills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-accent-purple/10 border border-accent-purple/20 text-accent-purple"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {block.stations.map((station, stIdx) => {
        const urls = station.photo_urls?.length > 0
          ? station.photo_urls
          : station.photo_url ? [station.photo_url] : []
        return (
          <div key={station.id} className="card overflow-hidden mb-3 border-l-4 border-accent-fire">
            {urls.length > 0 && (
              <div className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls[0]}
                  alt={`Station ${stIdx + 1}`}
                  className="w-full object-cover"
                  style={{ maxHeight: '280px' }}
                />
                {urls.length > 1 && (
                  <div className="flex gap-2 p-2">
                    {urls.slice(1).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover border border-bg-border" />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              {station.equipment && (
                <p className="text-xs font-bold text-accent-blue mb-2 uppercase tracking-wider">
                  {station.equipment}
                </p>
              )}
              <p className="text-base text-text-primary leading-relaxed">
                {station.description}
              </p>
            </div>
          </div>
        )
      })}

      {block.data.video_url && (
        <div className="mt-4">
          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2 px-1">Course Video</p>
          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
            <video
              src={block.data.video_url}
              controls
              playsInline
              className="w-full"
              style={{ maxHeight: '300px' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function GameStep({ block }: { block: Extract<FullBlock, { type: 'game' }> }) {
  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <span className="text-4xl mb-2 block">🎮</span>
        <h2 className="font-heading text-xl text-accent-green">Game</h2>
        {block.data.name && (
          <p className="font-heading text-lg text-text-primary mt-1">{block.data.name}</p>
        )}
      </div>

      {block.data.description && (
        <div className="card p-5 border-l-4 border-accent-green mb-4">
          <p className="text-base text-text-primary leading-relaxed">{block.data.description}</p>
        </div>
      )}

      {block.data.video_link && (
        <a
          href={block.data.video_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-sm text-accent-blue hover:bg-accent-blue/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Watch Video
        </a>
      )}

      {block.data.video_url && (
        <div className="mt-4">
          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2 px-1">Game Video</p>
          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
            <video
              src={block.data.video_url}
              controls
              playsInline
              className="w-full"
              style={{ maxHeight: '300px' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
