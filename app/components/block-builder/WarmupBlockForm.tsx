'use client'

import type { DraftWarmupBlock } from '@/app/lib/database.types'
import { WARMUP_TIMES } from '@/app/lib/database.types'

interface WarmupBlockFormProps {
  block: DraftWarmupBlock
  onChange: (changes: Partial<DraftWarmupBlock>) => void
  onRemove: () => void
}

export default function WarmupBlockForm({ block, onChange, onRemove }: WarmupBlockFormProps) {
  return (
    <div className="card overflow-hidden border-l-4 border-accent-gold">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-gold/[0.12] to-transparent border-b border-bg-border">
        <div className="flex items-center gap-2">
          <span className="font-heading text-accent-gold text-sm tracking-wide uppercase">
            Warm-Up & Stretches
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Remove warm-up block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="px-4 py-4 space-y-4">
        {/* Description */}
        <div>
          <label className="field-label">Activity Description</label>
          <textarea
            value={block.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What do kids do? (e.g. Bear crawl across floor, 3 forward rolls, 10 jumping jacks...)"
            rows={3}
            className="field-textarea"
          />
        </div>

        {/* Time */}
        <div>
          <label className="field-label">Duration</label>
          <div className="relative">
            <select
              value={block.time}
              onChange={(e) =>
                onChange({ time: e.target.value as DraftWarmupBlock['time'] })
              }
              className="field-select pr-8"
            >
              {WARMUP_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Skill Focus */}
        <div>
          <label className="field-label">
            Skill Focus{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={block.skill_focus}
            onChange={(e) => onChange({ skill_focus: e.target.value })}
            placeholder="e.g. Balance, Coordination, Body awareness..."
            className="field-input"
          />
        </div>
      </div>
    </div>
  )
}
