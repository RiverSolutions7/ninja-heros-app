'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadLaneVideo, uploadGameVideo } from '@/app/lib/uploadVideo'
import type { DraftPhotoItem } from '@/app/lib/database.types'
import { autoPopulateComponents } from '@/app/lib/autoPopulateComponents'
import type { ComponentCandidate } from '@/app/lib/autoPopulateComponents'
import { componentToDraftBlock } from '@/app/lib/componentUtils'
import { arrayMove } from '@dnd-kit/sortable'
import {
  type AgeGroup,
  type Difficulty,
  type CurriculumRow,
  type BlockType,
  type ClassDraft,
  type DraftBlock,
  type DraftWarmupBlock,
  type DraftLaneBlock,
  type DraftGameBlock,
  type DraftStation,
  type ComponentRow,
} from '@/app/lib/database.types'
import BlockBuilder from '@/app/components/block-builder/BlockBuilder'
import AddBlockMenu from '@/app/components/block-builder/AddBlockMenu'
import Toast from '@/app/components/ui/Toast'

const DRAFT_KEY = 'ninja-heros-class-draft'

interface StoredDraft {
  title: string
  class_date: string
  age_group: string
  difficulty: string
  noteLines: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[]
  savedAt: string
}

function parseDurationMinutes(time: string): number | null {
  const match = time.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function createEmptyBlock(type: BlockType): DraftBlock {
  if (type === 'warmup') {
    return {
      type: 'warmup',
      localId: crypto.randomUUID(),
      description: '',
      time: '5 min',
      skill_focus: '',
    } satisfies DraftWarmupBlock
  }
  if (type === 'lane') {
    return {
      type: 'lane',
      localId: crypto.randomUUID(),
      instructor_name: '',
      core_skills: [],
      stations: [],
      videoFile: null,
      videoPreview: null,
    } satisfies DraftLaneBlock
  }
  return {
    type: 'game',
    localId: crypto.randomUUID(),
    name: '',
    description: '',
    video_link: '',
    videoFile: null,
    videoPreview: null,
  } satisfies DraftGameBlock
}

const defaultDraft: ClassDraft = {
  title: '',
  class_date: today(),
  age_group: 'Junior Ninjas (5-9)',
  difficulty: 'Intermediate',
  notes: '',
  blocks: [],
}

export default function NewClassPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple')
  const [draft, setDraft] = useState<ClassDraft>(defaultDraft)
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [noteLines, setNoteLines] = useState<string[]>([])

  // Simple mode state
  const [simpleNotes, setSimpleNotes] = useState('')
  const [simplePhotos, setSimplePhotos] = useState<DraftPhotoItem[]>([])
  const simpleCameraRef = useRef<HTMLInputElement>(null)
  const simpleLibraryRef = useRef<HTMLInputElement>(null)

  // Draft auto-save
  const [savedDraft, setSavedDraft] = useState<StoredDraft | null>(null)
  const draftRef = useRef(draft)
  const noteLinesRef = useRef(noteLines)

  // Curriculums fetched from DB
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])

  // Dynamic skills fetched from the DB, filtered by selected curriculum
  const [availableSkills, setAvailableSkills] = useState<string[]>([])

  // Keep refs in sync so interval/effects always see latest state
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { noteLinesRef.current = noteLines }, [noteLines])

  function saveDraftToStorage() {
    const d = draftRef.current
    const nl = noteLinesRef.current
    if (!d.title && d.blocks.length === 0 && nl.length === 0) return
    try {
      const data: StoredDraft = {
        title: d.title,
        class_date: d.class_date,
        age_group: d.age_group,
        difficulty: d.difficulty,
        noteLines: nl,
        blocks: d.blocks.map((block) => {
          if (block.type === 'warmup') {
            return { type: 'warmup', localId: block.localId, description: block.description, time: block.time, skill_focus: block.skill_focus }
          }
          if (block.type === 'lane') {
            return {
              type: 'lane', localId: block.localId, instructor_name: block.instructor_name,
              core_skills: block.core_skills, duration_minutes: block.duration_minutes ?? null,
              stations: block.stations.map((s: DraftStation) => ({
                localId: s.localId, sort_order: s.sort_order, equipment: s.equipment, description: s.description,
              })),
            }
          }
          return {
            type: 'game', localId: block.localId, name: block.name, description: block.description,
            video_link: block.video_link, skills: block.skills ?? [], duration_minutes: block.duration_minutes ?? null,
          }
        }),
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch { /* ignore quota errors */ }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  function handleRestore() {
    if (!savedDraft) return
    try {
      const blocks: DraftBlock[] = (savedDraft.blocks ?? []).map((b) => {
        if (b.type === 'warmup') {
          return { type: 'warmup', localId: b.localId || crypto.randomUUID(), description: b.description || '', time: b.time || '5 min', skill_focus: b.skill_focus || '' } as DraftWarmupBlock
        }
        if (b.type === 'lane') {
          return {
            type: 'lane', localId: b.localId || crypto.randomUUID(), instructor_name: b.instructor_name || '',
            core_skills: b.core_skills || [], duration_minutes: b.duration_minutes ?? null,
            stations: (b.stations ?? []).map((s: { localId?: string; sort_order?: number; equipment?: string; description?: string }) => ({
              localId: s.localId || crypto.randomUUID(), sort_order: s.sort_order ?? 0,
              equipment: s.equipment || '', description: s.description || '', photos: [],
            })),
            videoFile: null, videoPreview: null,
          } as DraftLaneBlock
        }
        return {
          type: 'game', localId: b.localId || crypto.randomUUID(), name: b.name || '',
          description: b.description || '', video_link: b.video_link || '',
          skills: b.skills || [], duration_minutes: b.duration_minutes ?? null,
          videoFile: null, videoPreview: null,
        } as DraftGameBlock
      })
      setDraft({
        title: savedDraft.title || '',
        class_date: savedDraft.class_date || today(),
        age_group: savedDraft.age_group || 'Junior Ninjas (5-9)',
        difficulty: (savedDraft.difficulty || 'Intermediate') as Difficulty,
        notes: '',
        blocks,
      })
      setNoteLines(savedDraft.noteLines || [])
    } catch { /* ignore corrupt data */ }
    setSavedDraft(null)
  }

  function handleDiscard() {
    clearDraft()
    setSavedDraft(null)
  }

  // Check for Today's Plan prefill from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('ninja-heros-plan-prefill')
      if (!raw) return
      sessionStorage.removeItem('ninja-heros-plan-prefill')
      const items: { localId: string; component: ComponentRow; durationMinutes: number | null }[] = JSON.parse(raw)
      if (!Array.isArray(items) || items.length === 0) return
      const blocks: DraftBlock[] = items.map((item) => componentToDraftBlock(item.component))
      setDraft((d) => ({ ...d, blocks }))
    } catch { /* ignore corrupt data */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed: StoredDraft = JSON.parse(raw)
        if (parsed.title || (parsed.blocks?.length ?? 0) > 0 || (parsed.noteLines?.length ?? 0) > 0) {
          setSavedDraft(parsed)
        }
      }
    } catch { /* ignore corrupt data */ }
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    const id = setInterval(saveDraftToStorage, 30_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save on block add/remove
  useEffect(() => {
    saveDraftToStorage()
  }, [draft.blocks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch curriculums once on mount
  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        const rows = (data as CurriculumRow[]) ?? []
        setCurriculums(rows)
        // Default to first curriculum if available
        if (rows.length > 0 && draft.age_group === 'Junior Ninjas (5-9)') {
          // Only override if current default isn't in the list
          const inList = rows.some((c) => c.age_group === draft.age_group)
          if (!inList) setDraft((d) => ({ ...d, age_group: rows[0].age_group }))
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase
      .from('skills')
      .select('name')
      .eq('age_group', draft.age_group)
      .order('name')
      .then(({ data }) => {
        setAvailableSkills(data?.map((r) => r.name) ?? [])
      })
  }, [draft.age_group])

  // ── Block mutations ─────────────────────────────────────────

  function addBlock(type: BlockType, afterIndex?: number) {
    const newBlock = createEmptyBlock(type)
    setDraft((prev) => {
      const blocks = [...prev.blocks]
      if (afterIndex === undefined || afterIndex < 0) {
        blocks.push(newBlock)
      } else {
        blocks.splice(afterIndex + 1, 0, newBlock)
      }
      return { ...prev, blocks }
    })
  }

  function updateBlock(localId: string, changes: Partial<DraftBlock>) {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.localId === localId ? { ...b, ...changes } as DraftBlock : b
      ),
    }))
  }

  function removeBlock(localId: string) {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.localId !== localId),
    }))
  }

  function reorderBlocks(fromIndex: number, toIndex: number) {
    setDraft((prev) => ({
      ...prev,
      blocks: arrayMove(prev.blocks, fromIndex, toIndex),
    }))
  }

  function addBlockFromLibrary(component: ComponentRow, afterIndex?: number) {
    const newBlock = componentToDraftBlock(component)
    setDraft((prev) => {
      const blocks = [...prev.blocks]
      if (afterIndex === undefined || afterIndex < 0) {
        blocks.push(newBlock)
      } else {
        blocks.splice(afterIndex + 1, 0, newBlock)
      }
      return { ...prev, blocks }
    })
  }

  // Called when a lane block adds a new skill inline
  function handleAddSkill(name: string) {
    setAvailableSkills((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    )
  }

  // ── Submit ───────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    console.log('SAVE TRIGGERED')
    e.preventDefault()
    setTitleError(null)

    if (!draft.title.trim()) {
      setTitleError('Class title is required')
      return
    }

    if (!draft.class_date) {
      setToast({ message: 'Please select a class date.', type: 'error' })
      return
    }

    // Validate that every station within each lane block has been named
    for (const block of draft.blocks) {
      if (block.type === 'lane') {
        for (const station of block.stations) {
          if (!station.equipment.trim()) {
            setTitleError('Please name all your stations before saving.')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
        }
      }
    }

    setSubmitting(true)

    // Collect component candidates as we save blocks (fire-and-forget after save)
    const componentCandidates: ComponentCandidate[] = []

    try {
      // 1. Insert class row
      const { data: classRow, error: classErr } = await supabase
        .from('classes')
        .insert({
          title: draft.title.trim() || null,
          class_date: draft.class_date,
          age_group: draft.age_group,
          difficulty: draft.difficulty,
          notes: noteLines.filter((s) => s.trim()).join('\n') || null,
        })
        .select()
        .single()

      if (classErr) throw classErr

      // 2. Insert blocks in order
      for (let i = 0; i < draft.blocks.length; i++) {
        const draftBlock = draft.blocks[i]

        const { data: blockRow, error: blockErr } = await supabase
          .from('class_blocks')
          .insert({
            class_id: classRow.id,
            block_type: draftBlock.type,
            sort_order: i,
          })
          .select()
          .single()

        if (blockErr) throw blockErr

        if (draftBlock.type === 'warmup') {
          const { error: wErr } = await supabase.from('warmup_blocks').insert({
            block_id: blockRow.id,
            description: draftBlock.description,
            time: draftBlock.time,
            skill_focus: draftBlock.skill_focus.trim() || null,
          })
          if (wErr) throw wErr

          // Upload warmup photos for component library
          const warmupPhotoUrls: string[] = []
          for (const photo of (draftBlock.photos ?? [])) {
            if (photo.photoFile) {
              try {
                const url = await uploadStationPhoto(photo.photoFile)
                warmupPhotoUrls.push(url)
              } catch (uploadErr) {
                console.error('Warmup photo upload failed:', uploadErr)
              }
            } else if (photo.photo_url) {
              warmupPhotoUrls.push(photo.photo_url)
            }
          }

          // Component candidate: warmup — always push, fall back to 'Warmup' if no description
          componentCandidates.push({
            type: 'warmup',
            title: draftBlock.description.slice(0, 80).trim() || 'Warmup',
            curriculum: draft.age_group,
            description: draftBlock.description.trim() || null,
            skills: draftBlock.skill_focus.trim() ? [draftBlock.skill_focus.trim()] : null,
            photos: warmupPhotoUrls.length > 0 ? warmupPhotoUrls : null,
            duration_minutes: parseDurationMinutes(draftBlock.time),
            equipment: null,
          })

        } else if (draftBlock.type === 'lane') {
          // Upload lane video if present
          let laneVideoUrl: string | null = null
          if (draftBlock.videoFile) {
            try {
              laneVideoUrl = await uploadLaneVideo(draftBlock.videoFile)
            } catch (uploadErr) {
              console.error('Lane video upload failed:', uploadErr)
            }
          }

          const { data: laneRow, error: lErr } = await supabase
            .from('lane_blocks')
            .insert({
              block_id: blockRow.id,
              instructor_name: draftBlock.instructor_name.trim() || null,
              core_skills: draftBlock.core_skills,
              video_url: laneVideoUrl,
              duration_minutes: draftBlock.duration_minutes ?? null,
            })
            .select()
            .single()

          if (lErr) throw lErr

          // Insert stations (with photo uploads) — one component candidate per station
          for (let j = 0; j < draftBlock.stations.length; j++) {
            const station = draftBlock.stations[j]
            const uploadedUrls: string[] = []

            for (const photo of station.photos) {
              if (photo.photoFile) {
                try {
                  const url = await uploadStationPhoto(photo.photoFile)
                  uploadedUrls.push(url)
                } catch (uploadErr) {
                  console.error('Photo upload failed for station', j + 1, uploadErr)
                }
              } else if (photo.photo_url) {
                uploadedUrls.push(photo.photo_url)
              }
            }

            const { error: sErr } = await supabase.from('stations').insert({
              lane_block_id: laneRow.id,
              sort_order: j,
              equipment: station.equipment,
              description: station.description,
              photo_url: uploadedUrls[0] ?? null,
              photo_urls: uploadedUrls,
            })
            if (sErr) throw sErr

            // One component candidate per named station (validated above — all have names)
            componentCandidates.push({
              type: 'station',
              title: station.equipment.trim(),
              curriculum: draft.age_group,
              description: station.description.trim() || null,
              skills: draftBlock.core_skills.length > 0 ? draftBlock.core_skills : null,
              photos: uploadedUrls.length > 0 ? uploadedUrls : null,
              duration_minutes: draftBlock.duration_minutes ?? null,
              equipment: station.equipment.trim(),
              video_link: null,
            })
          }

        } else if (draftBlock.type === 'game') {
          // Upload game video if present
          let gameVideoUrl: string | null = null
          if (draftBlock.videoFile) {
            try {
              gameVideoUrl = await uploadGameVideo(draftBlock.videoFile)
            } catch (uploadErr) {
              console.error('Game video upload failed:', uploadErr)
            }
          }

          const { error: gErr } = await supabase.from('game_blocks').insert({
            block_id: blockRow.id,
            name: draftBlock.name,
            description: draftBlock.description.trim() || null,
            video_link: draftBlock.video_link.trim() || null,
            video_url: gameVideoUrl,
          })
          if (gErr) throw gErr

          // Upload game photos for component library
          const gamePhotoUrls: string[] = []
          for (const photo of (draftBlock.photos ?? [])) {
            if (photo.photoFile) {
              try {
                const url = await uploadStationPhoto(photo.photoFile)
                gamePhotoUrls.push(url)
              } catch (uploadErr) {
                console.error('Game photo upload failed:', uploadErr)
              }
            } else if (photo.photo_url) {
              gamePhotoUrls.push(photo.photo_url)
            }
          }

          // Component candidate: game
          const gameTitle = draftBlock.name.trim()
          if (gameTitle) {
            componentCandidates.push({
              type: 'game',
              title: gameTitle,
              curriculum: draft.age_group,
              description: draftBlock.description.trim() || null,
              skills: (draftBlock.skills ?? []).length > 0 ? draftBlock.skills! : null,
              photos: gamePhotoUrls.length > 0 ? gamePhotoUrls : null,
              duration_minutes: draftBlock.duration_minutes ?? null,
              equipment: null,
              video_link: draftBlock.video_link.trim() || null,
            })
          }
        }
      }

      // Extract components before navigating so logs are visible
      console.log(
        `[handleSubmit] firing autoPopulateComponents with ${componentCandidates.length} candidates:`,
        componentCandidates.map((c) => `${c.type}:"${c.title}"`)
      )
      try {
        await autoPopulateComponents(componentCandidates)
      } catch (err) {
        console.error('Component auto-populate failed:', err)
      }

      clearDraft()
      setToast({ message: 'Class saved ✓', type: 'success' })
      await new Promise((r) => setTimeout(r, 1500))
      router.push(`/library/${classRow.id}`)
    } catch (err) {
      console.error('Save failed:', err)
      setToast({ message: 'Something went wrong. Please try again.', type: 'error' })
      setSubmitting(false)
    }
  }

  // ── Simple mode helpers ──────────────────────────────────────

  function handleSimplePhotoFiles(files: FileList | null) {
    if (!files) return
    const newPhotos: DraftPhotoItem[] = Array.from(files).map((f) => ({
      localId: crypto.randomUUID(),
      photoFile: f,
      photoPreview: URL.createObjectURL(f),
      photo_url: null,
    }))
    setSimplePhotos((prev) => [...prev, ...newPhotos])
  }

  function removeSimplePhoto(localId: string) {
    setSimplePhotos((prev) => {
      const item = prev.find((p) => p.localId === localId)
      if (item?.photoPreview) URL.revokeObjectURL(item.photoPreview)
      return prev.filter((p) => p.localId !== localId)
    })
  }

  async function handleSimpleSubmit() {
    if (!draft.title.trim()) {
      setTitleError('Class title is required')
      return
    }
    setSubmitting(true)

    try {
      const uploadedUrls: string[] = []
      for (const p of simplePhotos) {
        if (p.photoFile) {
          const url = await uploadStationPhoto(p.photoFile)
          uploadedUrls.push(url)
        }
      }

      const { data, error } = await supabase
        .from('classes')
        .insert({
          title: draft.title.trim(),
          class_date: draft.class_date,
          age_group: draft.age_group,
          difficulty: 'Intermediate' as Difficulty,
          notes: simpleNotes.trim() || null,
          photos: uploadedUrls,
        })
        .select('id')
        .single()

      if (error) throw error
      router.push(`/library/${data.id}`)
    } catch (err) {
      console.error('Quick log save failed:', err)
      setToast({ message: 'Failed to save. Please try again.', type: 'error' })
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pt-2">
        <Link
          href="/library"
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-xl text-text-primary leading-none">Log New Class</h1>
          <p className="text-text-dim text-xs mt-0.5">Just Tumble Ninja H.E.R.O.S.</p>
        </div>
      </div>

      {/* Simple / Advanced toggle */}
      <div className="flex gap-1 mb-5 bg-bg-card border border-bg-border rounded-xl p-1">
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={[
            'flex-1 py-2 rounded-lg text-sm font-heading transition-all text-center',
            mode === 'simple'
              ? 'bg-accent-fire text-white shadow-glow-fire'
              : 'text-text-muted hover:text-text-primary',
          ].join(' ')}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          className={[
            'flex-1 py-2 rounded-lg text-sm font-heading transition-all text-center',
            mode === 'advanced'
              ? 'bg-accent-fire text-white shadow-glow-fire'
              : 'text-text-muted hover:text-text-primary',
          ].join(' ')}
        >
          Advanced
        </button>
      </div>

      {/* ── Simple mode ── */}
      {mode === 'simple' && (
        <div className="px-1 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setTitleError(null) }}
              placeholder="Class title..."
              className="w-full bg-transparent border-b border-bg-border/50 py-2 text-text-primary text-lg placeholder:text-text-dim/40 focus:outline-none focus:border-accent-fire/50 transition-colors"
            />
            {titleError && <p className="text-accent-fire text-xs mt-1">{titleError}</p>}
          </div>

          {/* Date + Curriculum */}
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={draft.class_date}
              onChange={(e) => setDraft((d) => ({ ...d, class_date: e.target.value }))}
              className="bg-transparent border-b border-bg-border/40 py-1.5 text-text-muted text-sm focus:outline-none focus:border-accent-fire/40 transition-colors flex-shrink-0"
              style={{ colorScheme: 'dark' }}
            />
            <div className="relative flex-1 min-w-0">
              <select
                value={draft.age_group}
                onChange={(e) => setDraft((d) => ({ ...d, age_group: e.target.value }))}
                className="w-full bg-transparent border-b border-bg-border/40 py-1.5 text-text-muted text-sm focus:outline-none focus:border-accent-fire/40 transition-colors appearance-none cursor-pointer pr-5"
              >
                {curriculums.map((c) => (
                  <option key={c.id} value={c.age_group}>{c.label}</option>
                ))}
              </select>
              <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Notes textarea */}
          <textarea
            value={simpleNotes}
            onChange={(e) => setSimpleNotes(e.target.value)}
            placeholder="What did you cover? Warmup, stations, games, notes for next time..."
            rows={5}
            className="w-full bg-bg-card border border-bg-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim/40 focus:outline-none focus:border-accent-fire/50 transition-colors resize-none"
          />

          {/* Photo buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => simpleCameraRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm text-text-muted border border-bg-border rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => simpleLibraryRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm text-text-muted border border-bg-border rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              From Library
            </button>
            <input ref={simpleCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleSimplePhotoFiles(e.target.files)} />
            <input ref={simpleLibraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleSimplePhotoFiles(e.target.files)} />
          </div>

          {/* Photo thumbnails */}
          {simplePhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {simplePhotos.map((p) => (
                <div key={p.localId} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photoPreview!} alt="" className="w-16 h-16 rounded-xl object-cover border border-bg-border" />
                  <button
                    type="button"
                    onClick={() => removeSimplePhoto(p.localId)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-bg-primary border border-bg-border rounded-full flex items-center justify-center text-text-dim hover:text-accent-fire transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSimpleSubmit}
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
                  Save Class
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Advanced mode ── */}
      {mode === 'advanced' && (
      <div>
      {/* Draft restore banner */}
      {savedDraft && (
        <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-900/25 border border-amber-700/40 rounded-xl">
          <p className="text-text-muted text-sm leading-snug">You have an unfinished class. Restore draft?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleRestore}
              className="text-xs font-semibold text-accent-gold px-3 py-1.5 rounded-lg border border-accent-gold/40 hover:bg-accent-gold/10 transition-colors"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              className="text-xs text-text-dim px-3 py-1.5 rounded-lg border border-bg-border hover:bg-white/5 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Compact class details — no card, no section label */}
      <div className="px-1 mb-5 space-y-2">
        {/* Title */}
        <div>
          <input
            id="title"
            type="text"
            value={draft.title}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }))
              setTitleError(null)
            }}
            placeholder="Class title..."
            className="w-full bg-transparent border-b border-bg-border/50 py-2 text-text-primary text-lg placeholder:text-text-dim/40 focus:outline-none focus:border-accent-fire/50 transition-colors"
          />
          {titleError && (
            <p className="text-accent-fire text-xs mt-1">{titleError}</p>
          )}
        </div>

        {/* Date + Curriculum on one row */}
        <div className="flex items-center gap-4">
          <input
            id="class_date"
            type="date"
            required
            value={draft.class_date}
            onChange={(e) => setDraft((d) => ({ ...d, class_date: e.target.value }))}
            className="bg-transparent border-b border-bg-border/40 py-1.5 text-text-muted text-sm focus:outline-none focus:border-accent-fire/40 transition-colors flex-shrink-0"
            style={{ colorScheme: 'dark' }}
          />
          <div className="relative flex-1 min-w-0">
            <select
              id="age_group"
              value={draft.age_group}
              onChange={(e) => setDraft((d) => ({ ...d, age_group: e.target.value as AgeGroup }))}
              className="w-full bg-transparent border-b border-bg-border/40 py-1.5 text-text-muted text-sm focus:outline-none focus:border-accent-fire/40 transition-colors appearance-none cursor-pointer pr-5"
            >
              {curriculums.map((c) => (
                <option key={c.id} value={c.age_group}>{c.label}</option>
              ))}
            </select>
            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dynamic note lines */}
        {noteLines.map((note, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <input
              type="text"
              value={note}
              onChange={(e) => setNoteLines((prev) => prev.map((n, idx) => idx === i ? e.target.value : n))}
              placeholder="Note..."
              autoFocus={i === noteLines.length - 1}
              className="flex-1 bg-transparent border-b border-bg-border/30 py-1.5 text-text-dim text-sm placeholder:text-text-dim/30 focus:outline-none focus:border-accent-fire/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setNoteLines((prev) => prev.filter((_, idx) => idx !== i))}
              className="text-text-dim/30 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* + Add Note */}
        <button
          type="button"
          onClick={() => setNoteLines((prev) => [...prev, ''])}
          className="flex items-center gap-1.5 text-xs text-text-dim/50 hover:text-text-dim transition-colors py-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Note
        </button>
      </div>

      {/* Block builder — hero button when empty, normal builder when blocks exist */}
      <div className="mb-6">
        {draft.blocks.length === 0 ? (
          <AddBlockMenu
            hero
            onAdd={(type) => addBlock(type, -1)}
            onAddFromLibrary={(c) => addBlockFromLibrary(c, -1)}
            ageGroup={draft.age_group}
          />
        ) : (
          <BlockBuilder
            blocks={draft.blocks}
            onAdd={addBlock}
            onAddFromLibrary={addBlockFromLibrary}
            onChange={updateBlock}
            onRemove={removeBlock}
            onReorder={reorderBlocks}
            availableSkills={availableSkills}
            onAddSkill={handleAddSkill}
            ageGroup={draft.age_group}
          />
        )}
      </div>

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
            Save Class
          </>
        )}
      </button>

      <div className="h-4" />

      </div>)}

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
