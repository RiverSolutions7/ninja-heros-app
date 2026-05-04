'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { countComponents } from '@/app/lib/queries'
import type { ComponentType, CurriculumRow } from '@/app/lib/database.types'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import { useUnsavedGuard } from '@/app/hooks/useUnsavedGuard'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'
import Toast from '@/app/components/ui/Toast'

import S1Type from '@/app/components/log-flow/S1Type'
import S2Curriculum from '@/app/components/log-flow/S2Curriculum'
import S3Photo from '@/app/components/log-flow/S3Photo'
import VoiceScreen from '@/app/components/log-flow/VoiceScreen'
import RevealScreen from '@/app/components/log-flow/RevealScreen'
import Satisfaction from '@/app/components/log-flow/Satisfaction'
import '@/app/components/log-flow/log-flow.css'

type LogStep = 'type' | 'curriculum' | 'photo' | 'voice' | 'reveal' | 'satisfaction'

interface LogDraft {
  type: ComponentType | null
  curriculums: string[]
  photoFile: File | null
  photoPreviewUrl: string | null
  title: string
  description: string
  skills: string[]
  durationMinutes: number | null
}

const EMPTY_DRAFT: LogDraft = {
  type: null,
  curriculums: [],
  photoFile: null,
  photoPreviewUrl: null,
  title: '',
  description: '',
  skills: [],
  durationMinutes: null,
}

