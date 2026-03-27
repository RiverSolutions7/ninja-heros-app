'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadLaneVideo, uploadGameVideo } from '@/app/lib/uploadVideo'
import {
  AGE_GROUPS,
  type AgeGroup,
  type BlockType,
  type ClassDraft,
  type DraftBlock,
  type DraftWarmupBlock,
  type DraftLaneBlock,
  type DraftGameBlock,
  type DraftStation,
} from '@/app/lib/database.types'
import BlockBuilder from '@/app/components/block-builder/BlockBuilder'

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
  const [draft, setDraft] = useState<ClassDraft>(defaultDraft)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)

  // Dynamic skills fetched from the DB, filtered by selected curriculum
  const [availableSkills, setAvailableSkills] = useState<string[]>([])

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

  // Called when a lane block adds a new skill inline
  function handleAddSkill(name: string) {
    setAvailableSkills((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    )
  }

  // ── Submit ───────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTitleError(null)

    if (!draft.title.trim()) {
      setTitleError('Class title is required')
      return
    }

    if (!draft.class_date) {
      setError('Please select a class date.')
      return
    }

    setSubmitting(true)

    try {
      // 1. Insert class row
      const { data: classRow, error: classErr } = await supabase
        .from('classes')
        .insert({
          title: draft.title.trim() || null,
          class_date: draft.class_date,
          age_group: draft.age_group,
          difficulty: draft.difficulty,
          notes: draft.notes.trim() || null,
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
            })
            .select()
            .single()

          if (lErr) throw lErr

          // Insert stations (with photo upload)
          for (let j = 0; j < draftBlock.stations.length; j++) {
            const station = draftBlock.stations[j]
            let photoUrl: string | null = null

            if (station.photoFile) {
              try {
                photoUrl = await uploadStationPhoto(station.photoFile)
              } catch (uploadErr) {
                console.error('Photo upload failed for station', j + 1, uploadErr)
              }
            }

            const { error: sErr } = await supabase.from('stations').insert({
              lane_block_id: laneRow.id,
              sort_order: j,
              equipment: station.equipment,
              description: station.description,
              photo_url: photoUrl,
            })
            if (sErr) throw sErr
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
        }
      }

      router.push(`/library/${classRow.id}`)
    } catch (err) {
      console.error('Save failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save class. Please try again.'
      )
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
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

      {/* Class details */}
      <div className="card p-4 mb-5 space-y-4">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider">Class Details</h2>

        {/* Title (required) */}
        <div>
          <label className="field-label" htmlFor="title">
            Class Title<span className="text-accent-fire ml-0.5">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={draft.title}
            onChange={(e) => {
              setDraft((d) => ({ ...d, title: e.target.value }))
              setTitleError(null)
            }}
            placeholder="e.g. Football Training Camp, Spider-Man Theme..."
            className="field-input"
          />
          {titleError && (
            <p className="text-accent-fire text-xs mt-1">{titleError}</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="field-label" htmlFor="class_date">Date</label>
          <input
            id="class_date"
            type="date"
            required
            value={draft.class_date}
            onChange={(e) => setDraft((d) => ({ ...d, class_date: e.target.value }))}
            className="field-input"
          />
        </div>

        {/* Age group */}
        <div>
          <label className="field-label" htmlFor="age_group">Curriculum</label>
          <div className="relative">
            <select
              id="age_group"
              value={draft.age_group}
              onChange={(e) =>
                setDraft((d) => ({ ...d, age_group: e.target.value as AgeGroup }))
              }
              className="field-select pr-8"
            >
              {AGE_GROUPS.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="field-label" htmlFor="notes">
            Coach Notes{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">
              (optional)
            </span>
          </label>
          <textarea
            id="notes"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Overall notes, energy level, what worked / didn't work..."
            rows={2}
            className="field-textarea"
          />
        </div>
      </div>

      {/* Block builder */}
      <div className="mb-6">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider mb-4">
          Class Sequence
        </h2>
        <BlockBuilder
          blocks={draft.blocks}
          onAdd={addBlock}
          onChange={updateBlock}
          onRemove={removeBlock}
          availableSkills={availableSkills}
          onAddSkill={handleAddSkill}
          ageGroup={draft.age_group}
        />
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
            Save Class
          </>
        )}
      </button>

      {/* Bottom spacer for fixed nav */}
      <div className="h-4" />
    </form>
  )
}
