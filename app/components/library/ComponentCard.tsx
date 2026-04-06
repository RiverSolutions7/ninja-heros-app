'use client'

import { useState } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'

interface ComponentCardProps {
  component: ComponentRow
}

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
  },
  warmup: {
    label: 'Warmup',
    border: 'border-l-accent-gold',
    badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
  },
}

export default function ComponentCard({ component }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  function lbPrev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
  }
  function lbNext() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))
  }

  return (
    <>
      <div
        className={[
          'bg-bg-card rounded-2xl shadow-card border border-bg-border border-l-4 overflow-hidden',
          meta.border,
        ].join(' ')}
      >
        {/* First photo thumbnail */}
        {photos.length > 0 && (
          <div
            className="relative w-full cursor-pointer"
            style={{ aspectRatio: '16/7' }}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(0) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0]}
              alt={component.title}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                +{photos.length - 1} more
              </span>
            )}
          </div>
        )}

        {/* Card body */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-heading text-text-primary text-base leading-snug truncate">
                {component.title}
              </p>
              {(component.curriculum || component.equipment) && (
                <p className="text-text-dim text-xs mt-0.5 truncate">
                  {[component.curriculum, component.equipment].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {component.duration_minutes != null && (
                <span className="text-xs text-text-dim">
                  {component.duration_minutes}m
                </span>
              )}
              <span className={['text-xs font-semibold px-2 py-0.5 rounded-full', meta.badge].join(' ')}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox — all photos full width */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex flex-col"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-heading text-white text-sm truncate flex-1">
              {component.title}
            </p>
            <span className="text-text-dim text-xs mx-3">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Photo */}
          <div
            className="flex-1 flex items-center justify-center px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex]}
              alt={`${component.title} photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <div
              className="flex justify-between px-4 pb-6 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={lbPrev}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={lbNext}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
