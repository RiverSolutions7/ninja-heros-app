'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface SkillPickerModalProps {
  availableSkills: string[]
  selectedSkills: string[]
  ageGroup: string
  onToggle: (skill: string) => void
  onAddSkill: (name: string) => void
  onClose: () => void
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/\s+/g, '')
  const nb = b.toLowerCase().replace(/\s+/g, '')
  if (na === nb) return true
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return true
  // Simple edit distance check — within 2 chars
  if (Math.abs(na.length - nb.length) > 2) return false
  let diffs = 0
  const longer = na.length >= nb.length ? na : nb
  const shorter = na.length < nb.length ? na : nb
  for (let i = 0; i < longer.length; i++) {
    if (shorter[i] !== longer[i]) diffs++
    if (diffs > 2) return false
  }
  return true
}

export default function SkillPickerModal({
  availableSkills,
  selectedSkills,
  ageGroup,
  onToggle,
  onAddSkill,
  onClose,
}: SkillPickerModalProps) {
  const [search, setSearch] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const filtered = search
    ? availableSkills.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : availableSkills

  function handleNewSkillInput(value: string) {
    setNewSkillName(value)
    setDuplicateWarning(null)
    setError(null)
    if (value.trim()) {
      const match = availableSkills.find((s) => fuzzyMatch(s, value.trim()))
      if (match && match.toLowerCase() !== value.trim().toLowerCase()) {
        setDuplicateWarning(`Similar skill exists: "${match}"`)
      } else if (match) {
        setDuplicateWarning(`"${match}" already exists — tap it above to select`)
      }
    }
  }

  async function handleAddNew() {
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    const { error: dbError } = await supabase.from('skills').insert({ name: trimmed, age_group: ageGroup })
    if (dbError && dbError.code !== '23505') {
      setError(dbError.message)
      setSaving(false)
      return
    }
    onAddSkill(trimmed)
    if (!selectedSkills.includes(trimmed)) {
      onToggle(trimmed)
    }
    setNewSkillName('')
    setDuplicateWarning(null)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md max-h-[85vh] bg-bg-card rounded-t-2xl sm:rounded-2xl border border-bg-border flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border flex-shrink-0">
          <h3 className="font-heading text-base text-text-primary">Select Skills</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text-primary transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-bg-border flex-shrink-0">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full px-3 py-2 bg-bg-primary border border-bg-border rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-green"
          />
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {filtered.length === 0 && (
            <p className="text-sm text-text-dim text-center py-4">
              {search ? 'No matching skills' : 'No skills available'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {filtered.map((skill) => {
              const isSelected = selectedSkills.includes(skill)
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => onToggle(skill)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all',
                    isSelected
                      ? 'bg-accent-green/20 border border-accent-green/40 text-accent-green'
                      : 'bg-bg-primary border border-bg-border text-text-muted hover:border-accent-green/30',
                  ].join(' ')}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {skill}
                </button>
              )
            })}
          </div>
        </div>

        {/* Add new skill */}
        <div className="px-4 py-3 border-t border-bg-border flex-shrink-0">
          <p className="text-xs text-text-dim uppercase tracking-wider font-semibold mb-2">Add New Skill</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => handleNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAddNew() }
              }}
              placeholder="Skill name..."
              className="flex-1 px-3 py-2 bg-bg-primary border border-bg-border rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-green"
            />
            <button
              type="button"
              onClick={handleAddNew}
              disabled={!newSkillName.trim() || saving}
              className="px-4 py-2 bg-accent-green text-white text-sm font-heading rounded-xl disabled:opacity-50 active:scale-95 transition-all"
            >
              {saving ? '...' : 'Add'}
            </button>
          </div>
          {duplicateWarning && (
            <p className="text-xs text-accent-gold mt-1.5">{duplicateWarning}</p>
          )}
          {error && (
            <p className="text-xs text-red-400 mt-1.5">{error}</p>
          )}
        </div>

        {/* Done button */}
        <div className="px-4 py-3 border-t border-bg-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-accent-fire text-white font-heading text-sm px-4 py-3 rounded-xl active:scale-95 transition-all min-h-[44px]"
          >
            Done ({selectedSkills.length} selected)
          </button>
        </div>
      </div>
    </div>
  )
}
