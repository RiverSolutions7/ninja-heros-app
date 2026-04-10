'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FullClass, FullBlock } from '@/app/lib/database.types'

const SWIPE_THRESHOLD = 60

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/* ── Overview step (step 0) ── */
function OverviewStep({ cls }: { cls: FullClass }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <h1 className="font-heading text-3xl text-text-primary text-center leading-tight">
        {cls.title || 'Untitled Class'}
      </h1>
      <p className="text-text-muted text-sm mt-2">
        {cls.age_group} · {formatDate(cls.class_date)}
      </p>

      {cls.notes && (
        <div className="mt-6 w-full max-w-md bg-bg-card border border-bg-border rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-1.5">
            Coach Notes
          </p>
          <p className="text-sm text-text-muted leading-relaxed italic">{cls.notes}</p>
        </div>
      )}

      {/* Block summary */}
      {cls.blocks.length > 0 && (
        <div className="mt-6 w-full max-w-md space-y-2">
          {(() => {
            let stationCount = 0
            return cls.blocks.map((block) => {
              if (block.type === 'warmup') {
                return (
                  <div key={block.block.id} className="flex items-center gap-3 border-l-4 border-accent-gold bg-bg-card rounded-r-xl px-4 py-3">
                    <span className="text-accent-gold font-heading text-xs uppercase tracking-wider">Warm-Up</span>
                    <span className="text-xs text-text-dim">{block.data.time}</span>
                  </div>
                )
              }
              if (block.type === 'lane') {
                stationCount += 1
                return (
                  <div key={block.block.id} className="flex items-center gap-3 border-l-4 border-accent-fire bg-bg-card rounded-r-xl px-4 py-3">
                    <span className="text-accent-fire font-heading text-xs uppercase tracking-wider">
                      Station {stationCount}
                    </span>
                    {block.data.instructor_name && (
                      <span className="text-xs text-text-dim truncate">{block.data.instructor_name}</span>
                    )}
                  </div>
                )
              }
              if (block.type === 'game') {
                return (
                  <div key={block.block.id} className="flex items-center gap-3 border-l-4 border-accent-green bg-bg-card rounded-r-xl px-4 py-3">
                    <span className="text-accent-green font-heading text-xs uppercase tracking-wider">Game</span>
                    {block.data.name && (
                      <span className="text-xs text-text-dim truncate">{block.data.name}</span>
                    )}
                  </div>
                )
              }
              return null
            })
          })()}
        </div>
      )}

      {/* Quick-logged class photos */}
      {cls.blocks.length === 0 && cls.photos && cls.photos.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <div className="flex flex-wrap gap-2 justify-center">
            {cls.photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-bg-border" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Warmup step ── */
function WarmupStep({ block }: { block: Extract<FullBlock, { type: 'warmup' }> }) {
  return (
    <div className="flex-1 px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-accent-gold" />
        <span className="text-accent-gold font-heading text-sm uppercase tracking-wider">Warm-Up</span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-accent-gold/15 text-accent-gold font-semibold">
          {block.data.time}
        </span>
      </div>
      <p className="text-base text-text-primary leading-relaxed">{block.data.description}</p>
      {block.data.skill_focus && (
        <p className="text-sm text-text-muted mt-4">Focus: {block.data.skill_focus}</p>
      )}
    </div>
  )
}

/* ── Station step ── */
function LaneStep({ block, stationNumber }: { block: Extract<FullBlock, { type: 'lane' }>; stationNumber: number }) {
  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 rounded-full bg-accent-fire" />
        <span className="text-accent-fire font-heading text-sm uppercase tracking-wider">
          Station {stationNumber}
          {block.data.instructor_name ? ` — ${block.data.instructor_name}` : ''}
        </span>
      </div>

      {block.data.core_skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {block.data.core_skills.map((skill) => (
            <span key={skill} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-purple/10 border border-accent-purple/20 text-accent-purple">
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
          <div key={station.id} className="mb-5 last:mb-0">
            {urls.length > 0 && (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls[0]}
                  alt={`Station ${stIdx + 1}`}
                  className="w-full rounded-xl object-cover border border-bg-border"
                  style={{ maxHeight: '240px' }}
                />
                {urls.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {urls.slice(1).map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover border border-bg-border" />
                    ))}
                  </div>
                )}
              </div>
            )}
            {station.equipment && (
              <p className="text-xs font-bold text-accent-blue mb-1.5">{station.equipment}</p>
            )}
            {station.description && (
              <p className="text-base text-text-primary leading-relaxed">{station.description}</p>
            )}
          </div>
        )
      })}

      {block.data.video_url && (
        <div className="mt-4">
          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Course Video</p>
          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
            <video src={block.data.video_url} controls playsInline className="w-full" style={{ maxHeight: '240px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Game step ── */
function GameStep({ block }: { block: Extract<FullBlock, { type: 'game' }> }) {
  return (
    <div className="flex-1 px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 rounded-full bg-accent-green" />
        <span className="text-accent-green font-heading text-sm uppercase tracking-wider">Game</span>
        {block.data.name && (
          <span className="text-base font-bold text-text-primary">{block.data.name}</span>
        )}
      </div>
      {block.data.description && (
        <p className="text-base text-text-primary leading-relaxed mb-4">{block.data.description}</p>
      )}
      {block.data.video_link && (
        <a
          href={block.data.video_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue"
        >
          Watch video
        </a>
      )}
      {block.data.video_url && (
        <div className="mt-4">
          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Game Video</p>
          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
            <video src={block.data.video_url} controls playsInline className="w-full" style={{ maxHeight: '240px' }} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Run View ── */
export default function RunViewClient({ cls }: { cls: FullClass }) {
  const totalSteps = cls.blocks.length + 1 // overview + each block
  const isQuickLog = cls.blocks.length === 0
  const [step, setStep] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

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
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX > 0 && step < totalSteps - 1) setStep((s) => s + 1)
    if (deltaX < 0 && step > 0) setStep((s) => s - 1)
  }

  // Compute station number for lane blocks
  function getStationNumber(blockIndex: number): number {
    let count = 0
    for (let i = 0; i <= blockIndex; i++) {
      if (cls.blocks[i].type === 'lane') count++
    }
    return count
  }

  return (
    <div
      className="fixed inset-0 bg-bg-primary flex flex-col z-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      {!isQuickLog && (
        <div className="h-0.5 bg-bg-border flex-shrink-0">
          <div
            className="h-full bg-accent-fire transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <Link
          href={`/library/${cls.id}`}
          className="font-heading text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Exit
        </Link>
        {!isQuickLog && (
          <span className="text-xs text-text-dim font-heading">
            {step + 1} / {totalSteps}
          </span>
        )}
      </div>

      {/* Content */}
      {step === 0 ? (
        <OverviewStep cls={cls} />
      ) : (() => {
        const block = cls.blocks[step - 1]
        if (block.type === 'warmup') return <WarmupStep block={block} />
        if (block.type === 'lane') return <LaneStep block={block} stationNumber={getStationNumber(step - 1)} />
        if (block.type === 'game') return <GameStep block={block} />
        return null
      })()}

      {/* Bottom navigation */}
      {!isQuickLog && (
        <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-bg-border text-text-muted font-heading text-sm px-4 py-3 rounded-xl transition-all min-h-[48px] disabled:opacity-30 active:scale-95 hover:bg-white/5"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={step === totalSteps - 1}
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-sm px-4 py-3 rounded-xl transition-all shadow-glow-fire min-h-[48px] disabled:opacity-30 active:scale-95"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
