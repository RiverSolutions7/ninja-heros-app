'use client'

import type { DraftGameBlock } from '@/app/lib/database.types'
import VideoCapture from './VideoCapture'

interface GameBlockFormProps {
  block: DraftGameBlock
  onChange: (changes: Partial<DraftGameBlock>) => void
  onRemove: () => void
}

export default function GameBlockForm({ block, onChange, onRemove }: GameBlockFormProps) {
  return (
    <div className="card overflow-hidden border-l-4 border-accent-green">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-green/[0.12] to-transparent border-b border-bg-border">
        <span className="font-heading text-accent-green text-sm tracking-wide uppercase">
          Game / Activity
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Remove game block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="px-4 py-4 space-y-4">
        {/* Game name */}
        <div>
          <label className="field-label">Game Name</label>
          <input
            type="text"
            value={block.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Ninja Freeze Tag, Obstacle Relay, Floor is Lava..."
            className="field-input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="field-label">
            Description / Rules{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={block.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="How do you play? Special rules? Team sizes?"
            rows={3}
            className="field-textarea"
          />
        </div>

        {/* Video link (external URL) */}
        <div>
          <label className="field-label">
            Reference Video Link{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <input
            type="url"
            value={block.video_link}
            onChange={(e) => onChange({ video_link: e.target.value })}
            placeholder="https://..."
            className="field-input"
            inputMode="url"
          />
        </div>

        {/* Video recording */}
        <div>
          <label className="field-label mb-2">
            Game Video{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional — record the game in action)
            </span>
          </label>
          <VideoCapture
            preview={block.videoPreview}
            onFileSelected={(file, preview) =>
              onChange({ videoFile: file, videoPreview: preview })
            }
          />
        </div>
      </div>
    </div>
  )
}
