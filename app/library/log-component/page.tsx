'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import { countComponents } from '@/app/lib/queries'
import { randomId } from '@/app/lib/uuid'
import type { ComponentRow, ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import Toast from '@/app/components/ui/Toast'
import MediaStrip, { type MediaItem } from '@/app/components/ui/MediaStrip'
import MediaAddSheet from '@/app/components/ui/MediaAddSheet'
import Button from '@/app/components/ui/Button'
import ComponentDetailSheet from '@/app/components/library/ComponentDetailSheet'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

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

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_GATE_CONFIG: Record<ComponentType, {
  label: string
  sublabel: string
  cardBorder: string
  cardBg: string
  textColor: string
  icon: React.ReactNode
}> = {
  game: {
    label: 'Game',
    sublabel: 'Group activity or competition',
    cardBorder: 'border-accent-green/30 hover:border-accent-green/60',
    cardBg: 'hover:bg-accent-green/5',
    textColor: 'text-accent-green',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  station: {
    label: 'Station / Drill',
    sublabel: 'Skill-specific obstacle or drill',
    cardBorder: 'border-accent-blue/30 hover:border-accent-blue/60',
    cardBg: 'hover:bg-accent-blue/5',
    textColor: 'text-accent-blue',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
}

// ── Gate step type ─────────────────────────────────────────────────────────────

type GateStep = 'loading' | 'curriculum' | 'type' | 'form'

// ── Page component ─────────────────────────────────────────────────────────────

export default function LogComponentPage() {
  const router = useRouter()

  // Gate
  const [gateStep, setGateStep] = useState<GateStep>('loading')
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])

  // Core metadata (set by gates)
  const [curriculum, setCurriculum] = useState('')
  const [componentType, setComponentType] = useState<ComponentType | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null)
  const [skills, setSkills] = useState<string[]>([])

  // Unified media — photos + video + video link all in one array. Single-video
  // and single-link slots are enforced by handleAddMedia (new video/link
  // replaces any existing one).
  const [media, setMedia] = useState<MediaItem[]>([])
  const [showMediaSheet, setShowMediaSheet] = useState(false)

  // Skills
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)

  // Post-voice green-pulse tracking: set of field keys that just got filled
  // via voice; cleared after the animation class runs (~1.2s).
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set())

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // After-save reward screen.
  const [savedComponent, setSavedComponent] = useState<ComponentRow | null>(null)
  const [libraryRank, setLibraryRank] = useState<number | null>(null)

  const newSkillInputRef = useRef<HTMLInputElement>(null)
  // Snapshot of form state taken when the coach taps the mic after a prior fill.
  // Non-null = refine mode (send existing content to API for merging).
  // Null     = fresh mode (generate from scratch).
  const existingRef = useRef<{ title: string; description: string; skills: string[]; durationMinutes: number | null } | null>(null)

  const {
    voiceState,
    transcript,
    errorMessage,
    isSupported: voiceSupported,
    startRecording,
    stopRecording,
    parseComponent,
    reset: resetVoice,
  } = useVoiceNote()

  // ── Derived media flags ─────────────────────────────────────────────────────

  const hasVideo = media.some((m) => m.kind === 'video')
  const hasLink = media.some((m) => m.kind === 'link')

  // ── Load curricula ───────────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        const rows = (data as CurriculumRow[]) ?? []
        setCurriculums(rows)
        if (rows.length === 1) {
          setCurriculum(rows[0].age_group)
          setGateStep('type')
        } else if (rows.length === 0) {
          setGateStep('type')
        } else {
          setGateStep('curriculum')
        }
      })
  }, [])

  // ── Load skills when curriculum is set ──────────────────────────────────────

  useEffect(() => {
    if (!curriculum) return
    supabase
      .from('skills')
      .select('name')
      .eq('age_group', curriculum)
      .order('name')
      .then(({ data }) => setAvailableSkills(data?.map((r) => r.name) ?? []))
  }, [curriculum])

  // ── Gate handlers ────────────────────────────────────────────────────────────

  function selectCurriculum(ageGroup: string) {
    setCurriculum(ageGroup)
    setSkills([])
    setGateStep('type')
  }

  function selectType(type: ComponentType) {
    setComponentType(type)
    setGateStep('form')
  }

  function backFromTypeGate() {
    if (curriculums.length > 1) {
      setGateStep('curriculum')
    } else {
      router.push('/library?view=components')
    }
  }

  function changeCurriculum() {
    if (curriculums.length > 1) {
      setSkills([])
      setGateStep('curriculum')
    }
  }

  function changeType() {
    setGateStep('type')
  }

  // ── Voice ────────────────────────────────────────────────────────────────────

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
    // Fresh recording — no existing content
    if (voiceState === 'idle' || voiceState === 'error') {
      existingRef.current = null
      resetVoice()
      startRecording()
      return
    }

    // Refine recording — snapshot current form state before resetting so the
    // API can merge the new transcript with what's already been filled.
    if (voiceState === 'done') {
      existingRef.current = { title, description, skills, durationMinutes }
      resetVoice()
      startRecording()
      return
    }

    if (voiceState === 'recording') {
      stopRecording()
      const existing = existingRef.current  // null on first run, populated on refine
      const result = await parseComponent(
        componentType!,
        componentType === 'station' ? availableSkills : [],
        existing ?? undefined,
      )

      // Pushback on silent overwrite: if the coach has already typed a name,
      // confirm before voice replaces it. Other fields overwrite freely since
      // they're bulkier and less “theirs.”
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
      if (componentType === 'station' && result.skills.length > 0) {
        if (existing) {
          // Refine mode: merge new skills with existing ones
          setSkills((prev) => Array.from(new Set([...prev, ...result.skills])))
        } else {
          // Fresh mode: overwrite
          setSkills(result.skills)
        }
        filled.add('skills')
      }

      // Fire the post-voice highlight. Using key-based re-mount via justFilled
      // ensures the CSS animation re-runs even if filled set is identical to a
      // previous run.
      if (filled.size > 0) {
        setJustFilled(filled)
        setTimeout(() => setJustFilled(new Set()), 1300)
      }

      existingRef.current = null  // clear after use
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────────

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

  // ── Media ────────────────────────────────────────────────────────────────────

  function handleAddMedia(item: MediaItem) {
    setMedia((prev) => {
      if (item.kind === 'video') return [...prev.filter((m) => m.kind !== 'video'), item]
      if (item.kind === 'link') return [...prev.filter((m) => m.kind !== 'link'), item]
      return [...prev, item] // photos are multi-valued
    })
  }

  function handleRemoveMedia(localId: string) {
    setMedia((prev) => prev.filter((m) => m.localId !== localId))
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTitleError(null)
    if (!title.trim()) { setTitleError('Give this component a name'); return }
    setSubmitting(true)
    try {
      // Partition unified media back into DB-shaped fields.
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

      const { data: inserted, error: insertErr } = await supabase
        .from('components')
        .insert({
          type: componentType!,
          title: title.trim(),
          curriculum: curriculum || null,
          description: description.trim() || null,
          skills: skills.length > 0 ? skills : null,
          photos: photoUrls.filter((u) => !u.startsWith('blob:')),
          video_url: videoUrl,
          video_link: videoLinkUrl,
          duration_minutes: durationMinutes,
        })
        .select()
        .single()
      if (insertErr) throw insertErr

      let totalCount: number
      try { totalCount = await countComponents() } catch { totalCount = 0 }

      setSavedComponent(inserted as ComponentRow)
      setLibraryRank(totalCount)
    } catch {
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' })
      setSubmitting(false)
    }
  }

  function handleLogAnother() {
    setSavedComponent(null)
    setLibraryRank(null)
    setComponentType(null)
    setTitle('')
    setTitleError(null)
    setDescription('')
    setDurationMinutes(null)
    setSkills([])
    setMedia([])
    setAddingSkill(false)
    setNewSkillName('')
    setAddSkillError(null)
    setSubmitting(false)
    setToast(null)
    setJustFilled(new Set())
    resetVoice()
    setGateStep('type')
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const curriculumLabel = curriculums.find((c) => c.age_group === curriculum)?.label ?? curriculum
  const typeConfig = componentType ? TYPE_GATE_CONFIG[componentType] : null

  // ── Render: After-save reward screen ──────────────────────────────────────────

  if (savedComponent && libraryRank !== null) {
    return (
      <ComponentDetailSheet
        component={savedComponent}
        mode="afterSave"
        libraryRank={libraryRank}
        onClose={() => router.push('/library?view=components')}
        onLogAnother={handleLogAnother}
      />
    )
  }

  // ── Render: Loading ───────────────────────────────────────────────────────────

  if (gateStep === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Render: Curriculum gate ───────────────────────────────────────────────────

  if (gateStep === 'curriculum') {
    return (
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-10 pt-2">
          <Link
            href="/library?view=components"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="font-heading text-2xl text-text-primary leading-tight mb-1">
            Who is this for?
          </h1>
          <p className="text-sm text-text-dim">Choose a curriculum to continue</p>
        </div>

        <div className="space-y-3">
          {curriculums.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCurriculum(c.age_group)}
              className="w-full flex items-center gap-4 px-5 py-4 bg-bg-card border border-bg-border rounded-2xl hover:border-accent-fire/40 hover:bg-accent-fire/5 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-fire/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-base text-text-primary">{c.label}</p>
                {c.age_group && (
                  <p className="text-xs text-text-dim mt-0.5">{c.age_group}</p>
                )}
              </div>
              <svg className="w-5 h-5 text-text-dim/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: Type gate ─────────────────────────────────────────────────────────

  if (gateStep === 'type') {
    return (
      <div className="pb-6">
        <div className="flex items-center gap-3 mb-10 pt-2">
          <button
            type="button"
            onClick={backFromTypeGate}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {curriculum && curriculumLabel && (
            <span className="text-xs font-heading text-text-dim uppercase tracking-wide">
              {curriculumLabel}
            </span>
          )}
        </div>

        <div className="mb-8">
          <h1 className="font-heading text-2xl text-text-primary leading-tight mb-1">
            What are you logging?
          </h1>
          <p className="text-sm text-text-dim">Choose a type to continue</p>
        </div>

        <div className="space-y-3">
          {(Object.entries(TYPE_GATE_CONFIG) as [ComponentType, typeof TYPE_GATE_CONFIG[ComponentType]][]).map(([type, cfg]) => (
            <button
              key={type}
              type="button"
              onClick={() => selectType(type)}
              className={[
                'w-full flex items-center gap-4 px-5 py-4 bg-bg-card border rounded-2xl active:scale-[0.98] transition-all text-left',
                cfg.cardBorder,
                cfg.cardBg,
              ].join(' ')}
            >
              <div className={['flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center', cfg.textColor].join(' ')}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={['font-heading text-base', cfg.textColor].join(' ')}>{cfg.label}</p>
                <p className="text-xs text-text-dim mt-0.5">{cfg.sublabel}</p>
              </div>
              <svg className="w-5 h-5 text-text-dim/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: Full form ─────────────────────────────────────────────────────────

  const ct = componentType!

  return (
    <form onSubmit={handleSubmit} className="pb-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="pt-2 mb-6">
        <button
          type="button"
          onClick={changeType}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1 mb-3"
          aria-label="Back to type selection"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-heading text-2xl text-text-primary leading-tight">
          New {TYPE_GATE_CONFIG[ct].label}
        </h1>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-heading uppercase tracking-[0.12em]">
          {curriculumLabel && (
            <>
              <button
                type="button"
                onClick={changeCurriculum}
                className="text-text-dim hover:text-text-muted transition-colors"
              >
                {curriculumLabel}
              </button>
              <span className="text-text-dim/40">·</span>
            </>
          )}
          <button
            type="button"
            onClick={changeType}
            className={[TYPE_GATE_CONFIG[ct].textColor, 'hover:opacity-80 transition-opacity'].join(' ')}
          >
            {TYPE_GATE_CONFIG[ct].label}
          </button>
        </div>
      </div>

      {/* ── ZONE 1: Voice hero ─────────────────────────────── */}
      <VoiceHero
        voiceState={voiceState}
        voiceSupported={voiceSupported}
        transcript={transcript}
        errorMessage={errorMessage}
        onToggle={handleMicToggle}
      />
      {voiceState === 'done' && (
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={handleStartOver}
            className="text-xs text-text-dim hover:text-text-primary active:opacity-60 transition-colors px-3 py-1"
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

      {/* ── ZONE 3: Details (always visible) ───────────────── */}

      <SectionLabel label="Name" />
      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
        placeholder={
          ct === 'game' ? 'e.g. Cube Game, Ninja Tag…' : 'e.g. Box Jump Progression…'
        }
        className={['field-input text-base', justFilled.has('title') ? 'animate-fill-pulse' : ''].join(' ')}
      />
      {titleError && <p className="text-accent-fire text-xs mt-1.5">{titleError}</p>}

      <SectionLabel label="Description" />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          ct === 'game' ? 'Rules, setup, how to play…' : 'What does the kid do? Any coaching tips?'
        }
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

      {ct === 'station' && (
        <>
          <SectionLabel label="Skills" />
          <div
            className={[
              'flex flex-wrap gap-2 rounded-xl',
              justFilled.has('skills') ? 'animate-fill-pulse p-1 -m-1' : '',
            ].join(' ')}
          >
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

      {/* Save */}
      <div className="mt-8">
        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          {submitting ? 'Saving…' : 'Save Component'}
        </Button>
      </div>

      {/* Media add sheet */}
      <MediaAddSheet
        visible={showMediaSheet}
        onClose={() => setShowMediaSheet(false)}
        onAdd={handleAddMedia}
        hasVideo={hasVideo}
        hasLink={hasLink}
      />

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </form>
  )
}

// ── Voice hero — shared layout for the big mic card ────────────────────────────

function VoiceHero({
  voiceState,
  voiceSupported,
  transcript,
  errorMessage,
  onToggle,
}: {
  voiceState: 'idle' | 'recording' | 'processing' | 'done' | 'error'
  voiceSupported: boolean
  transcript: string
  errorMessage: string | null
  onToggle: () => void
}) {
  const title =
    voiceState === 'recording'   ? 'Listening…' :
    voiceState === 'processing'  ? 'Processing…' :
    voiceState === 'done'        ? 'Filled ✓  Review below' :
    voiceState === 'error'       ? 'Something went wrong' :
    !voiceSupported              ? 'Voice unavailable' :
                                   'Speak to fill the form'

  const subtitle =
    voiceState === 'recording'   ? 'Tap the mic again when you\'re done.' :
    voiceState === 'processing'  ? 'Organizing what you said into fields…' :
    voiceState === 'done'        ? 'Tap to refine or add more. Edit fields directly too.' :
    voiceState === 'error'       ? (errorMessage ?? 'Tap to try again.') :
    !voiceSupported              ? 'Fill in the details below.' :
                                   'Name, cues, duration, and skills fill in automatically.'

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
        {/* 72x72 mic (scaled up from the 44x44 used elsewhere) */}
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

        {/* Title + subtitle stack */}
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
