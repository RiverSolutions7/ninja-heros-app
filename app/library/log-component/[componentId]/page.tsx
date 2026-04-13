'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

interface PhotoDraft {
  localId: string
  file: File
  preview: string
}

type PhotoEntry =
  | { key: string; url: string; isNew: false }
  | { key: string; url: string; isNew: true; localId: string }

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-bg-border" />
      <span className="text-[11px] font-heading uppercase tracking-wider text-text-dim">{label}</span>
      <div className="flex-1 h-px bg-bg-border" />
    </div>
  )
}

const TYPE_ACCENT: Record<ComponentType, { badge: string }> = {
  game:    { badge: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  warmup:  { badge: 'bg-accent-gold/10 text-accent-gold border-accent-gold/20' },
  station: { badge: 'bg-accent-fire/10 text-accent-fire border-accent-fire/20' },
}

const TYPE_LABELS: Record<ComponentType, string> = {
  game:    'Game',
  warmup:  'Warmup',
  station: 'Station / Drill',
}

const TYPE_PLACEHOLDERS: Record<ComponentType, { name: string; desc: string }> = {
  game:    { name: 'e.g. Cube Game, Ninja Tag…',     desc: 'Rules, setup, how to play…' },
  warmup:  { name: 'e.g. Bear Crawl Circuit…',       desc: 'Exercise sequence, timing, cues…' },
  station: { name: 'e.g. Box Jump Progression…',     desc: 'What does the kid do? Any coaching tips?' },
}

const MIC_IDLE_LABEL      = 'Tap to re-name and describe this component'
const MIC_RECORDING_LABEL = 'Listening… tap again to stop'
const MIC_PROCESSING_LABEL = 'Processing…'
const MIC_DONE_LABEL      = 'Name and description updated ✓'

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

  // Optional video link only
  const [showVideoLink, setShowVideoLink] = useState(false)
  const [videoLink, setVideoLink] = useState('')

  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const newSkillInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  const {
    voiceState,
    transcript,
    errorMessage: voiceError,
    isSupported: voiceSupported,
    startRecording,
    stopRecording,
    parseComponent,
    reset: resetVoice,
  } = useVoiceNote()

  const micColors: Record<string, string> = {
    idle:       'bg-bg-card border-2 border-bg-border text-text-muted hover:border-accent-fire/40 hover:text-accent-fire',
    recording:  'bg-accent-fire text-white shadow-glow-fire',
    processing: 'bg-bg-card border-2 border-bg-border text-text-dim',
    done:       'bg-accent-green/15 border-2 border-accent-green/50 text-accent-green',
    error:      'bg-red-900/20 border-2 border-red-500/40 text-red-400',
  }

  async function handleMicToggle() {
    if (voiceState === 'idle' || voiceState === 'error' || voiceState === 'done') {
      resetVoice()
      startRecording()
    } else if (voiceState === 'recording' && component) {
      stopRecording()
      const result = await parseComponent(component.type)
      if (result.title) { setTitle(result.title); setTitleError(null) }
      if (result.description) setDescription(result.description)
    }
  }

  // Load component
  useEffect(() => {
    supabase
      .from('components')
      .select('*')
      .eq('id', componentId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) { setLoading(false); return }
        const c = data as ComponentRow
        setComponent(c)
        setTitle(c.title)
        setCurriculum(c.curriculum ?? '')
        setDescription(c.description ?? '')
        setSkills(c.skills ?? [])
        setExistingPhotos(c.photos ?? [])
        setVideoLink(c.video_link ?? '')
        setShowVideoLink(!!c.video_link)
        setLoading(false)
      })
  }, [componentId])

  // Load curriculums
  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
  }, [])

  // Load skills when curriculum changes
  useEffect(() => {
    if (!curriculum) return
    supabase
      .from('skills')
      .select('name')
      .eq('age_group', curriculum)
      .order('name')
      .then(({ data }) => setAvailableSkills(data?.map((r) => r.name) ?? []))
  }, [curriculum])

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
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
    setAvailableSkills((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()))
    if (!skills.includes(trimmed)) setSkills((prev) => [...prev, trimmed])
    setNewSkillName('')
    setAddingSkill(false)
    setAddSkillSaving(false)
  }

  function handleFileAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhotos((prev) => [...prev, { localId: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }])
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)
    if (!title.trim()) { setTitleError('Title is required'); return }
    setSubmitting(true)
    try {
      const uploadedUrls: string[] = []
      for (const photo of newPhotos) {
        try { uploadedUrls.push(await uploadStationPhoto(photo.file)) } catch { /* skip */ }
      }

      const allPhotos = [...existingPhotos, ...uploadedUrls].filter((u) => !u.startsWith('blob:'))

      const { error: updateErr } = await supabase.from('components').update({
        title: title.trim(),
        curriculum: curriculum || null,
        description: description.trim() || null,
        skills: skills.length > 0 ? skills : null,
        photos: allPhotos,
        video_link: showVideoLink ? (videoLink.trim() || null) : null,
      }).eq('id', componentId)

      if (updateErr) throw updateErr
      router.push('/library?view=components')
    } catch (err) {
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

  const accent = TYPE_ACCENT[component.type]
  const typeLabel = TYPE_LABELS[component.type]
  const placeholders = TYPE_PLACEHOLDERS[component.type]

  const allPhotos: PhotoEntry[] = [
    ...existingPhotos.map((url): PhotoEntry => ({ key: url, url, isNew: false })),
    ...newPhotos.map((p): PhotoEntry => ({ key: p.localId, url: p.preview, isNew: true, localId: p.localId })),
  ]

  return (
    <form onSubmit={handleSubmit} className="pb-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <Link
          href="/library?view=components"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl text-text-primary leading-none truncate">{title || typeLabel}</h1>
          <p className="mt-1">
            <span className={`text-[10px] font-heading uppercase tracking-wide border rounded-full px-2 py-0.5 ${accent.badge}`}>
              {typeLabel}
            </span>
          </p>
        </div>
      </div>

      {/* ── MIC HERO ──────────────────────────────────────── */}
      <div className="flex flex-col items-center py-6 mb-2 rounded-2xl bg-bg-card border border-bg-border">
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={voiceState === 'processing'}
          className={[
            'w-20 h-20 flex items-center justify-center rounded-full transition-all duration-200 mb-4',
            micColors[voiceState],
            voiceState === 'recording' ? 'scale-105' : 'active:scale-95',
            voiceState === 'processing' ? 'cursor-not-allowed' : '',
          ].join(' ')}
          aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start voice recording'}
        >
          {voiceState === 'recording' ? (
            <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
            </svg>
          ) : voiceState === 'processing' ? (
            <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : voiceState === 'done' ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
            </svg>
          )}
        </button>

        <p className={`text-sm font-semibold text-center leading-snug ${
          voiceState === 'recording'  ? 'text-accent-fire animate-pulse' :
          voiceState === 'done'       ? 'text-accent-green' :
          voiceState === 'error'      ? 'text-red-400' :
          'text-text-muted'
        }`}>
          {voiceState === 'recording'  && MIC_RECORDING_LABEL}
          {voiceState === 'processing' && MIC_PROCESSING_LABEL}
          {voiceState === 'done'       && MIC_DONE_LABEL}
          {voiceState === 'error'      && (voiceError ?? 'Could not process. Try again.')}
          {voiceState === 'idle'       && (voiceSupported ? MIC_IDLE_LABEL : 'Edit the details below')}
        </p>

        {voiceState === 'recording' && transcript && (
          <p className="text-xs text-text-dim italic text-center mt-3 px-6 leading-relaxed max-w-xs">
            &ldquo;{transcript}&rdquo;
          </p>
        )}
      </div>

      {/* ── PHOTOS ────────────────────────────────────────── */}
      <SectionDivider label="Photos" />

      {allPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollSnapType: 'x mandatory' }}>
          {allPhotos.map((photo) => (
            <div
              key={photo.key}
              className="relative flex-shrink-0 rounded-xl overflow-hidden"
              style={{ scrollSnapAlign: 'start', width: 120, height: 90 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (photo.isNew) {
                    setNewPhotos((prev) => prev.filter((p) => p.localId !== photo.localId))
                  } else {
                    setExistingPhotos((prev) => prev.filter((u) => u !== photo.url))
                  }
                }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-accent-fire hover:text-accent-fire/80 transition-colors py-2 px-3 rounded-xl border border-accent-fire/30 hover:bg-accent-fire/5"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-2 px-3 rounded-xl border border-bg-border hover:bg-white/5"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          From Library
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileAdded} className="hidden" aria-label="Take photo" />
      <input ref={libraryRef} type="file" accept="image/*" onChange={handleFileAdded} className="hidden" aria-label="Choose from library" />

      {/* ── NAME ──────────────────────────────────────────── */}
      <SectionDivider label="Name" />

      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
        placeholder={placeholders.name}
        className="field-input text-base"
      />
      {titleError && <p className="text-accent-fire text-xs mt-1.5">{titleError}</p>}

      {/* ── DESCRIPTION ───────────────────────────────────── */}
      <SectionDivider label="Description" />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={placeholders.desc}
        rows={4}
        className="field-textarea resize-none leading-relaxed"
      />

      {/* ── CURRICULUM ────────────────────────────────────── */}
      {curriculums.length > 0 && (
        <>
          <SectionDivider label="Curriculum" />
          <div className="flex gap-2">
            {curriculums.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCurriculum(c.age_group); setSkills([]) }}
                className={`flex-1 py-2 rounded-full text-xs font-heading transition-all border ${
                  curriculum === c.age_group
                    ? 'bg-accent-fire/10 border-accent-fire/40 text-accent-fire'
                    : 'bg-bg-card border-bg-border text-text-dim hover:border-accent-fire/30 hover:text-text-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── SKILLS ────────────────────────────────────────── */}
      <SectionDivider label="Skills" />

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
              placeholder="Skill name…"
              className="px-2.5 py-1 bg-bg-card border border-bg-border rounded-full text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-green w-32"
              autoFocus
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
              className="text-text-dim hover:text-text-primary p-1"
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

      {/* ── OPTIONAL: Video Link ───────────────────────────── */}
      {!showVideoLink && (
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={() => setShowVideoLink(true)}
            className="flex items-center gap-1.5 text-xs text-text-dim border border-dashed border-bg-border rounded-full px-3 py-1.5 hover:border-text-dim/40 hover:text-text-muted transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Video Link
          </button>
        </div>
      )}

      {showVideoLink && (
        <>
          <SectionDivider label="Video Link" />
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="https://…"
              className="field-input flex-1"
              inputMode="url"
            />
            <button
              type="button"
              onClick={() => { setShowVideoLink(false); setVideoLink('') }}
              className="text-text-dim hover:text-red-400 transition-colors p-1.5"
            >
              <XIcon />
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Save button */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base py-4 rounded-2xl shadow-glow-fire active:scale-[0.98] transition-all min-h-[56px] disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
