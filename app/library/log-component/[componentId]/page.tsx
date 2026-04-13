'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import VideoCapture from '@/app/components/ui/VideoCapture'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

interface PhotoDraft {
  localId: string
  file: File
  preview: string
}

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

const TYPE_ACCENT: Record<ComponentType, { border: string; text: string; badge: string }> = {
  game: { border: 'border-l-accent-green', text: 'text-accent-green', badge: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  warmup: { border: 'border-l-accent-gold', text: 'text-accent-gold', badge: 'bg-accent-gold/10 text-accent-gold border-accent-gold/20' },
  station: { border: 'border-l-accent-fire', text: 'text-accent-fire', badge: 'bg-accent-fire/10 text-accent-fire border-accent-fire/20' },
}

const TYPE_LABELS: Record<ComponentType, string> = {
  game: 'Game',
  warmup: 'Warmup',
  station: 'Station / Drill',
}

const TYPE_PLACEHOLDERS: Record<ComponentType, string> = {
  game: 'Rules, setup, how to play…',
  warmup: 'Exercise sequence, timing, cues…',
  station: 'What does the kid do? Coaching tips?',
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
  const [equipmentName, setEquipmentName] = useState('')

  // Optional fields — shown if data exists OR user enables
  const [showDuration, setShowDuration] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [showVideoLink, setShowVideoLink] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
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
    parseNote,
    reset: resetVoice,
  } = useVoiceNote()

  async function handleMicToggle() {
    if (voiceState === 'idle' || voiceState === 'error' || voiceState === 'done') {
      resetVoice()
      startRecording()
    } else if (voiceState === 'recording') {
      stopRecording()
      if (transcript) setDescription(transcript)
      const structured = await parseNote()
      if (structured) setDescription(structured)
    }
  }

  const micColors: Record<string, string> = {
    idle: 'bg-bg-input border border-bg-border text-text-muted hover:bg-white/5',
    recording: 'bg-accent-fire text-white shadow-glow-fire',
    processing: 'bg-bg-input border border-bg-border text-text-dim',
    done: 'bg-accent-green/20 border border-accent-green/40 text-accent-green',
    error: 'bg-red-900/30 border border-red-500/40 text-red-400',
  }

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
      setEquipmentName(c.equipment ?? '')
      setDurationMinutes(c.duration_minutes)
      setShowDuration(c.duration_minutes != null)
      setVideoLink(c.video_link ?? '')
      setShowVideoLink(!!c.video_link)
      setVideoPreview(c.video_url ?? null)
      setShowVideo(!!c.video_url)
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

      let videoUrl: string | null = component?.video_url ?? null
      if (videoFile) {
        try { videoUrl = await uploadComponentVideo(videoFile) } catch { /* skip */ }
      } else if (!showVideo) {
        videoUrl = null
      }

      const allPhotos = [...existingPhotos, ...uploadedUrls].filter((u) => !u.startsWith('blob:'))

      const { error: updateErr } = await supabase.from('components').update({
        title: title.trim(),
        curriculum: curriculum || null,
        description: description.trim() || null,
        equipment: component?.type === 'station' ? (equipmentName.trim() || null) : null,
        skills: skills.length > 0 ? skills : null,
        photos: allPhotos,
        duration_minutes: showDuration ? durationMinutes : null,
        video_link: showVideoLink ? (videoLink.trim() || null) : null,
        video_url: videoUrl,
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
  const descPlaceholder = TYPE_PLACEHOLDERS[component.type]

  type PhotoEntry =
    | { key: string; url: string; isNew: false }
    | { key: string; url: string; isNew: true; localId: string }

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
          <h1 className="font-heading text-2xl text-text-primary leading-none truncate">{title || typeLabel}</h1>
          <p className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-heading uppercase tracking-wide border rounded-full px-2 py-0.5 ${accent.badge}`}>
              {typeLabel}
            </span>
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
          placeholder="Title"
          className={`field-input text-base border-l-4 ${accent.border}`}
        />
        {titleError && <p className="text-accent-fire text-xs mt-1">{titleError}</p>}
      </div>

      {/* Curriculum */}
      {curriculums.length > 1 && (
        <div className="flex gap-2 mb-1">
          {curriculums.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setCurriculum(c.age_group); setSkills([]) }}
              className={`flex-1 py-1.5 rounded-full text-xs font-heading transition-all border ${
                curriculum === c.age_group
                  ? 'bg-accent-fire/10 border-accent-fire/40 text-accent-fire'
                  : 'bg-bg-card border-bg-border text-text-dim hover:border-accent-fire/30 hover:text-text-muted'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* ── DESCRIPTION ───────────────────────────────────── */}
      <SectionDivider label="Description" />

      {/* Mic row */}
      <div className="flex items-center gap-3 mb-3">
        {voiceSupported && (
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={voiceState === 'processing'}
            className={[
              'w-11 h-11 flex items-center justify-center rounded-full transition-all flex-shrink-0',
              micColors[voiceState],
              voiceState === 'processing' ? 'cursor-not-allowed' : '',
            ].join(' ')}
            aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start voice recording'}
          >
            {voiceState === 'recording' ? (
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
              </svg>
            ) : voiceState === 'processing' ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : voiceState === 'done' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
              </svg>
            )}
          </button>
        )}
        <p className="text-sm text-text-dim leading-snug">
          {voiceState === 'recording' && <span className="text-accent-fire font-semibold animate-pulse">Listening… tap to stop</span>}
          {voiceState === 'processing' && <span>Processing…</span>}
          {voiceState === 'done' && <span className="text-accent-green font-semibold">Description formatted ✓</span>}
          {voiceState === 'error' && <span className="text-red-400">{voiceError}</span>}
          {voiceState === 'idle' && voiceSupported && <span>Tap mic to speak the description</span>}
          {!voiceSupported && <span>Type a description below</span>}
        </p>
      </div>

      {voiceState === 'recording' && transcript && (
        <p className="text-xs text-text-dim italic mb-3 px-1 leading-relaxed">&ldquo;{transcript}&rdquo;</p>
      )}

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={descPlaceholder}
        rows={4}
        className="field-textarea resize-none leading-relaxed"
      />

      {/* ── PHOTOS ────────────────────────────────────────── */}
      <SectionDivider label="Photos" />

      {allPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollSnapType: 'x mandatory' }}>
          {allPhotos.map((photo) => (
            <div
              key={photo.key}
              className="relative flex-shrink-0 rounded-xl overflow-hidden"
              style={{ scrollSnapAlign: 'start', width: 112, height: 84 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (photo.isNew && photo.localId) {
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
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileAdded} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*" onChange={handleFileAdded} className="hidden" />

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
            <button type="button" onClick={handleAddSkill} disabled={!newSkillName.trim() || addSkillSaving} className="px-2.5 py-1 bg-accent-green text-white text-xs font-heading rounded-full disabled:opacity-50">
              {addSkillSaving ? '…' : 'Add'}
            </button>
            <button type="button" onClick={() => { setAddingSkill(false); setNewSkillName(''); setAddSkillError(null) }} className="text-text-dim hover:text-text-primary p-1">
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

      {/* ── EQUIPMENT NAME (stations only) ────────────────── */}
      {component.type === 'station' && (
        <>
          <SectionDivider label="Equipment / Station" />
          <input
            type="text"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            placeholder="e.g. Station 1, Blue Lane, Vault Box…"
            className="field-input"
          />
        </>
      )}

      {/* ── OPTIONAL additions ─────────────────────────────── */}
      {(!showDuration || !showVideo || !showVideoLink) && (
        <div className="flex flex-wrap gap-2 mt-6">
          {!showDuration && (
            <button type="button" onClick={() => setShowDuration(true)} className="flex items-center gap-1.5 text-xs text-text-dim border border-dashed border-bg-border rounded-full px-3 py-1.5 hover:border-text-dim/40 hover:text-text-muted transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Duration
            </button>
          )}
          {!showVideo && (
            <button type="button" onClick={() => setShowVideo(true)} className="flex items-center gap-1.5 text-xs text-text-dim border border-dashed border-bg-border rounded-full px-3 py-1.5 hover:border-text-dim/40 hover:text-text-muted transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Video
            </button>
          )}
          {!showVideoLink && (
            <button type="button" onClick={() => setShowVideoLink(true)} className="flex items-center gap-1.5 text-xs text-text-dim border border-dashed border-bg-border rounded-full px-3 py-1.5 hover:border-text-dim/40 hover:text-text-muted transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Video Link
            </button>
          )}
        </div>
      )}

      {showDuration && (
        <>
          <SectionDivider label="Duration" />
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <select
                value={durationMinutes ?? ''}
                onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
                className="field-select pr-8 w-full"
              >
                <option value="">Select duration</option>
                {[1,2,3,4,5,6,7,8,9,10,15,20,30].map((n) => (
                  <option key={n} value={n}>{n} min</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <button type="button" onClick={() => { setShowDuration(false); setDurationMinutes(null) }} className="text-text-dim hover:text-red-400 transition-colors p-1.5">
              <XIcon />
            </button>
          </div>
        </>
      )}

      {showVideo && (
        <>
          <SectionDivider label="Video" />
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <VideoCapture
                preview={videoPreview}
                onFileSelected={(file, preview) => { setVideoFile(file); setVideoPreview(preview) }}
              />
            </div>
            <button type="button" onClick={() => { setShowVideo(false); setVideoFile(null); setVideoPreview(null) }} className="text-text-dim hover:text-red-400 transition-colors p-1.5 mt-1">
              <XIcon />
            </button>
          </div>
        </>
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
            <button type="button" onClick={() => { setShowVideoLink(false); setVideoLink('') }} className="text-text-dim hover:text-red-400 transition-colors p-1.5">
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
