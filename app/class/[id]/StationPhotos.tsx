'use client'

import { useState } from 'react'

interface StationPhotosProps {
  urls: string[]
  stationLabel: string
}

export default function StationPhotos({ urls, stationLabel }: StationPhotosProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  if (urls.length === 0) return null

  return (
    <>
      <div className="mb-3">
        <div
          className="flex overflow-x-auto gap-2 px-4"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {urls.map((url, pi) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pi}
              src={url}
              alt={`${stationLabel} photo ${pi + 1}`}
              className="flex-shrink-0 w-full rounded-xl object-contain cursor-pointer bg-black/20"
              style={{ scrollSnapAlign: 'start' }}
              onClick={() => setLightboxUrl(url)}
            />
          ))}
        </div>
        {urls.length > 1 && (
          <div className="flex justify-center gap-1 mt-1.5">
            {urls.map((_, pi) => (
              <span key={pi} className="w-1.5 h-1.5 rounded-full bg-text-dim/40" />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
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
    </>
  )
}
