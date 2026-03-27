'use client'

import type { DraftStation } from '@/app/lib/database.types'
import CameraUpload from './CameraUpload'

interface StationCardProps {
  station: DraftStation
  index: number
  onChange: (changes: Partial<DraftStation>) => void
  onRemove: () => void
}

export default function StationCard({ station, index, onChange, onRemove }: StationCardProps) {
  return (
    <div className="bg-bg-primary border border-bg-border rounded-xl overflow-hidden">
      {/* Station header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-white/[0.02]">
        <span className="text-xs font-heading text-text-muted uppercase tracking-wider">
          Station {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1 rounded"
          aria-label={`Remove station ${index + 1}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Station fields */}
      <div className="px-3 py-3 space-y-3">
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

        {/* Camera upload */}
        <CameraUpload
          preview={station.photoPreview}
          onFileSelected={(file, preview) =>
            onChange({ photoFile: file, photoPreview: preview })
          }
        />
      </div>
    </div>
  )
}
