'use client'

import { useRef, useState } from 'react'
import type { DraftLaneBlock, DraftStation } from '@/app/lib/database.types'
import { supabase } from '@/app/lib/supabase'
import SkillChip from '@/app/components/skills/SkillChip'
import StationCard from './StationCard'
import VideoCapture from './VideoCapture'

interface LaneBlockFormProps {
  block: DraftLaneBlock
  laneNumber: number
  onChange: (changes: Partial<DraftLaneBlock>) => void
  onRemove: () => void
  availableSkills: string[]
  onAddSkill: (name: string) => void
  ageGroup: string
}

function createEmptyStation(sortOrder: number): DraftStation {
  return {
    localId: crypto.randomUUID(),
    sort_order: sortOrder,
    equipment: '',
    description: '',
    photos: [],
  }
}

export default function LaneBlockForm({
  block,
  laneNumber,
  onChange,
  onRemove,
  availableSkills,
  onAddSkill,
  ageGroup,
}: LaneBlockFormProps) {
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillError, setAddSkillError] = useState<string | null>(null)
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const newSkillInputRef = useRef<HTMLInputElement>(null)

  // Skills section starts open only if skills already exist
  const [showDetails, setShowDetails] = useState(block.core_skills.length > 0)

  function toggleSkill(skill: string) {
    const current = block.core_skills
    const next = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill]
    onChange({ core_skills: next })
  }

  function addStation() {
    onChange({
      stations: [...block.stations, createEmptyStation(block.stations.length)],
    })
  }

  function updateStation(localId: string, changes: Partial<DraftStation>) {
    onChange({
      stations: block.stations.map((s) =>
        s.localId === localId ? { ...s, ...changes } : s
      ),
    })
  }

  function removeStation(localId: string) {
    onChange({
      stations: block.stations.filter((s) => s.localId !== localId),
    })
  }

  async function handleAddSkill() {
    const trimmed = newSkillName.trim()
    if (!trimmed) return

    setAddSkillSaving(true)
    setAddSkillError(null)

    const { error } = await supabase
      .from('skills')
      .insert({ name: trimmed, age_group: ageGroup })

    // Ignore unique constraint violation — skill already exists, just use it
    if (error && error.code !== '23505') {
      setAddSkillError(error.message)
      setAddSkillSaving(false)
      return
    }

    // Notify parent to update its availableSkills list
    onAddSkill(trimmed)

    // Auto-select this skill in the current lane block
    if (!block.core_skills.includes(trimmed)) {
      onChange({ core_skills: [...block.core_skills, trimmed] })
    }

    setNewSkillName('')
    setAddingSkill(false)
    setAddSkillSaving(false)
    setAddSkillError(null)
  }

  function openAddSkill() {
    setAddingSkill(true)
    setNewSkillName('')
    setTimeout(() => newSkillInputRef.current?.focus(), 50)
  }

  return (
    <div className="card overflow-hidden border-l-4 border-accent-fire">
      {/* Header — just the X button */}
      <div className="flex items-center justify-end px-4 py-2.5 bg-gradient-to-r from-accent-fire/[0.12] to-transparent border-b border-bg-border">
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Remove lane block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Lane Name */}
        <div>
          <label className="field-label">Lane Name</label>
          <input
            type="text"
            value={block.instructor_name}
            onChange={(e) => onChange({ instructor_name: e.target.value })}
            placeholder="e.g. Parkour Lane, Tumbling Lane..."
            className="field-input"
          />
        </div>

        {/* Stations — primary focus */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="field-label mb-0">Stations</label>
            {block.stations.length > 0 && (
              <button
                type="button"
                onClick={addStation}
                className="flex items-center gap-1 text-xs font-heading text-accent-fire hover:text-accent-fire/80 transition-colors py-1 px-2 rounded-lg hover:bg-accent-fire/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                + Station
              </button>
            )}
          </div>

          {block.stations.length === 0 ? (
            <button
              type="button"
              onClick={addStation}
              className="w-full py-6 border-2 border-dashed border-bg-border rounded-xl text-text-dim text-sm hover:border-accent-fire/30 hover:text-accent-fire transition-all"
            >
              + Add first station
            </button>
          ) : (
            <div className="space-y-3">
              {block.stations.map((station, idx) => (
                <StationCard
                  key={station.localId}
                  station={station}
                  index={idx}
                  onChange={(changes) => updateStation(station.localId, changes)}
                  onRemove={() => removeStation(station.localId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coach & Skills — collapsible, optional */}
        <div className="border-t border-bg-border pt-4">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between text-left group"
          >
            <span className="text-xs font-semibold text-text-dim uppercase tracking-wider group-hover:text-text-muted transition-colors">
              Skills
              {block.core_skills.length > 0 && (
                <span className="ml-2 text-accent-fire/70 normal-case tracking-normal font-normal">
                  {block.core_skills.length} skill{block.core_skills.length !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 text-text-dim transition-transform flex-shrink-0 ${showDetails ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4">
              {/* Core skills */}
              <div>
                <label className="field-label">Core Skills</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableSkills.map((skill) => (
                    <SkillChip
                      key={skill}
                      skill={skill}
                      selected={block.core_skills.includes(skill)}
                      onToggle={toggleSkill}
                    />
                  ))}

                  {addingSkill ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        ref={newSkillInputRef}
                        type="text"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddSkill() }
                          if (e.key === 'Escape') { setAddingSkill(false); setNewSkillName('') }
                        }}
                        placeholder="Skill name..."
                        className="px-2.5 py-1 bg-bg-card border border-bg-border rounded-full text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-green w-32"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        disabled={!newSkillName.trim() || addSkillSaving}
                        className="px-2.5 py-1 bg-accent-green text-white text-xs font-heading rounded-full disabled:opacity-50"
                      >
                        {addSkillSaving ? '…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingSkill(false); setNewSkillName(''); setAddSkillError(null) }}
                        className="text-text-dim hover:text-text-primary transition-colors"
                        aria-label="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openAddSkill}
                      className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-accent-green/40 rounded-full text-xs text-accent-green hover:bg-accent-green/10 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      New Skill
                    </button>
                  )}
                </div>
                {addSkillError && (
                  <p className="text-xs text-red-400 mt-1">{addSkillError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lane video recording */}
        <div className="border-t border-bg-border pt-4">
          <label className="field-label mb-2">
            Course Video{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional)
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
