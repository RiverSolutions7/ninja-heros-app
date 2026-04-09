'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentRow } from '@/app/lib/database.types'
import { TYPE_META } from './ComponentCard'

interface ComponentDetailSheetProps {
  component: ComponentRow
  onClose: () => void
}

export default function ComponentDetailSheet({ component, onClose }: ComponentDetailSheetProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const [photoIndex, setPhotoIndex] = useState(0)
  const touchStartX = useRef(0)

  function prevPhoto() {
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
  }
  function nextPhoto() {
    setPhotoIndex((i) => (i + 1) % photos.length)
  }

  const sheet = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      className="bg-bg-primary flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-bg-border flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className={`font-heading text-lg leading-none ${meta.textColor}`}>
            {component.title}
          </h2>
          {component.curriculum && (
            <p className="text-text-dim text-xs mt-0.5">{component.curriculum}</p>
          )}
        </div>
        <span className={['text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', meta.badge].join(' ')}>
          {meta.label}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Photos — full width, swipeable */}
        {photos.length > 0 && (
          <div
            className="relative w-full bg-black"
            style={{ aspectRatio: '4/3' }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - e.changedTouches[0].clientX
              if (diff > 50) nextPhoto()
              else if (diff < -50) prevPhoto()
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIndex]}
              alt={`${component.title} photo ${photoIndex + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Prev / Next buttons */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === photoIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Detail fields */}
        <div className="px-4 py-5 space-y-5">
          {/* Skills */}
          {(component.skills?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {component.skills!.map((skill) => (
                  <span key={skill} className="badge badge-skill">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {component.equipment && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">
                Equipment
              </p>
              <p className="text-sm font-bold text-accent-blue">{component.equipment}</p>
            </div>
          )}

          {/* Description / Coaching Cue */}
          {component.description && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">
                {component.type === 'warmup' ? 'Description' : 'Coaching Cue'}
              </p>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {component.description}
              </p>
            </div>
          )}

          {/* Duration */}
          {component.duration_minutes != null && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">
                Duration
              </p>
              <p className="text-sm text-text-primary">{component.duration_minutes} minutes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return typeof window !== 'undefined' ? createPortal(sheet, document.body) : null
}
