'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCardMenu from './ComponentCardMenu'

interface ComponentCardProps {
  component: ComponentRow
  showMenu?: boolean
}

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string; textColor: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    textColor: 'text-accent-green',
  },
  warmup: {
    label: 'Warmup',
    border: 'border-l-accent-gold',
    badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
    textColor: 'text-accent-gold',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    textColor: 'text-accent-blue',
  },
}

export { TYPE_META }

export default function ComponentCard({ component, showMenu = false }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null)
  const touchStartX = useRef(0)

  function lbPrev() {
    setLightbox((lb) => lb ? { index: (lb.index - 1 + photos.length) % photos.length } : null)
  }
  function lbNext() {
    setLightbox((lb) => lb ? { index: (lb.index + 1) % photos.length } : null)
  }

  return (
    <>
      <div
        className={[
          'bg-bg-card rounded-2xl shadow-card border border-bg-border border-l-4',
          meta.border,
        ].join(' ')}
      >
        {/* Main row */}
        <div className="flex items-start gap-3 p-4 pb-3">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <p className="font-heading text-text-primary text-base leading-snug">
              {component.title}
            </p>
            {(component.curriculum || component.duration_minutes != null) && (
              <p className="text-text-dim text-xs mt-0.5">
                {[
                  component.curriculum,
                  component.duration_minutes != null ? `${component.duration_minutes}m` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {(component.skills?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {component.skills!.map((skill) => (
                  <span key={skill} className="badge badge-skill">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: badge + pencil */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={['text-xs font-semibold px-2 py-0.5 rounded-full', meta.badge].join(' ')}>
              {meta.label}
            </span>
            {showMenu && (
              <div onClick={(e) => e.stopPropagation()}>
                <ComponentCardMenu component={component} />
              </div>
            )}
          </div>
        </div>

        {/* Photos row — shown when there are photos */}
        {photos.length > 0 && (
          <div
            className="flex overflow-x-auto gap-2 px-4 pb-4"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightbox({ index: idx }) }}
                className="flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${component.title} photo ${idx + 1}`}
                  className="w-16 h-16 rounded-xl object-cover border border-bg-border hover:scale-105 transition-transform duration-200"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
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
            src={photos[lightbox.index]}
            alt={`${component.title} photo ${lightbox.index + 1}`}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); lbPrev() }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); lbNext() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div
                className="absolute bottom-6 left-0 right-0 flex justify-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${i === lightbox.index ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
