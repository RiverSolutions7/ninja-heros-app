'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadComponentVideo } from '@/app/lib/uploadVideo'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import SkillChip from '@/app/components/skills/SkillChip'
import Toast from '@/app/components/ui/Toast'
import VideoCapture from '@/app/components/ui/VideoCapture'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'

// ── Shared helpers ────────────────────────────────────────────────────────────

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
  warmup: {
    label: 'Warmup',
    sublabel: 'Movement prep or exercise sequence',
    cardBorder: 'border-accent-gold/30 hover:border-accent-gold/60',
    cardBg: 'hover:bg-accent-gold/5',
    textColor: 'text-accent-gold',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
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

const TYPE_BADGE: Record<ComponentType, string> = {
  game:    'bg-accent-green/10 text-accent-green border-accent-green/25',
  warmup:  'bg-accent-gold/10 text-accent-gold border-accent-gold/25',
  station: 'bg-accent-blue/10 text-accent-blue border-accent-blue/25',
}

// ── Voice labels ───────────────────────────────────────────────────────────────

const MIC_IDLE_LABEL       = 'Tap to name and describe this component'
const MIC_RECORDING_LABEL  = 'Listening… tap again to stop'
const MIC_PROCESSING_LABEL = 'Processing…'
const MIC_DONE_LABEL       = 'Name, description & skills filled ✓'

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
  const [skills, setSkills] = useState<string[]>([])
  const [photos, setPhotos] = useState<PhotoDraft[]>([])

  // Video
  const [showVideo, setShowVideo] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  // Optional video link
  const [showVideoLink, setShowVideoLink] = useState(false)
  const [videoLink, setVideoLink] = useState('')

  // Skills
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [addingSkill, setAddingSkill] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [addSkillSaving, setAddSkillSaving] = useState(false)
  const [addSkillError, setAddSkillError] = useState<string | null>(null)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const newSkillInputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

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
          // Auto-select single curriculum, skip to type gate
          setCurriculum(rows[0].age_group)
          setGateStep('type')
        } else if (rows.length === 0) {
          // No curricula configured — skip to type gate
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

  async function handleMicToggle() {
    if (voiceState === 'idle' || voiceState === 'error' || voiceState === 'done') {
      resetVoice()
      startRecording()
    } else if (voiceState === 'recording') {
      stopRecording()
      const result = await parseComponent(componentType!, availableSkills)
      if (result.title) { setTitle(result.title); setTitleError(null) }
      if (result.description) setDescription(result.description)
      if (result.skills.length > 0) setSkills(result.skills)
    }
  }

  const micColors: Record<string, string> = {
    idle:       'bg-bg-card border-2 border-bg-border text-text-muted hover:border-accent-fire/40 hover:text-accent-fire',
    recording:  'bg-accent-fire text-white shadow-glow-fire',
    processing: 'bg-bg-card border-2 border-bg-border text-text-dim',
    done:       'bg-accent-green/15 border-2 border-accent-green/50 text-accent-green',
    error:      'bg-red-900/20 border-2 border-red-500/40 text-red-400',
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

  // ── Photos ───────────────────────────────────────────────────────────────────

  function handleFileAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotos((prev) => [...prev, { localId: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }])
    e.target.value = ''
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTitleError(null)
    if (!title.trim()) { setTitleError('Give this component a name'); return }
    setSubmitting(true)
    try {
      const photoUrls: string[] = []
      for (const photo of photos) {
        try { photoUrls.push(await uploadStationPhoto(photo.file)) } catch { /* skip */ }
      }

      let videoUrl: string | null = null
      if (videoFile) {
        try { videoUrl = await uploadComponentVideo(videoFile) } catch { /* skip */ }
      }

      const { error: insertErr } = await supabase.from('components').insert({
        type: componentType!,
        title: title.trim(),
        curriculum: curriculum || null,
        description: description.trim() || null,
        skills: skills.length > 0 ? skills : null,
        photos: photoUrls.filter((u) => !u.startsWith('blob:')),
        video_url: videoUrl,
        video_link: showVideoLink ? (videoLink.trim() || null) : null,
      })
      if (insertErr) throw insertErr
      setToast({ message: 'Component saved ✓', type: 'success' })
      await new Promise((r) => setTimeout(r, 1500))
      router.push('/library?view=components')
    } catch {
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' })
      setSubmitting(false)
    }
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const curriculumLabel = curriculums.find((c) => c.age_group === curriculum)?.label ?? curriculum
  const typeConfig = componentType ? TYPE_GATE_CONFIG[componentType] : null

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

  // At this point componentType is guaranteed non-null (gateStep === 'form')
  const ct = componentType!

  return (
    <form onSubmit={handleSubmit} className="pb-6">

      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pt-2">
        <Link
          href="/library?view=components"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl text-text-primary leading-none flex-shrink-0">Log Component</h1>

        {/* Curriculum badge — tappable if multiple curricula */}
        {curriculumLabel && (
          <button
            type="button"
            onClick={changeCurriculum}
            className="text-[10px] font-heading uppercase tracking-wide px-2 py-1 rounded-full bg-accent-fire/10 border border-accent-fire/25 text-accent-fire transition-colors hover:bg-accent-fire/20 flex-shrink-0"
          >
            {curriculumLabel}
          </button>
        )}

        {/* Type badge — always tappable */}
        <button
          type="button"
          onClick={changeType}
          className={[
            'text-[10px] font-heading uppercase tracking-wide px-2 py-1 rounded-full border transition-colors flex-shrink-0',
            TYPE_BADGE[ct],
          ].join(' ')}
        >
          {TYPE_GATE_CONFIG[ct].label}
        </button>
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
          {voiceState === 'error'      && (errorMessage ?? 'Could not process. Try again.')}
          {voiceState === 'idle'       && (voiceSupported ? MIC_IDLE_LABEL : 'Fill in the details below')}
        </p>

        {voiceState === 'recording' && transcript && (
          <p className="text-xs text-text-dim italic text-center mt-3 px-6 leading-relaxed max-w-xs">
            &ldquo;{transcript}&rdquo;
          </p>
        )}
      </div>

      {/* ── PHOTOS ────────────────────────────────────────── */}
      <SectionDivider label="Photos" />

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollSnapType: 'x mandatory' }}>
          {photos.map((photo) => (
            <div
              key={photo.localId}
              className="relative flex-shrink-0 rounded-xl overflow-hidden"
              style={{ scrollSnapAlign: 'start', width: 120, height: 90 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((p) => p.localId !== photo.localId))}
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

      {/* ── VIDEO ─────────────────────────────────────────── */}
      {!showVideo ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowVideo(true)}
            className="flex items-center gap-1.5 text-xs text-text-dim border border-dashed border-bg-border rounded-full px-3 py-1.5 hover:border-text-dim/40 hover:text-text-muted transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Video
          </button>
        </div>
      ) : (
        <>
          <SectionDivider label="Video" />
          <VideoCapture
            preview={videoPreview}
            onFileSelected={(file, preview) => { setVideoFile(file); setVideoPreview(preview) }}
          />
          {videoPreview ? (
            <button
              type="button"
              onClick={() => { setVideoFile(null); setVideoPreview(null) }}
              className="flex items-center gap-1 text-xs text-red-400/70 hover:text-red-400 mt-2 transition-colors"
            >
              <XIcon /> Remove video
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="flex items-center gap-1 text-xs text-text-dim/50 hover:text-text-dim mt-2 transition-colors"
            >
              <XIcon /> Cancel
            </button>
          )}
        </>
      )}

      {/* ── NAME ──────────────────────────────────────────── */}
      <SectionDivider label="Name" />

      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
        placeholder={
          ct === 'game'    ? 'e.g. Cube Game, Ninja Tag…' :
          ct === 'warmup'  ? 'e.g. Bear Crawl Circuit…' :
                             'e.g. Box Jump Progression…'
        }
        className="field-input text-base"
      />
      {titleError && <p className="text-accent-fire text-xs mt-1.5">{titleError}</p>}

      {/* ── DESCRIPTION ───────────────────────────────────── */}
      <SectionDivider label="Description" />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={
          ct === 'game'    ? 'Rules, setup, how to play…' :
          ct === 'warmup'  ? 'Exercise sequence, timing, cues…' :
                             'What does the kid do? Any coaching tips?'
        }
        rows={4}
        className="field-textarea resize-none leading-relaxed"
      />

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
            <button type="button" onClick={() => { setShowVideoLink(false); setVideoLink('') }} className="text-text-dim hover:text-red-400 transition-colors p-1.5">
              <XIcon />
            </button>
          </div>
        </>
      )}

      {/* Save */}
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
          ) : 'Save Component'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </form>
  )
}
