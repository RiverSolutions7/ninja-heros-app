'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import { randomId } from '@/app/lib/uuid'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import MediaStrip, { type MediaItem } from '@/app/components/ui/MediaStrip'
import MediaAddSheet from '@/app/components/ui/MediaAddSheet'
import Button from '@/app/components/ui/Button'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import { useUnsavedGuard } from '@/app/hooks/useUnsavedGuard'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SectionLabel({ label, className = '' }: { label: string; className?: string }) {
  return (
    <p className={['section-label mt-7 mb-2', className].join(' ')}>
      {label}
    </p>
  )
}

const TYPE_ACCENT: Record<ComponentType, { typeText: string }> = {
  game:    { typeText: 'text-accent-green' },
  station: { typeText: 'text-accent-blue' },
}

const TYPE_LABELS: Record<ComponentType, string> = {
  game:    'Game',
  station: 'Station / Drill',
}

const TYPE_PLACEHOLDERS: Record<ComponentType, { name: string; desc: string }> = {
  game:    { name: 'e.g. Cube Game, Ninja Tag…',     desc: 'Rules, setup, how to play…' },
  station: { name: 'e.g. Box Jump Progression…',     desc: 'What does the kid do? Any coaching tips?' },
}

// ── Page ────────────────────────────────────────────────────────────────────

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
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [skills, setSkills] = useState<string[]>([])

  // Unified media — seeded from component on load, same shape as create page.
  const [media, setMedia] = useState<MediaItem[]>([])
  const [showMediaSheet, setShowMediaSheet] = useState(false)

  // Unsaved-changes guard — compares current state against DB values
  const isDirty = !!component && (
    title !== (component.title ?? '') ||
    description !== (component.description ?? '') ||
    durationMinutes !== (component.duration_minutes ?? null) ||
    JSON.stringify([...skills].sort()) !== JSON.stringify([...(component.skills ?? [])].sort()) ||
    media.some(m => m.kind !== 'link' && !!m.file)
  )
  const [guardDest, setGuardDest] = useState<string | null>(null)
  useUnsavedGuard(isDirty, setGuardDest)

  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Post-voice highlight tracking
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set())

  const newSkillInputRef = useRef<HTMLInputElement>(null)
  // Snapshot of form state at the moment the coach taps to re-record.
  // Non-null = refine mode; null = fresh recording.
  const existingRef = useRef<{ title: string; description: string; skills: string[]; durationMinutes: number | null } | null>(null)

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

  // Derived media flags
  const hasVideo = media.some((m) => m.kind === 'video')
  const hasLink = media.some((m) => m.kind === 'link')

  function handleStartOver() {
    existingRef.current = null
    setTitle('')
    setDescription('')
    setDurationMinutes(null)
    setSkills([])
    setJustFilled(new Set())
    resetVoice()
    startRecording()
  }

  async function handleMicToggle() {
    // Fresh recording
    if (voiceState === 'idle' || voiceState === 'error') {
      existingRef.current = null
      resetVoice()
      startRecording()
      return
    }

    // Refine recording — snapshot current state so the API can merge
    if (voiceState === 'done') {
      existingRef.current = { title, description, skills, durationMinutes }
      resetVoice()
      startRecording()
      return
    }

    if (voiceState === 'recording' && component) {
      stopRecording()
      const existing = existingRef.current
      const result = await parseComponent(
        component.type,
        component.type === 'station' ? availableSkills : [],
        existing ?? undefined,
      )

      let shouldReplaceTitle = true
      if (result.title && title.trim() && result.title.trim() !== title.trim()) {
        shouldReplaceTitle = window.confirm(
          `Replace the current name (“${title.trim()}”) with voice result “${result.title}”?`
        )
      }

      const filled = new Set<string>()
      if (result.title && shouldReplaceTitle) {
        setTitle(result.title); setTitleError(null); filled.add('title')
      }
      if (result.description) { setDescription(result.description); filled.add('description') }
      if (result.durationMinutes) { setDurationMinutes(result.durationMinutes); filled.add('duration') }
      if (component.type === 'station' && result.skills.length > 0) {
        setSkills((prev) => Array.from(new Set([...prev, ...result.skills])))
        filled.add('skills')
      }

      if (filled.size > 0) {
        setJustFilled(filled)
        setTimeout(() => setJustFilled(new Set()), 1300)
      }

      existingRef.current = null  // clear after use
    }
  }

  // Load component — seed form fields AND the unified media array
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
        setDurationMinutes(c.duration_minutes ?? null)
        setSkills(c.skills ?? [])

        // Build unified media array from existing photos, video, and link.
        // These are existing DB URLs with no `file` — they get kept on save
        // unless the coach removes them or replaces the video.
        const seed: MediaItem[] = []
        for (const url of c.photos ?? []) {
          if (url) seed.push({ localId: randomId(), kind: 'photo', url })
        }
        if (c.video_url) seed.push({ localId: randomId(), kind: 'video', url: c.video_url })
        if (c.video_link) seed.push({ localId: randomId(), kind: 'link', url: c.video_link })
        setMedia(seed)

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

  function handleAddMedia(item: MediaItem) {
    setMedia((prev) => {
      if (item.kind === 'video') return [...prev.filter((m) => m.kind !== 'video'), item]
      if (item.kind === 'link') return [...prev.filter((m) => m.kind !== 'link'), item]
      return [...prev, item]
    })
  }

  function handleRemoveMedia(localId: string) {
    setMedia((prev) => prev.filter((m) => m.localId !== localId))
  }

  async function handleDeleteConfirmed() {
    if (!component) return
    const photoPaths = (component.photos ?? [])
      .map((u) => extractPath(u, 'station-photos'))
      .filter(Boolean) as string[]
    if (photoPaths.length > 0) {
      await supabase.storage.from('station-photos').remove(photoPaths)
    }
    if (component.video_url) {
      const videoPath = extractPath(component.video_url, 'lane-videos')
      if (videoPath) await supabase.storage.from('lane-videos').remove([videoPath])
    }
    const { error: deleteErr } = await supabase.from('components').delete().eq('id', component.id)
    if (deleteErr) throw deleteErr
    router.push('/library?view=components')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)
    if (!title.trim()) { setTitleError('Title is required'); return }
    setSubmitting(true)
    try {
      const photoUrls: string[] = []
      for (const m of media) {
        if (m.kind !== 'photo') continue
        if (m.file) {
          try { photoUrls.push(await uploadStationPhoto(m.file)) } catch { /* skip */ }
        } else if (!m.url.startsWith('blob:')) {
          photoUrls.push(m.url)
        }
      }

      let videoUrl: string | null = null
      const videoItem = media.find((m) => m.kind === 'video')
      if (videoItem && videoItem.kind === 'video') {
        if (videoItem.file) {
          try { videoUrl = await uploadComponentVideo(videoItem.file) } catch { /* skip */ }
        } else if (!videoItem.url.startsWith('blob:')) {
          videoUrl = videoItem.url
        }
      }

      const linkItem = media.find((m) => m.kind === 'link')
      const videoLinkUrl = linkItem && linkItem.kind === 'link' ? linkItem.url : null

      const { error: updateErr } = await supabase.from('components').update({
        title: title.trim(),
        curriculum: curriculum || null,
        description: description.trim() || null,
        skills: skills.length > 0 ? skills : null,
        photos: photoUrls,
        video_url: videoUrl,
        video_link: videoLinkUrl,
        duration_minutes: durationMinutes,
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

  return (
    <form onSubmit={handleSubmit} className="pb-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="pt-2 mb-6">
        <Link
          href="/library?view=components"
          aria-label="Back to library"
          className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1.5 mb-3"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <p className="section-label mb-1">Editing</p>
        <h1 className="font-heading text-2xl text-text-primary leading-tight truncate">
          {title || typeLabel}
        </h1>
        <p className={['section-label mt-1', accent.typeText].join(' ')}>
          {typeLabel}
        </p>
      </div>

      {/* ── ZONE 1: Voice hero ─────────────────────────────── */}
      <VoiceHero
        voiceState={voiceState}
        voiceSupported={voiceSupported}
        transcript={transcript}
        errorMessage={voiceError}
        editing
        onToggle={handleMicToggle}
      />
      {voiceState === 'done' && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={handleStartOver}
            aria-label="Start voice over from scratch"
            className="text-xs text-text-dim hover:text-text-primary active:opacity-60 transition-colors min-h-[44px] px-4 py-2.5 focus-visible:ring-1 focus-visible:ring-white/30 rounded"
          >
            ↺ Start over
          </button>
        </div>
      )}

      {/* ── ZONE 2: Media strip ────────────────────────────── */}
      <div className="mt-6">
        <MediaStrip
          items={media}
          onAdd={() => setShowMediaSheet(true)}
          onRemove={handleRemoveMedia}
        />
      </div>

      {/* ── ZONE 3: Details ────────────────────────────────── */}

      <SectionLabel label="Name" />
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
        placeholder={placeholders.name}
        className={['field-input text-base', justFilled.has('title') ? 'animate-fill-pulse' : ''].join(' ')}
      />
      {titleError && <p className="text-accent-fire text-xs mt-1.5">{titleError}</p>}

      <SectionLabel label="Description" />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={placeholders.desc}
        rows={4}
        className={['field-textarea resize-none leading-relaxed', justFilled.has('description') ? 'animate-fill-pulse' : ''].join(' ')}
      />

      <SectionLabel label="Duration" />
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={120}
          value={durationMinutes ?? ''}
          onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
          placeholder="—"
          className={['w-20 field-input text-center', justFilled.has('duration') ? 'animate-fill-pulse' : ''].join(' ')}
        />
        <span className="text-sm text-text-dim">minutes</span>
      </div>

      {curriculums.length > 0 && (
        <>
          <SectionLabel label="Curriculum" />
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

      {component.type === 'station' && (
        <>
          <SectionLabel label="Skills" />
          <div className={['flex flex-wrap gap-2 rounded-xl', justFilled.has('skills') ? 'animate-fill-pulse p-1 -m-1' : ''].join(' ')}>
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
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Save */}
      <div className="mt-8">
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Delete — intentionally separated from Save to prevent accidental taps */}
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-sm text-red-400 hover:text-red-300 transition-colors py-2 px-4"
        >
          Delete component
        </button>
      </div>

      <ConfirmSheet
        visible={showDeleteConfirm}
        title="Delete component?"
        body="This can't be undone. Saved plans using this component will keep their copy."
        confirmLabel="Delete component"
        workingLabel="Deleting…"
        destructive
        onConfirm={handleDeleteConfirmed}
        onClose={() => setShowDeleteConfirm(false)}
      />

      <MediaAddSheet
        visible={showMediaSheet}
        onClose={() => setShowMediaSheet(false)}
        onAdd={handleAddMedia}
        hasVideo={hasVideo}
        hasLink={hasLink}
      />

      <ConfirmSheet
        visible={guardDest !== null}
        title="Leave without saving?"
        body="Your changes will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        destructive
        onConfirm={() => { router.push(guardDest!) }}
        onClose={() => setGuardDest(null)}
      />
    </form>
  )
}

// ── Voice hero — same layout as create page, editing=true swaps copy ──────────

function VoiceHero({
  voiceState,
  voiceSupported,
  transcript,
  errorMessage,
  editing = false,
  onToggle,
}: {
  voiceState: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  voiceSupported: boolean
  transcript: string
  errorMessage: string | null
  editing?: boolean
  onToggle: () => void
}) {
  const idleTitle = editing ? 'Speak to update the form' : 'Speak to fill the form'
  const idleSub   = editing
    ? 'Re-record the name, cues, duration, and skills at once.'
    : 'Name, cues, duration, and skills fill in automatically.'

  const title =
    voiceState === 'recording'   ? 'Listening…' :
    voiceState === 'processing'  ? 'Processing…' :
    voiceState === 'done'        ? (editing ? 'Updated ✓  Review below' : 'Filled ✓  Review below') :
    voiceState === 'error'       ? 'Something went wrong' :
    !voiceSupported              ? 'Voice unavailable' :
                                   idleTitle

  const subtitle =
    voiceState === 'recording'   ? 'Tap the mic again when you\'re done.' :
    voiceState === 'processing'  ? 'Organizing what you said into fields…' :
    voiceState === 'done'        ? 'Tap to refine or add more. Edit fields directly too.' :
    voiceState === 'error'       ? (errorMessage ?? 'Tap to try again.') :
    !voiceSupported              ? 'Edit the details below.' :
                                   idleSub

  const disabled = voiceState === 'processing' || !voiceSupported

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={voiceState === 'recording' ? 'Stop recording' : 'Start voice recording'}
        className={[
          'w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left',
          voiceState === 'recording'
            ? 'bg-accent-fire/10 border-accent-fire/40'
            : voiceState === 'done'
              ? 'bg-accent-green/5 border-accent-green/30'
              : voiceState === 'error'
                ? 'bg-red-900/10 border-red-500/30'
                : !voiceSupported
                  ? 'bg-bg-card border-bg-border opacity-70'
                  : 'bg-accent-fire/5 border-accent-fire/20 hover:border-accent-fire/40',
          disabled ? 'cursor-not-allowed' : 'active:scale-[0.99]',
        ].join(' ')}
      >
        <div
          className={[
            'w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            voiceState === 'recording'  ? 'bg-accent-fire text-white shadow-glow-fire' :
            voiceState === 'processing' ? 'bg-bg-input text-text-dim' :
            voiceState === 'done'       ? 'bg-accent-green/20 text-accent-green' :
            voiceState === 'error'      ? 'bg-red-500/20 text-red-400' :
            !voiceSupported             ? 'bg-bg-input text-text-dim/60' :
                                          'bg-accent-fire text-white shadow-glow-fire',
          ].join(' ')}
        >
          {voiceState === 'recording' ? (
            <svg className="w-8 h-8 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
            </svg>
          ) : voiceState === 'processing' ? (
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : voiceState === 'done' ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={[
              'font-heading text-[17px] leading-tight',
              voiceState === 'recording' ? 'text-accent-fire' :
              voiceState === 'done'      ? 'text-accent-green' :
              voiceState === 'error'     ? 'text-red-400' :
              !voiceSupported            ? 'text-text-muted' :
                                           'text-text-primary',
            ].join(' ')}
          >
            {title}
          </p>
          <p className="text-xs text-text-dim leading-relaxed mt-1">{subtitle}</p>
        </div>
      </button>

      {voiceState === 'recording' && transcript && (
        <p className="text-xs text-text-dim italic mt-2 px-3 leading-relaxed">
          &ldquo;{transcript}&rdquo;
        </p>
      )}
    </div>
  )
}
