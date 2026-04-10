'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import VideoCapture from '@/app/components/block-builder/VideoCapture'
import Toast from '@/app/components/ui/Toast'

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
  lane_name: string        // station only — saved to equipment column
  video_link: string
  videoFile: File | null
  videoPreview: string | null
}

const EMPTY_DRAFT: ComponentDraft = {
  title: '',
  curriculum: '',
  description: '',
  skills: [],
  photos: [],
  duration_minutes: null,
  lane_name: '',
  video_link: '',
  videoFile: null,
  videoPreview: null,
}

type SectionKey = 'lanename' | 'photo' | 'video' | 'videolink' | 'description' | 'duration' | 'skills'

const ALL_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'lanename', label: 'Station Name' },
  { key: 'photo', label: 'Photo' },
  { key: 'video', label: 'Video' },
  { key: 'videolink', label: 'Video Link' },
  { key: 'description', label: 'Description' },
  { key: 'duration', label: 'Duration' },
  { key: 'skills', label: 'Skills' },
]

function sectionsForType(type: ComponentType): SectionKey[] {
  if (type === 'station') return ['lanename', 'photo', 'video', 'videolink', 'description', 'duration', 'skills']
  return ['photo', 'video', 'videolink', 'description', 'duration', 'skills']
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30]

export default function LogComponentPage() {
  const router = useRouter()
  const [step, setStep] = useState<'choose' | 'form'>('choose')
  const [pendingType, setPendingType] = useState<ComponentType>('game')
  const [componentType, setComponentType] = useState<ComponentType | null>(null)
  const [draft, setDraft] = useState<ComponentDraft>(EMPTY_DRAFT)
  const [activeSections, setActiveSections] = useState<SectionKey[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const newSkillInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

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
    setActiveSections([])
    setStep('form')
  }

  function addSection(key: SectionKey) {
    setActiveSections((prev) => [...prev, key])
    setMenuOpen(false)
  }

  function removeSection(key: SectionKey) {
    setActiveSections((prev) => prev.filter((k) => k !== key))
    switch (key) {
      case 'description': setDraft((d) => ({ ...d, description: '' })); break
      case 'videolink': setDraft((d) => ({ ...d, video_link: '' })); break
      case 'video': setDraft((d) => ({ ...d, videoFile: null, videoPreview: null })); break
      case 'photo': setDraft((d) => ({ ...d, photos: [] })); break
      case 'duration': setDraft((d) => ({ ...d, duration_minutes: null })); break
      case 'skills': setDraft((d) => ({ ...d, skills: [] })); break
      case 'lanename': setDraft((d) => ({ ...d, lane_name: '' })); break
    }
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
      const photoUrls: string[] = []
      for (const photo of draft.photos) {
        try {
          const url = await uploadStationPhoto(photo.file)
          photoUrls.push(url)
        } catch (uploadErr) {
          console.error('Photo upload failed:', uploadErr)
        }
      }

      let videoUrl: string | null = null
      if (draft.videoFile) {
        try {
          videoUrl = await uploadComponentVideo(draft.videoFile)
        } catch (uploadErr) {
          console.error('Video upload failed:', uploadErr)
        }
      }

      const { error: insertErr } = await supabase.from('components').insert({
        type: componentType,
        title: draft.title.trim(),
        curriculum: draft.curriculum || null,
        description: draft.description.trim() || null,
        equipment: componentType === 'station' ? (draft.lane_name.trim() || null) : null,
        skills: draft.skills.length > 0 ? draft.skills : null,
        photos: photoUrls.filter((u) => !u.startsWith('blob:')),
        duration_minutes: draft.duration_minutes,
        video_link: draft.video_link.trim() || null,
        video_url: videoUrl,
      })

      if (insertErr) throw insertErr

      setToast({ message: 'Component saved ✓', type: 'success' })
      await new Promise((r) => setTimeout(r, 1500))
      router.push('/library?view=components')
    } catch (err) {
      console.error('Save failed:', err)
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' })
      setSubmitting(false)
    }
  }

  // ── Type picker ──────────────────────────────────────────────

  if (step === 'choose') {
    return (
      <div>
        <div className="relative flex items-center gap-3 mb-6 pt-2">
          <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
          <Link
            href="/library?view=components"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-heading text-2xl text-text-primary leading-none">Log Component</h1>
            <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
              Just Tumble · Ninja H.E.R.O.S.
            </p>
          </div>
        </div>

        <div className="flex bg-bg-card rounded-xl p-1 mb-6 border border-bg-border">
          {(['game', 'warmup', 'station'] as ComponentType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPendingType(type)}
              className={`flex-1 py-2 text-sm font-heading rounded-lg transition-all ${
                pendingType === type
                  ? 'bg-accent-fire text-white shadow-lg'
                  : 'text-text-dim hover:text-text-muted'
              }`}
            >
              {type === 'game' ? 'Game' : type === 'warmup' ? 'Warmup' : 'Station'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => chooseType(pendingType)}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[52px]"
        >
          Continue
        </button>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────

  const accentBorder =
    componentType === 'game'
      ? 'border-accent-green'
      : componentType === 'warmup'
        ? 'border-accent-gold'
        : 'border-accent-blue'

  const accentText =
    componentType === 'game'
      ? 'text-accent-green'
      : componentType === 'warmup'
        ? 'text-accent-gold'
        : 'text-accent-blue'

  const accentGradient =
    componentType === 'game'
      ? 'from-accent-green/[0.12]'
      : componentType === 'warmup'
        ? 'from-accent-gold/[0.12]'
        : 'from-accent-blue/[0.12]'

  const typeLabel =
    componentType === 'game'
      ? 'Game'
      : componentType === 'warmup'
        ? 'Warmup'
        : 'Station / Drill'

  const availableSectionKeys = sectionsForType(componentType!)
  const availableOptions = ALL_SECTIONS.filter(
    (o) => availableSectionKeys.includes(o.key) && !activeSections.includes(o.key)
  )

  function SectionHeader({ label, sectionKey }: { label: string; sectionKey: SectionKey }) {
    return (
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={() => removeSection(sectionKey)}
          className="text-text-dim hover:text-red-400 transition-colors p-1 rounded"
        >
          <XIcon />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Page header */}
      <div className="relative flex items-center gap-3 mb-6 pt-2">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <button
          type="button"
          onClick={() => { setStep('choose'); setDraft(EMPTY_DRAFT); setActiveSections([]); setError(null); setTitleError(null) }}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">Log {typeLabel}</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className={`card border-l-4 ${accentBorder} mb-5`}>
        {/* Card header */}
        <div className={`flex items-center px-4 py-3 bg-gradient-to-r ${accentGradient} to-transparent border-b border-bg-border rounded-t-2xl`}>
          <span className={`font-heading ${accentText} text-sm tracking-wide uppercase`}>
            {typeLabel}
          </span>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Title — always shown */}
          <div>
            <label className="field-label" htmlFor="title">
              {componentType === 'game' ? 'Game Name' : 'Title'}
              <span className="text-accent-fire ml-0.5">*</span>
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

          {/* Curriculum — always shown */}
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

          {/* Dynamic sections */}
          {activeSections.map((key) => {
            if (key === 'lanename') return (
              <div key="lanename">
                <SectionHeader label="Station Name" sectionKey="lanename" />
                <input
                  type="text"
                  value={draft.lane_name}
                  onChange={(e) => setDraft((d) => ({ ...d, lane_name: e.target.value }))}
                  placeholder="e.g. Lane 1, Blue Lane..."
                  className="field-input"
                />
              </div>
            )

            if (key === 'photo') return (
              <div key="photo">
                <SectionHeader label="Photo" sectionKey="photo" />
                {draft.photos.length > 0 && (
                  <div
                    className="flex overflow-x-auto gap-2 pb-1 mb-2"
                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
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
                          style={{ maxHeight: '200px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.localId)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4">
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
                    Library
                  </button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileAdded} className="hidden" />
                <input ref={libraryRef} type="file" accept="image/*" onChange={handleFileAdded} className="hidden" />
              </div>
            )

            if (key === 'video') return (
              <div key="video">
                <SectionHeader label="Video" sectionKey="video" />
                <VideoCapture
                  preview={draft.videoPreview}
                  onFileSelected={(file, preview) => setDraft((d) => ({ ...d, videoFile: file, videoPreview: preview }))}
                />
              </div>
            )

            if (key === 'videolink') return (
              <div key="videolink">
                <SectionHeader label="Video Link" sectionKey="videolink" />
                <input
                  type="url"
                  value={draft.video_link}
                  onChange={(e) => setDraft((d) => ({ ...d, video_link: e.target.value }))}
                  placeholder="https://..."
                  className="field-input"
                  inputMode="url"
                />
              </div>
            )

            if (key === 'description') return (
              <div key="description">
                <SectionHeader label="Description" sectionKey="description" />
                <textarea
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
            )

            if (key === 'duration') return (
              <div key="duration">
                <SectionHeader label="Duration" sectionKey="duration" />
                <div className="relative">
                  <select
                    value={draft.duration_minutes ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, duration_minutes: e.target.value ? Number(e.target.value) : null }))
                    }
                    className="field-select pr-8"
                  >
                    <option value="">Select duration</option>
                    {DURATIONS.map((n) => (
                      <option key={n} value={n}>{n} min</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )

            if (key === 'skills') return (
              <div key="skills">
                <SectionHeader label="Skills" sectionKey="skills" />
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
                        className="text-text-dim hover:text-text-primary transition-colors p-1"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingSkill(true); setTimeout(() => newSkillInputRef.current?.focus(), 50) }}
                      className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-accent-green/40 rounded-full text-xs text-accent-green hover:bg-accent-green/10 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      New Skill
                    </button>
                  )}
                </div>
                {addSkillError && <p className="text-xs text-red-400 mt-1">{addSkillError}</p>}
              </div>
            )

            return null
          })}

          {/* + Add button */}
          {availableOptions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 w-full justify-center text-sm text-text-dim hover:text-text-primary py-2 px-3 border border-dashed border-bg-border hover:border-text-dim/30 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-card border border-bg-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {availableOptions.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => addSection(o.key)}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-left"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </form>
  )
}
