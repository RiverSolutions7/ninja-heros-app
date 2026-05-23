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
import RevealScreen, { type RevealDraft } from '@/app/components/log-flow/RevealScreen'
import Satisfaction from '@/app/components/log-flow/Satisfaction'
import Card1Skills from '@/app/components/log-flow/Card1Skills'
import '@/app/components/log-flow/log-flow.css'

type LogStep = 'type' | 'curriculum' | 'photo' | 'voice' | 'card-skills' | 'reveal' | 'satisfaction'

interface LogDraft {
  type: ComponentType | null
  curriculums: string[]
  photoFiles: File[]
  photoPreviewUrls: string[]
  title: string
  description: string
  skills: string[]
  durationMinutes: number | null
}

const EMPTY_DRAFT: LogDraft = {
  type: null,
  curriculums: [],
  photoFiles: [],
  photoPreviewUrls: [],
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
  const [isStopped, setIsStopped] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [satisfactionCount, setSatisfactionCount] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [guardDest, setGuardDest] = useState<string | null>(null)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
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

  // Revoke all preview URLs on unmount
  useEffect(() => {
    const urls = draft.photoPreviewUrls
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On unsupported browsers, auto-open the typing state instead of voice
  useEffect(() => {
    if (step !== 'voice') return
    if (voice.isSupported) return
    setIsTyping(true)
  }, [step, voice.isSupported])

  // Dirty detection — anything captured beyond the empty draft
  const isDirty = useMemo(() => {
    if (step === 'satisfaction') return false
    return (
      draft.type !== null ||
      draft.curriculums.length > 0 ||
      draft.photoFiles.length > 0 ||
      draft.title.trim() !== '' ||
      draft.description.trim() !== '' ||
      draft.skills.length > 0 ||
      draft.durationMinutes !== null
    )
  }, [draft, step])
  isDirtyRef.current = isDirty

  useUnsavedGuard(isDirty, setGuardDest)

  // ── Voice handlers ─────────────────────────────────────────────────────────

  const handleVoiceStart = () => {
    if (!draft.type) return
    if (!voice.isSupported) {
      setError("Voice isn't supported on this browser. Tap to type instead.")
      return
    }
    setIsStopped(false)
    voice.startRecording()
  }

  const handleTypingStart = () => {
    setIsTyping(true)
  }

  // Called when the coach taps × in any active state → back to idle
  const handleCancel = () => {
    voice.reset()
    setIsStopped(false)
    setIsTyping(false)
  }

  // ■ stop button in recording → stopped (review before submit)
  const handleStop = () => {
    voice.stopRecording()
    setIsStopped(true)
  }

  // ↑ submit from stopped state (voice recording)
  const handleDone = async () => {
    if (!draft.type) return
    setIsStopped(false)
    try {
      const result = await voice.parseComponent(draft.type, availableSkills)
      if (!result.title && !result.description && result.skills.length === 0 && result.durationMinutes == null) {
        return
      }
      setDraft((d) => ({
        ...d,
        title: result.title || d.title,
        description: result.description || d.description,
        skills: result.skills.length > 0 ? result.skills : d.skills,
        durationMinutes: result.durationMinutes ?? d.durationMinutes,
      }))
      voice.reset()
      setStep('card-skills')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Voice parse failed')
    }
  }

  // ↑ submit from typing state (text input)
  const handleTypeSubmit = async (text: string) => {
    if (!draft.type) return
    setIsTyping(false)
    try {
      const result = await voice.parseComponent(draft.type, availableSkills, undefined, text)
      if (!result.title && !result.description && result.skills.length === 0 && result.durationMinutes == null) {
        return
      }
      setDraft((d) => ({
        ...d,
        title: result.title || d.title,
        description: result.description || d.description,
        skills: result.skills.length > 0 ? result.skills : d.skills,
        durationMinutes: result.durationMinutes ?? d.durationMinutes,
      }))
      voice.reset()
      setStep('card-skills')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Voice parse failed')
    }
  }

  // ── Photo handlers ─────────────────────────────────────────────────────────

  const handleCapturePhoto = (file: File) => {
    const url = URL.createObjectURL(file)
    setDraft((d) => ({
      ...d,
      photoFiles: [...d.photoFiles, file],
      photoPreviewUrls: [...d.photoPreviewUrls, url],
    }))
  }

  const handleRemovePhoto = (index: number) => {
    setDraft((d) => {
      URL.revokeObjectURL(d.photoPreviewUrls[index])
      return {
        ...d,
        photoFiles: d.photoFiles.filter((_, i) => i !== index),
        photoPreviewUrls: d.photoPreviewUrls.filter((_, i) => i !== index),
      }
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

  const handleSave = async (finalDraft: RevealDraft) => {
    if (!draft.type || draft.curriculums.length === 0 || draft.photoFiles.length === 0 || !finalDraft.title.trim()) {
      setError('Missing required fields')
      return
    }
    setSaving(true)
    try {
      const photoUrls = await Promise.all(draft.photoFiles.map(uploadStationPhoto))

      const { error: insertErr } = await supabase.from('components').insert({
        type: draft.type,
        title: finalDraft.title.trim(),
        curriculum: draft.curriculums[0],
        curriculums: draft.curriculums,
        description: finalDraft.description.trim() || null,
        skills: finalDraft.skills,
        photos: photoUrls,
        video_url: null,
        video_link: null,
        duration_minutes: finalDraft.durationMinutes,
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
    draft.photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    voice.reset()
    setIsStopped(false)
    setIsTyping(false)
    setError(null)
    setDraft(EMPTY_DRAFT)
    setStep('type')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const micState: import('@/app/components/log-flow/atoms').MicState = isTyping
    ? 'typing'
    : isStopped
    ? 'stopped'
    : voice.voiceState === 'recording'
    ? 'recording'
    : voice.voiceState === 'processing'
    ? 'parsing'
    : 'idle'

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
          previewUrls={draft.photoPreviewUrls}
          onCapture={handleCapturePhoto}
          onRemove={handleRemovePhoto}
          onNext={() => setStep('voice')}
          onBack={() => setStep('curriculum')}
          onClose={handleClose}
          type={draft.type!}
        />
      )}

      {step === 'voice' && draft.type && (
        <VoiceScreen
          state={micState}
          type={draft.type}
          photoPreviewUrls={draft.photoPreviewUrls}
          getAmplitude={voice.getAmplitude}
          onStart={handleVoiceStart}
          onTypingStart={handleTypingStart}
          onTypeSubmit={handleTypeSubmit}
          onCancel={handleCancel}
          onStop={handleStop}
          onDone={handleDone}
          onBack={() => {
            voice.reset()
            setIsStopped(false)
            setIsTyping(false)
            setStep('photo')
          }}
          onClose={handleClose}
        />
      )}

      {step === 'card-skills' && (
        <Card1Skills
          availableSkills={availableSkills}
          initialSelected={draft.skills}
          onApprove={(approvedSkills) => {
            setDraft((d) => ({ ...d, skills: approvedSkills }))
            setStep('reveal')
          }}
          onClose={handleClose}
          cardIndex={0}
          totalCards={3}
        />
      )}

      {step === 'reveal' && draft.type && (
        <RevealScreen
          type={draft.type}
          curricula={draft.curriculums}
          curriculumRows={curriculumRows}
          photoPreviewUrls={draft.photoPreviewUrls}
          draft={{
            title: draft.title,
            description: draft.description,
            skills: draft.skills,
            durationMinutes: draft.durationMinutes,
          }}
          onSave={handleSave}
          onBack={(savedDraft) => {
            setDraft((d) => ({
              ...d,
              title: savedDraft.title || d.title,
              description: savedDraft.description || d.description,
              skills: savedDraft.skills.length > 0 ? savedDraft.skills : d.skills,
              durationMinutes: savedDraft.durationMinutes ?? d.durationMinutes,
            }))
            voice.reset()
            setStep('voice')
          }}
          onClose={handleClose}
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
          }}
        />
      )}
    </div>
  )
}
