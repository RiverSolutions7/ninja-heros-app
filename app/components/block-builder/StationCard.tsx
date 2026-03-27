'use client'

import { useRef } from 'react'
import type { DraftStation, DraftPhotoItem } from '@/app/lib/database.types'

interface StationCardProps {
  station: DraftStation
  index: number
  onChange: (changes: Partial<DraftStation>) => void
  onRemove: () => void
}

export default function StationCard({ station, onChange, onRemove }: StationCardProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  function handleFileAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const newPhoto: DraftPhotoItem = {
      localId: crypto.randomUUID(),
      photoFile: file,
      photoPreview: preview,
      photo_url: null,
    }
    onChange({ photos: [...station.photos, newPhoto] })
    e.target.value = ''
  }

  function removePhoto(localId: string) {
    onChange({ photos: station.photos.filter((p) => p.localId !== localId) })
  }

  return (
    <div className="bg-bg-primary border border-bg-border rounded-xl overflow-hidden">
      {/* X button — top right, no station label */}
      <div className="flex justify-end px-3 pt-2.5">
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1 rounded"
          aria-label="Remove station"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-3 space-y-3">
        <div>
          <label className="field-label">Equipment</label>
          <input
            type="text"
            value={station.equipment}
            onChange={(e) => onChange({ equipment: e.target.value })}
            placeholder="e.g. Balance beam, foam blocks, rope..."
            className="field-input text-sm"
          />
        </div>

        <div>
          <label className="field-label">Description / Coaching Cue</label>
          <textarea
            value={station.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What does the kid do? Coaching tips?"
            rows={2}
            className="field-textarea text-sm"
          />
        </div>

        {/* Photos */}
        <div>
          {/* Thumbnail row */}
          {station.photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2.5">
              {station.photos.map((photo) => (
                <div key={photo.localId} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.photoPreview ?? photo.photo_url ?? ''}
                    alt="Station photo"
                    className="w-16 h-16 rounded-lg object-cover border border-bg-border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.localId)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-card border border-bg-border flex items-center justify-center text-text-dim hover:text-red-400 transition-colors"
                    aria-label="Remove photo"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo buttons */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors py-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose from Library
            </button>
          </div>

          <input ref={cameraRef} type="file" accept="image/*,video/*" onChange={handleFileAdded} className="hidden" />
          <input ref={libraryRef} type="file" accept="image/*,video/*" onChange={handleFileAdded} className="hidden" />
        </div>
      </div>
    </div>
  )
}
