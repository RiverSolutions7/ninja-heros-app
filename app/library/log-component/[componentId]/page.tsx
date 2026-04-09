'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import VideoCapture from '@/app/components/block-builder/VideoCapture'

interface PhotoDraft {
  localId: string
  file: File
  preview: string
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

function getInitialSections(component: ComponentRow): SectionKey[] {
  const s: SectionKey[] = []
  if (component.type === 'station' && component.equipment) s.push('lanename')
  if ((component.photos?.length ?? 0) > 0) s.push('photo')
  if (component.video_url) s.push('video')
  if (component.video_link) s.push('videolink')
  if (component.description) s.push('description')
  if (component.duration_minutes != null) s.push('duration')
  if ((component.skills?.length ?? 0) > 0) s.push('skills')
  return s
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30]

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function EditComponentPage() {
  const router = useRouter()
  const params = useParams<{ componentId: string }>()
  const componentId = params.componentId

  const [loading, setLoading] = useState(true)
  const [component, setComponent] = useState<ComponentRow | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [curriculum, setCurriculum] = useState('')
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<PhotoDraft[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [duration_minutes, setDurationMinutes] = useState<number | null>(null)
  const [lane_name, setLaneName] = useState('')
  const [video_link, setVideoLink] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

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
  const newSkillInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  // Load component
  useEffect(() => {
    supabase.from('components').select('*').eq('id', componentId).single().then(({ data, error: err }) => {
      if (err || !data) { setLoading(false); return }
      const c = data as ComponentRow
      setComponent(c)
      setTitle(c.title)
      setCurriculum(c.curriculum ?? '')
      setDescription(c.description ?? '')
      setSkills(c.skills ?? [])
      setExistingPhotos(c.photos ?? [])
      setDurationMinutes(c.duration_minutes)
      setLaneName(c.equipment ?? '')
      setVideoLink(c.video_link ?? '')
      setVideoPreview(c.video_url ?? null)
      setActiveSections(getInitialSections(c))
      setLoading(false)
    })
  }, [componentId])

  // Load curriculums
  useEffect(() => {
    supabase.from('curriculums').select('*').order('sort_order').order('created_at').then(({ data }) => {
      setCurriculums((data as CurriculumRow[]) ?? [])
    })
  }, [])

  // Load skills when curriculum changes
  useEffect(() => {
    if (!curriculum) return
    supabase.from('skills').select('name').eq('age_group', curriculum).order('name').then(({ data }) => {
      setAvailableSkills(data?.map((r) => r.name) ?? [])
    })
  }, [curriculum])

  function addSection(key: SectionKey) {
    setActiveSections((prev) => [...prev, key])
    setMenuOpen(false)
  }

  function removeSection(key: SectionKey) {
    setActiveSections((prev) => prev.filter((k) => k !== key))
    switch (key) {
      case 'description': setDescription(''); break
      case 'videolink': setVideoLink(''); break
      case 'video': setVideoFile(null); setVideoPreview(null); break
      case 'photo': setNewPhotos([]); setExistingPhotos([]); break
      case 'duration': setDurationMinutes(null); break
      case 'skills': setSkills([]); break
      case 'lanename': setLaneName(''); break
    }
  }

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  async function handleAddSkill() {
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    setAddSkillSaving(true)
    setAddSkillError(null)
    const { error: err } = await supabase.from('skills').insert({ name: trimmed, age_group: curriculum })
    if (err && err.code !== '23505') {
      setAddSkillError(err.message)
      setAddSkillSaving(false)
      return
    }
    setAvailableSkills((prev) => prev.includes(trimmed) ? prev : [...prev, trimmed].sort())
    if (!skills.includes(trimmed)) setSkills((prev) => [...prev, trimmed])
    setNewSkillName('')
    setAddingSkill(false)
    setAddSkillSaving(false)
  }

  function handleFileAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setNewPhotos((prev) => [...prev, { localId: crypto.randomUUID(), file, preview }])
    e.target.value = ''
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((prev) => prev.filter((u) => u !== url))
  }

  function removeNewPhoto(localId: string) {
    setNewPhotos((prev) => prev.filter((p) => p.localId !== localId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)

    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }

    setSubmitting(true)

    try {
      const uploadedPhotoUrls: string[] = []
      for (const photo of newPhotos) {
        try {
          const url = await uploadStationPhoto(photo.file)
          uploadedPhotoUrls.push(url)
        } catch (err) {
          console.error('Photo upload failed:', err)
        }
      }

      let videoUrl: string | null = component?.video_url ?? null
      if (videoFile) {
        try {
          videoUrl = await uploadComponentVideo(videoFile)
        } catch (err) {
          console.error('Video upload failed:', err)
        }
      } else if (!activeSections.includes('video')) {
        videoUrl = null
      }

      const allPhotos = [...existingPhotos, ...uploadedPhotoUrls]

      const { error: updateErr } = await supabase.from('components').update({
        title: title.trim(),
        curriculum: curriculum || null,
        description: description.trim() || null,
        equipment: component?.type === 'station' ? (lane_name.trim() || null) : null,
        skills: skills.length > 0 ? skills : null,
        photos: allPhotos.length > 0 ? allPhotos : null,
        duration_minutes,
        video_link: video_link.trim() || null,
        video_url: videoUrl,
      }).eq('id', componentId)

      if (updateErr) throw updateErr

      router.push('/library?view=components')
    } catch (err) {
      console.error('Save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!component) {
    return (
      <div className="text-center py-20">
        <p className="text-text-dim">Component not found.</p>
        <Link href="/library?view=components" className="text-accent-fire text-sm mt-2 inline-block">
          Back to Library
        </Link>
      </div>
    )
  }

  const accentBorder =
    component.type === 'game' ? 'border-accent-green' :
    component.type === 'warmup' ? 'border-accent-gold' : 'border-accent-blue'

  const accentText =
    component.type === 'game' ? 'text-accent-green' :
    component.type === 'warmup' ? 'text-accent-gold' : 'text-accent-blue'

  const accentGradient =
    component.type === 'game' ? 'from-accent-green/[0.12]' :
    component.type === 'warmup' ? 'from-accent-gold/[0.12]' : 'from-accent-blue/[0.12]'

  const typeLabel =
    component.type === 'game' ? 'Game' :
    component.type === 'warmup' ? 'Warmup' : 'Station / Drill'

  const availableSectionKeys = sectionsForType(component.type)
  const availableOptions = ALL_SECTIONS.filter(
    (o) => availableSectionKeys.includes(o.key) && !activeSections.includes(o.key)
  )

  function SectionHeader({ label, sectionKey }: { label: string; sectionKey: SectionKey }) {
    return (
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">{label}</span>
        <button type="button" onClick={() => removeSection(sectionKey)} className="text-text-dim hover:text-red-400 transition-colors p-1 rounded">
          <XIcon />
        </button>
      </div>
    )
  }

  const allPhotos = [
    ...existingPhotos.map((url) => ({ type: 'existing' as const, url })),
    ...newPhotos.map((p) => ({ type: 'new' as const, localId: p.localId, url: p.preview })),
  ]

  return (
    <form onSubmit={handleSubmit}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <Link
          href="/library?view=components"
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-xl text-text-primary leading-none">Edit {typeLabel}</h1>
          <p className="text-text-dim text-xs mt-0.5">Just Tumble Ninja H.E.R.O.S.</p>
        </div>
      </div>

      {/* Main card */}
      <div className={`card border-l-4 ${accentBorder} mb-5`}>
        <div className={`flex items-center px-4 py-3 bg-gradient-to-r ${accentGradient} to-transparent border-b border-bg-border rounded-t-2xl`}>
          <span className={`font-heading ${accentText} text-sm tracking-wide uppercase`}>{typeLabel}</span>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="field-label" htmlFor="title">
              {component.type === 'game' ? 'Game Name' : 'Title'}
              <span className="text-accent-fire ml-0.5">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
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
                value={curriculum}
                onChange={(e) => { setCurriculum(e.target.value); setSkills([]) }}
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
                <input type="text" value={lane_name} onChange={(e) => setLaneName(e.target.value)} placeholder="e.g. Station 1, Blue Station..." className="field-input" />
              </div>
            )

            if (key === 'photo') return (
              <div key="photo">
                <SectionHeader label="Photo" sectionKey="photo" />
                {allPhotos.length > 0 && (
                  <div className="flex overflow-x-auto gap-2 pb-1 mb-2" style={{ scrollSnapType: 'x mandatory' }}>
                    {allPhotos.map((p) => (
                      <div key={p.type === 'existing' ? p.url : p.localId} className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ scrollSnapAlign: 'start', width: '100%' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="photo" className="w-full object-cover rounded-xl" style={{ maxHeight: '200px' }} />
                        <button
                          type="button"
                          onClick={() => p.type === 'existing' ? removeExistingPhoto(p.url) : removeNewPhoto(p.localId!)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                        >
                          <XIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors py-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </button>
                  <button type="button" onClick={() => libraryRef.current?.click()} className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-1.5">
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
                  preview={videoPreview}
                  onFileSelected={(file, preview) => { setVideoFile(file); setVideoPreview(preview) }}
                />
              </div>
            )

            if (key === 'videolink') return (
              <div key="videolink">
                <SectionHeader label="Video Link" sectionKey="videolink" />
                <input type="url" value={video_link} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://..." className="field-input" inputMode="url" />
              </div>
            )

            if (key === 'description') return (
              <div key="description">
                <SectionHeader label="Description" sectionKey="description" />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    component.type === 'game' ? 'Rules, setup, how to play...' :
                    component.type === 'warmup' ? 'Exercise sequence, timing, cues...' :
                    'What does the kid do? Any coaching tips?'
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
                    value={duration_minutes ?? ''}
                    onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
                    className="field-select pr-8"
                  >
                    <option value="">Select duration</option>
                    {DURATIONS.map((n) => <option key={n} value={n}>{n} min</option>)}
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
                    <SkillChip key={skill} skill={skill} selected={skills.includes(skill)} onToggle={toggleSkill} />
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
                      <button type="button" onClick={handleAddSkill} disabled={!newSkillName.trim() || addSkillSaving} className="px-2.5 py-1 bg-accent-green text-white text-xs font-heading rounded-full disabled:opacity-50">
                        {addSkillSaving ? '…' : 'Add'}
                      </button>
                      <button type="button" onClick={() => { setAddingSkill(false); setNewSkillName(''); setAddSkillError(null) }} className="text-text-dim hover:text-text-primary transition-colors p-1">
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

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>
      )}

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
            Save Changes
          </>
        )}
      </button>

      <div className="h-4" />
    </form>
  )
}
