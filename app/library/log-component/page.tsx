'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'

interface PhotoDraft {
  localId: string
  file: File
  preview: string
}

interface ComponentDraft {
  title: string
  curriculum: string
  description: string
  skills: string[]
  photos: PhotoDraft[]
  duration_minutes: number | null
  equipment: string
}

const EMPTY_DRAFT: ComponentDraft = {
  title: '',
  curriculum: '',
  description: '',
  skills: [],
  photos: [],
  duration_minutes: null,
  equipment: '',
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function LogComponentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'choose' | 'form'>('choose')
  const [componentType, setComponentType] = useState<ComponentType | null>(null)
  const [draft, setDraft] = useState<ComponentDraft>(EMPTY_DRAFT)
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const newSkillInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  // Fetch curriculums once
  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        const rows = (data as CurriculumRow[]) ?? []
        setCurriculums(rows)
        if (rows.length > 0) {
          setDraft((d) => ({ ...d, curriculum: rows[0].age_group }))
        }
      })
  }, [])

  // Fetch skills when curriculum changes
  useEffect(() => {
    if (!draft.curriculum) return
    supabase
      .from('skills')
      .select('name')
      .eq('age_group', draft.curriculum)
      .order('name')
      .then(({ data }) => {
        setAvailableSkills(data?.map((r) => r.name) ?? [])
      })
  }, [draft.curriculum])

  function chooseType(type: ComponentType) {
    setComponentType(type)
    setStep('form')
  }

  function toggleSkill(skill: string) {
    setDraft((d) => ({
      ...d,
      skills: d.skills.includes(skill)
        ? d.skills.filter((s) => s !== skill)
        : [...d.skills, skill],
    }))
  }

  async function handleAddSkill() {
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    setAddSkillSaving(true)
    setAddSkillError(null)
    const { error: err } = await supabase
      .from('skills')
      .insert({ name: trimmed, age_group: draft.curriculum })
    if (err && err.code !== '23505') {
      setAddSkillError(err.message)
      setAddSkillSaving(false)
      return
    }
    setAvailableSkills((prev) =>
      prev.includes(trimmed) ? prev : [...prev, trimmed].sort()
    )
    if (!draft.skills.includes(trimmed)) {
      setDraft((d) => ({ ...d, skills: [...d.skills, trimmed] }))
    }
    setNewSkillName('')
    setAddingSkill(false)
    setAddSkillSaving(false)
  }

  function handleFileAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setDraft((d) => ({
      ...d,
      photos: [...d.photos, { localId: crypto.randomUUID(), file, preview }],
    }))
    e.target.value = ''
  }

  function removePhoto(localId: string) {
    setDraft((d) => ({
      ...d,
      photos: d.photos.filter((p) => p.localId !== localId),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)

    if (!draft.title.trim()) {
      setTitleError('Title is required')
      return
    }

    setSubmitting(true)

    try {
      // Upload photos
      const photoUrls: string[] = []
      for (const photo of draft.photos) {
        try {
          const url = await uploadStationPhoto(photo.file)
          photoUrls.push(url)
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr)
        }
      }

      const { error: insertErr } = await supabase.from('components').insert({
        type: componentType,
        title: draft.title.trim(),
        curriculum: draft.curriculum || null,
        description: draft.description.trim() || null,
        equipment: componentType === 'station' ? (draft.equipment.trim() || null) : null,
        skills: draft.skills.length > 0 ? draft.skills : null,
        photos: photoUrls.length > 0 ? photoUrls : null,
        duration_minutes: draft.duration_minutes,
      })

      if (insertErr) throw insertErr

      router.push('/library?view=components')
    } catch (err) {
      console.error('Save failed:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to save. Please try again.'
      )
      setSubmitting(false)
    }
  }

  // ── Type picker ──────────────────────────────────────────────

  if (step === 'choose') {
    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-2">
          <Link
            href="/library?view=components"
            className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-heading text-xl text-text-primary leading-none">Log Component</h1>
            <p className="text-text-dim text-xs mt-0.5">What are you logging?</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => chooseType('game')}
            className="w-full card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all border-l-4 border-l-accent-green hover:bg-white/[0.03]"
          >
            <span className="text-3xl">🎮</span>
            <div>
              <p className="font-heading text-text-primary text-base">Game</p>
              <p className="text-text-dim text-sm mt-0.5">Tag games, obstacle challenges, team activities</p>
            </div>
            <svg className="w-5 h-5 text-text-dim ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => chooseType('warmup')}
            className="w-full card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all border-l-4 border-l-accent-gold hover:bg-white/[0.03]"
          >
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-heading text-text-primary text-base">Warmup</p>
              <p className="text-text-dim text-sm mt-0.5">Dynamic warmups, stretches, movement prep</p>
            </div>
            <svg className="w-5 h-5 text-text-dim ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => chooseType('station')}
            className="w-full card p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-all border-l-4 border-l-accent-blue hover:bg-white/[0.03]"
          >
            <span className="text-3xl">🏃</span>
            <div>
              <p className="font-heading text-text-primary text-base">Station / Drill</p>
              <p className="text-text-dim text-sm mt-0.5">Individual stations, skill drills, obstacle setups</p>
            </div>
            <svg className="w-5 h-5 text-text-dim ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────

  const accentColor =
    componentType === 'game'
      ? 'border-l-accent-green'
      : componentType === 'warmup'
        ? 'border-l-accent-gold'
        : 'border-l-accent-blue'

  const typeLabel =
    componentType === 'game'
      ? '🎮 Game'
      : componentType === 'warmup'
        ? '🔥 Warmup'
        : '🏃 Station / Drill'

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          type="button"
          onClick={() => { setStep('choose'); setDraft(EMPTY_DRAFT); setError(null); setTitleError(null) }}
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-heading text-xl text-text-primary leading-none">Log {typeLabel}</h1>
          <p className="text-text-dim text-xs mt-0.5">Just Tumble Ninja H.E.R.O.S.</p>
        </div>
      </div>

      {/* Main fields */}
      <div className={`card p-4 mb-5 space-y-4 border-l-4 ${accentColor}`}>

        {/* Title */}
        <div>
          <label className="field-label" htmlFor="title">
            Title<span className="text-accent-fire ml-0.5">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={draft.title}
            onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setTitleError(null) }}
            placeholder={
              componentType === 'game'
                ? 'e.g. Cube Game, Ninja Tag, Freeze Tag...'
                : componentType === 'warmup'
                  ? 'e.g. Dynamic Stretching, Bear Crawl Circuit...'
                  : 'e.g. Box Jump Progression, Balance Beam Walk...'
            }
            className="field-input"
          />
          {titleError && <p className="text-accent-fire text-xs mt-1">{titleError}</p>}
        </div>

        {/* Curriculum */}
        <div>
          <label className="field-label" htmlFor="curriculum">Curriculum</label>
          <div className="relative">
            <select
              id="curriculum"
              value={draft.curriculum}
              onChange={(e) => setDraft((d) => ({ ...d, curriculum: e.target.value, skills: [] }))}
              className="field-select pr-8"
            >
              {curriculums.map((c) => (
                <option key={c.id} value={c.age_group}>{c.label}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Duration — required for warmup, optional for station */}
        {(componentType === 'warmup' || componentType === 'station') && (
          <div>
            <label className="field-label" htmlFor="duration">
              Duration{componentType === 'station' && (
                <span className="text-text-dim font-normal normal-case tracking-normal"> (optional)</span>
              )}
            </label>
            <div className="relative">
              <select
                id="duration"
                value={draft.duration_minutes ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, duration_minutes: e.target.value ? Number(e.target.value) : null }))
                }
                className="field-select pr-8"
              >
                {componentType === 'station' && <option value="">No duration</option>}
                {DURATIONS.map((n) => (
                  <option key={n} value={n}>{n} min</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Equipment — station only */}
        {componentType === 'station' && (
          <div>
            <label className="field-label" htmlFor="equipment">Equipment</label>
            <input
              id="equipment"
              type="text"
              value={draft.equipment}
              onChange={(e) => setDraft((d) => ({ ...d, equipment: e.target.value }))}
              placeholder="e.g. Balance beam, foam blocks, rope..."
              className="field-input"
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="field-label" htmlFor="description">
            {componentType === 'game'
              ? 'How it works'
              : componentType === 'warmup'
                ? 'What exercises / how it runs'
                : 'Description / Coaching Cue'}
            <span className="text-text-dim font-normal normal-case tracking-normal"> (optional)</span>
          </label>
          <textarea
            id="description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder={
              componentType === 'game'
                ? 'Rules, setup, how to play...'
                : componentType === 'warmup'
                  ? 'Exercise sequence, timing, cues...'
                  : 'What does the kid do? Any coaching tips?'
            }
            rows={3}
            className="field-textarea"
          />
        </div>
      </div>

      {/* Skills */}
      <div className="card p-4 mb-5">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider mb-3">
          Skills
          {draft.skills.length > 0 && (
            <span className="ml-2 text-accent-green/80 normal-case tracking-normal font-normal text-xs">
              {draft.skills.length} selected
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          {availableSkills.map((skill) => (
            <SkillChip
              key={skill}
              skill={skill}
              selected={draft.skills.includes(skill)}
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
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingSkill(true)
                setNewSkillName('')
                setTimeout(() => newSkillInputRef.current?.focus(), 50)
              }}
              className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-accent-green/40 rounded-full text-xs text-accent-green hover:bg-accent-green/10 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Skill
            </button>
          )}
        </div>
        {addSkillError && <p className="text-xs text-red-400 mt-2">{addSkillError}</p>}
      </div>

      {/* Photos */}
      <div className="card p-4 mb-5">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider mb-3">
          Photos
          <span className="ml-2 text-text-dim font-normal normal-case tracking-normal text-xs">(optional)</span>
        </h2>

        {draft.photos.length > 0 && (
          <div
            className="flex overflow-x-auto gap-2 pb-2 mb-3"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {draft.photos.map((photo) => (
              <div
                key={photo.localId}
                className="relative flex-shrink-0 rounded-xl overflow-hidden"
                style={{ scrollSnapAlign: 'start', width: '100%' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt="Component photo"
                  className="w-full object-cover rounded-xl"
                  style={{ maxHeight: '220px' }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.localId)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

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

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileAdded} className="hidden" />
        <input ref={libraryRef} type="file" accept="image/*" onChange={handleFileAdded} className="hidden" />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-accent-fire text-white font-heading text-base rounded-xl active:scale-95 transition-all shadow-lg shadow-accent-fire/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[56px]"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save Component
          </>
        )}
      </button>

      <div className="h-4" />
    </form>
  )
}
