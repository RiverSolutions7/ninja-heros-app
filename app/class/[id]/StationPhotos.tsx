'use client'

import { useRef, useState } from 'react'

interface StationPhotosProps {
  urls: string[]
  stationLabel: string
}

export default function StationPhotos({ urls, stationLabel }: StationPhotosProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const touchStartX = useRef(0)

  if (urls.length === 0) return null

  function prevActive() {
    setActiveIndex((i) => (i - 1 + urls.length) % urls.length)
  }
  function nextActive() {
    setActiveIndex((i) => (i + 1) % urls.length)
  }
  function prev() {
    setLightboxIndex((i) => (i !== null ? (i - 1 + urls.length) % urls.length : null))
  }
  function next() {
    setLightboxIndex((i) => (i !== null ? (i + 1) % urls.length : null))
  }

  return (
    <>
      <div className="mb-3">
        {/* Single-photo display — avoids shared flex height causing black bars */}
        <div
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX
            if (diff > 50) nextActive()
            else if (diff < -50) prevActive()
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[activeIndex]}
            alt={`${stationLabel} photo ${activeIndex + 1}`}
            className="w-full cursor-pointer"
            style={{ height: 'auto', display: 'block' }}
            onClick={() => setLightboxIndex(activeIndex)}
          />
        </div>
        {urls.length > 1 && (
          <div className="flex justify-center gap-1 mt-1.5">
            {urls.map((_, pi) => (
              <span
                key={pi}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${pi === activeIndex ? 'bg-text-primary' : 'bg-text-dim/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX
            if (diff > 50) next()
            else if (diff < -50) prev()
          }}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[lightboxIndex]}
            alt={`${stationLabel} photo ${lightboxIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {urls.length > 1 && (
            <div
              className="absolute bottom-6 left-0 right-0 flex justify-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {urls.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === lightboxIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