export default function LogComponentPage() {
  const router = useRouter()

  const [step, setStep] = useState<LogStep>('type')
  const [draft, setDraft] = useState<LogDraft>(EMPTY_DRAFT)
  const [curriculumRows, setCurriculumRows] = useState<CurriculumRow[]>([])
  const [availableSkills, setAvailableSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [satisfactionCount, setSatisfactionCount] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [guardDest, setGuardDest] = useState<string | null>(null)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const refineSnapshotRef = useRef<{ title: string; description: string; skills: string[]; durationMinutes: number | null } | null>(null)
  const isDirtyRef = useRef(false)

  const voice = useVoiceNote()

  // Load curriculums once
  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        setCurriculumRows((data as CurriculumRow[]) ?? [])
      })
  }, [])

  // Load skills available across selected curricula
  useEffect(() => {
    if (draft.curriculums.length === 0) {
      setAvailableSkills([])
      return
    }
    supabase
      .from('skills')
      .select('name, age_group')
      .in('age_group', draft.curriculums)
      .then(({ data }) => {
        const names = Array.from(new Set((data ?? []).map((r) => r.name)))
        setAvailableSkills(names)
      })
  }, [draft.curriculums])

  // Revoke preview URL on unmount or replace
  useEffect(() => {
    return () => {
      if (draft.photoPreviewUrl) URL.revokeObjectURL(draft.photoPreviewUrl)
    }
  }, [draft.photoPreviewUrl])

  // Voice-not-supported fallback — skip voice step entirely on unsupported browsers
  useEffect(() => {
    if (step !== 'voice') return
    if (voice.isSupported) return
    setError("Voice isn't supported on this browser. Tap the card to type details.")
    setStep('reveal')
  }, [step, voice.isSupported])

  // Dirty detection — anything captured beyond the empty draft
  const isDirty = useMemo(() => {
    if (step === 'satisfaction') return false
    return (
      draft.type !== null ||
      draft.curriculums.length > 0 ||
      draft.photoFile !== null ||
      draft.title.trim() !== '' ||
      draft.description.trim() !== '' ||
      draft.skills.length > 0 ||
      draft.durationMinutes !== null
    )
  }, [draft, step])
  isDirtyRef.current = isDirty

  useUnsavedGuard(isDirty, setGuardDest)

  // ── Voice handlers ─────────────────────────────────────────────────────────

  const handleMicTap = async () => {
    if (!draft.type) return
    if (!voice.isSupported) {
      setError("Voice isn't supported on this browser. Tap the card to type details.")
      setStep('reveal')
      return
    }
    if (voice.voiceState === 'idle' || voice.voiceState === 'done' || voice.voiceState === 'error') {
      voice.startRecording()
      return
    }
    if (voice.voiceState === 'recording') {
      voice.stopRecording()
      try {
        const result = await voice.parseComponent(draft.type, availableSkills, refineSnapshotRef.current ?? undefined)
        if (!result.title && !result.description && result.skills.length === 0 && result.durationMinutes == null) {
          // Empty result — error toast already set by hook
          return
        }
        setDraft((d) => ({
          ...d,
          title: refineSnapshotRef.current?.title || result.title || d.title,
          description: result.description || d.description,
          skills: result.skills.length > 0 ? result.skills : d.skills,
          durationMinutes: result.durationMinutes ?? d.durationMinutes,
        }))
        refineSnapshotRef.current = null
        voice.reset()
        setStep('reveal')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Voice parse failed')
      }
    }
  }

  const handleSpeakMore = () => {
    refineSnapshotRef.current = {
      title: draft.title,
      description: draft.description,
      skills: draft.skills,
      durationMinutes: draft.durationMinutes,
    }
    voice.reset()
    setStep('voice')
  }

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const handleCapturePhoto = (file: File) => {
    setDraft((d) => {
      if (d.photoPreviewUrl) URL.revokeObjectURL(d.photoPreviewUrl)
      return { ...d, photoFile: file, photoPreviewUrl: URL.createObjectURL(file) }
    })
  }

  // ── Curriculum handlers ───────────────────────────────────────────────────

  const handleToggleCurriculum = (ageGroup: string) => {
    setDraft((d) => ({
      ...d,
      curriculums: d.curriculums.includes(ageGroup)
        ? d.curriculums.filter((c) => c !== ageGroup)
        : [...d.curriculums, ageGroup],
    }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!draft.type || draft.curriculums.length === 0 || !draft.photoFile || !draft.title.trim()) {
      setError('Missing required fields')
      return
    }
    setSaving(true)
    try {
      const photoUrl = await uploadStationPhoto(draft.photoFile)

      const { error: insertErr } = await supabase.from('components').insert({
        type: draft.type,
        title: draft.title.trim(),
        curriculum: draft.curriculums[0],
        curriculums: draft.curriculums,
        description: draft.description.trim() || null,
        skills: draft.skills,
        photos: [photoUrl],
        video_url: null,
        video_link: null,
        duration_minutes: draft.durationMinutes,
      })

      if (insertErr) throw insertErr

      const total = await countComponents(draft.curriculums[0]).catch(() => 1)
      setSatisfactionCount(Math.max(total, 1))
      setStep('satisfaction')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save component')
    } finally {
      setSaving(false)
    }
  }

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleClose = () => {
    if (isDirtyRef.current) {
      setConfirmExitOpen(true)
    } else {
      router.push('/library')
    }
  }

  const handleConfirmExit = () => {
    setConfirmExitOpen(false)
    setGuardDest(null)
    router.push(guardDest || '/library')
  }

  const handleLogAnother = () => {
    if (draft.photoPreviewUrl) URL.revokeObjectURL(draft.photoPreviewUrl)
    refineSnapshotRef.current = null
    voice.reset()
    setDraft(EMPTY_DRAFT)
    setStep('type')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const micState = voice.voiceState === 'recording' ? 'recording' : voice.voiceState === 'processing' ? 'parsing' : 'idle'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a1232', overflow: 'hidden' }}>
      {step === 'type' && (
        <S1Type
          value={draft.type}
          onSelect={(t) => setDraft((d) => ({ ...d, type: t }))}
          onNext={() => setStep('curriculum')}
          onClose={handleClose}
        />
      )}

      {step === 'curriculum' && (
        <S2Curriculum
          value={draft.curriculums}
          curriculums={curriculumRows}
          onToggle={handleToggleCurriculum}
          onNext={() => setStep('photo')}
          onBack={() => setStep('type')}
          onClose={handleClose}
        />
      )}

      {step === 'photo' && (
        <S3Photo
          previewUrl={draft.photoPreviewUrl}
          onCapture={handleCapturePhoto}
          onNext={() => setStep('voice')}
          onBack={() => setStep('curriculum')}
          onClose={handleClose}
        />
      )}

      {step === 'voice' && draft.type && (
        <VoiceScreen
          state={micState}
          type={draft.type}
          photoPreviewUrl={draft.photoPreviewUrl}
          transcript={voice.transcript}
          onMicTap={handleMicTap}
          onBack={() => {
            voice.reset()
            refineSnapshotRef.current = null
            setStep('photo')
          }}
          onClose={handleClose}
        />
      )}

      {step === 'reveal' && draft.type && (
        <RevealScreen
          type={draft.type}
          curricula={draft.curriculums}
          curriculumRows={curriculumRows}
          photoPreviewUrl={draft.photoPreviewUrl}
          draft={{
            title: draft.title,
            description: draft.description,
            skills: draft.skills,
            durationMinutes: draft.durationMinutes,
          }}
          onUpdateDraft={(next) =>
            setDraft((d) => ({
              ...d,
              title: next.title,
              description: next.description,
              skills: next.skills,
              durationMinutes: next.durationMinutes,
            }))
          }
          onSave={handleSave}
          onSpeakMore={handleSpeakMore}
          onBack={handleClose}
          saving={saving}
        />
      )}

      {step === 'satisfaction' && draft.type && (
        <Satisfaction
          count={satisfactionCount}
          type={draft.type}
          title={draft.title.trim() || 'Your component'}
          onBackToLibrary={() => router.push('/library')}
          onLogAnother={handleLogAnother}
        />
      )}

      <ConfirmSheet
        visible={confirmExitOpen || guardDest !== null}
        title="Discard this component?"
        body="You'll lose what you've captured so far."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={handleConfirmExit}
        onClose={() => {
          setConfirmExitOpen(false)
          setGuardDest(null)
        }}
      />

      {(error || voice.errorMessage) && (
        <Toast
          message={error || voice.errorMessage || ''}
          type="error"
          onDismiss={() => {
            setError(null)
            // hook clears its own error on next start
          }}
        />
      )}
    </div>
  )
}
