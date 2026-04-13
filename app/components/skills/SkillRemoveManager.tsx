'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { SkillRecency } from '@/app/lib/database.types'
import SkillRecencyBar from './SkillRecencyBar'

interface SkillRemoveManagerProps {
  items: SkillRecency[]
}

export default function SkillRemoveManager({ items }: SkillRemoveManagerProps) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  function handleMinusTap(skill: string) {
    if (confirming === skill) {
      setConfirming(null)
      return
    }
    setConfirming(skill)
  }

  async function handleConfirmDelete(skill: string) {
    setDeleting(skill)
    const { error } = await supabase.from('skills').delete().eq('name', skill)
    setDeleting(null)
    if (!error) {
      setConfirming(null)
      router.refresh()
    }
  }

  function handleToggleRemoving() {
    setRemoving((v) => !v)
    setConfirming(null)
  }

  if (items.length === 0) {
    return (
      <div className="card px-4 py-4 mb-6">
        <p className="text-text-dim text-sm text-center">
          No skills yet — add one above or log a component with skills.
        </p>
      </div>
    )
  }

  return (
    <div className="card px-4 py-2 mb-6">
      {/* Column header row */}
      <div className="flex items-center py-2 border-b border-bg-border mb-1">
        <div
          className="overflow-hidden flex-shrink-0"
          style={{
            width: '2.25rem',
            maxWidth: removing ? '2.25rem' : '0',
            transition: 'max-width 200ms ease-in-out',
          }}
        />

        <span className="text-xs font-heading text-text-dim uppercase tracking-wider flex-1">
          Skill
        </span>

        <div className="flex items-center gap-3">
          <span className="text-xs font-heading text-text-dim uppercase tracking-wider">
            Last Used
          </span>

          <button
            onClick={handleToggleRemoving}
            className={[
              'text-xs font-heading transition-all duration-150 px-2.5 py-1 rounded-lg border flex items-center gap-1',
              removing
                ? 'text-accent-fire border-accent-fire/40 bg-accent-fire/10'
                : 'text-text-dim border-bg-border hover:text-accent-fire hover:border-accent-fire/30 hover:bg-white/5',
            ].join(' ')}
          >
            {removing ? (
              'Done'
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
                Remove Skills
              </>
            )}
          </button>
        </div>
      </div>

      {/* Skill rows */}
      {items.map((item) => (
        <div key={item.skill}>
          <div className="flex items-center">
            {/* Minus button — slides in from the left */}
            <div
              className="overflow-hidden flex-shrink-0 flex items-center"
              style={{
                width: '2.25rem',
                maxWidth: removing ? '2.25rem' : '0',
                opacity: removing ? 1 : 0,
                transition: 'max-width 200ms ease-in-out, opacity 200ms ease-in-out',
              }}
            >
              <button
                type="button"
                onClick={() => handleMinusTap(item.skill)}
                disabled={!!deleting}
                className="w-6 h-6 rounded-full bg-accent-fire flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 flex-shrink-0"
                aria-label={`Remove ${item.skill}`}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <SkillRecencyBar item={item} />
            </div>
          </div>

          {/* Confirmation banner */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
              confirming === item.skill ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex items-center gap-3 ml-8 mb-2 px-3 py-2.5 rounded-xl bg-accent-fire/10 border border-accent-fire/20">
                <p className="text-sm text-text-primary flex-1 leading-snug">
                  Remove &ldquo;{item.skill}&rdquo;?
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(item.skill)}
                    disabled={deleting === item.skill}
                    className="text-xs font-bold text-white bg-accent-fire px-3 py-1.5 rounded-lg disabled:opacity-60 transition-opacity min-h-[32px]"
                  >
                    {deleting === item.skill ? '...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
