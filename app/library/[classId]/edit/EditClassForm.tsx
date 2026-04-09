'use client'

import { useEffect, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { uploadLaneVideo, uploadGameVideo } from '@/app/lib/uploadVideo'
import {
  type AgeGroup,
  type CurriculumRow,
  type BlockType,
  type FullClass,
  type ClassDraft,
  type DraftBlock,
  type DraftWarmupBlock,
  type DraftLaneBlock,
  type DraftGameBlock,
  type DraftStation,
  type ComponentRow,
} from '@/app/lib/database.types'
import { componentToDraftBlock } from '@/app/lib/componentUtils'
import BlockBuilder from '@/app/components/block-builder/BlockBuilder'

// ── Convert a persisted FullClass into an editable ClassDraft ──────────────
function fullClassToDraft(cls: FullClass): ClassDraft {
  const blocks: DraftBlock[] = cls.blocks.map((block): DraftBlock => {
    if (block.type === 'warmup') {
      return {
        id: block.data.id,
        blockId: block.block.id,
        type: 'warmup',
        localId: crypto.randomUUID(),
        description: block.data.description,
        time: block.data.time,
        skill_focus: block.data.skill_focus ?? '',
      } satisfies DraftWarmupBlock
    }

    if (block.type === 'lane') {
      return {
        id: block.data.id,
        blockId: block.block.id,
        existingVideoUrl: block.data.video_url,
        type: 'lane',
        localId: crypto.randomUUID(),
        instructor_name: block.data.instructor_name ?? '',
        core_skills: [...block.data.core_skills],
        stations: block.stations.map((s): DraftStation => {
          // Use photo_urls if available, otherwise fall back to single photo_url
          const urls = s.photo_urls?.length > 0
            ? s.photo_urls
            : s.photo_url ? [s.photo_url] : []
          return {
            id: s.id,
            localId: crypto.randomUUID(),
            sort_order: s.sort_order,
            equipment: s.equipment,
            description: s.description,
            photos: urls.map((url) => ({
              localId: crypto.randomUUID(),
              photoFile: null,
              photoPreview: url,
              photo_url: url,
            })),
          }
        }),
        videoFile: null,
        // Use existing video URL as preview so the player shows immediately
        videoPreview: block.data.video_url,
      } satisfies DraftLaneBlock
    }

    // game
    return {
      id: block.data.id,
      blockId: block.block.id,
      existingVideoUrl: block.data.video_url,
      type: 'game',
      localId: crypto.randomUUID(),
      name: block.data.name,
      description: block.data.description ?? '',
      video_link: block.data.video_link ?? '',
      videoFile: null,
      videoPreview: block.data.video_url,
    } satisfies DraftGameBlock
  })

  return {
    title: cls.title ?? '',
    class_date: cls.class_date,
    age_group: cls.age_group,
    difficulty: cls.difficulty,
    notes: cls.notes ?? '',
    blocks,
  }
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

interface EditClassFormProps {
  cls: FullClass
  initialSkills: string[]
}

export default function EditClassForm({ cls, initialSkills }: EditClassFormProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<ClassDraft>(() => fullClassToDraft(cls))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableSkills, setAvailableSkills] = useState<string[]>(
    initialSkills.length > 0 ? initialSkills : []
  )
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])

  // Fetch curriculums on mount
  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
  }, [])

  // ── Block mutations ──────────────────────────────────────────

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

  function handleAddSkill(name: string) {
    setAvailableSkills((prev) =>
      prev.includes(name) ? prev : [...prev, name].sort()
    )
  }

  // ── Save ────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!draft.class_date) {
      setError('Please select a class date.')
      return
    }

    setSubmitting(true)

    try {
      // 1. Update class metadata
      const { error: classErr } = await supabase
        .from('classes')
        .update({
          title: draft.title.trim() || null,
          class_date: draft.class_date,
          age_group: draft.age_group,
          difficulty: draft.difficulty,
          notes: draft.notes.trim() || null,
        })
        .eq('id', cls.id)

      if (classErr) throw classErr

      // 2. Process each block — update existing, insert new
      const keptBlockIds = new Set<string>()

      for (let i = 0; i < draft.blocks.length; i++) {
        const draftBlock = draft.blocks[i]

        if (draftBlock.blockId) {
          // ── Existing block ──────────────────────────────────
          keptBlockIds.add(draftBlock.blockId)

          // Update sort order in case the coach reordered blocks
          const { error: sortErr } = await supabase
            .from('class_blocks')
            .update({ sort_order: i })
            .eq('id', draftBlock.blockId)
          if (sortErr) throw sortErr

          if (draftBlock.type === 'warmup') {
            const { error: wErr } = await supabase
              .from('warmup_blocks')
              .update({
                description: draftBlock.description,
                time: draftBlock.time,
                skill_focus: draftBlock.skill_focus.trim() || null,
              })
              .eq('block_id', draftBlock.blockId)
            if (wErr) throw wErr

          } else if (draftBlock.type === 'lane') {
            // Upload new video only if coach recorded one
            let videoUrl: string | null = draftBlock.existingVideoUrl ?? null
            if (draftBlock.videoFile) {
              try {
                videoUrl = await uploadLaneVideo(draftBlock.videoFile)
              } catch (err) {
                console.error('Lane video upload failed:', err)
              }
            }

            const { error: lErr } = await supabase
              .from('lane_blocks')
              .update({
                instructor_name: draftBlock.instructor_name.trim() || null,
                core_skills: draftBlock.core_skills,
                video_url: videoUrl,
              })
              .eq('block_id', draftBlock.blockId)
            if (lErr) throw lErr

            // Handle stations: update existing, insert new, delete removed
            const laneBlockId = draftBlock.id!
            const keptStationIds = new Set<string>()

            for (let j = 0; j < draftBlock.stations.length; j++) {
              const station = draftBlock.stations[j]
              const uploadedUrls: string[] = []

              for (const photo of station.photos) {
                if (photo.photoFile) {
                  try {
                    const url = await uploadStationPhoto(photo.photoFile)
                    uploadedUrls.push(url)
                  } catch (err) {
                    console.error('Station photo upload failed:', err)
                  }
                } else if (photo.photo_url) {
                  uploadedUrls.push(photo.photo_url)
                }
              }

              if (station.id) {
                keptStationIds.add(station.id)
                const { error: sErr } = await supabase
                  .from('stations')
                  .update({
                    sort_order: j,
                    equipment: station.equipment,
                    description: station.description,
                    photo_url: uploadedUrls[0] ?? null,
                    photo_urls: uploadedUrls,
                  })
                  .eq('id', station.id)
                if (sErr) throw sErr
              } else {
                const { data: newStation, error: sErr } = await supabase
                  .from('stations')
                  .insert({
                    lane_block_id: laneBlockId,
                    sort_order: j,
                    equipment: station.equipment,
                    description: station.description,
                    photo_url: uploadedUrls[0] ?? null,
                    photo_urls: uploadedUrls,
                  })
                  .select()
                  .single()
                if (sErr) throw sErr
                if (newStation) keptStationIds.add(newStation.id)
              }
            }

            // Delete stations that were removed
            const { data: existingStations } = await supabase
              .from('stations')
              .select('id')
              .eq('lane_block_id', laneBlockId)
            for (const s of existingStations ?? []) {
              if (!keptStationIds.has(s.id)) {
                await supabase.from('stations').delete().eq('id', s.id)
              }
            }

          } else if (draftBlock.type === 'game') {
            let videoUrl: string | null = draftBlock.existingVideoUrl ?? null
            if (draftBlock.videoFile) {
              try {
                videoUrl = await uploadGameVideo(draftBlock.videoFile)
              } catch (err) {
                console.error('Game video upload failed:', err)
              }
            }

            const { error: gErr } = await supabase
              .from('game_blocks')
              .update({
                name: draftBlock.name,
                description: draftBlock.description.trim() || null,
                video_link: draftBlock.video_link.trim() || null,
                video_url: videoUrl,
              })
              .eq('block_id', draftBlock.blockId)
            if (gErr) throw gErr
          }

        } else {
          // ── New block (added during editing) ────────────────
          const { data: blockRow, error: blockErr } = await supabase
            .from('class_blocks')
            .insert({
              class_id: cls.id,
              block_type: draftBlock.type,
              sort_order: i,
            })
            .select()
            .single()
          if (blockErr) throw blockErr

          keptBlockIds.add(blockRow.id)

          if (draftBlock.type === 'warmup') {
            const { error: wErr } = await supabase.from('warmup_blocks').insert({
              block_id: blockRow.id,
              description: draftBlock.description,
              time: draftBlock.time,
              skill_focus: draftBlock.skill_focus.trim() || null,
            })
            if (wErr) throw wErr

          } else if (draftBlock.type === 'lane') {
            let videoUrl: string | null = null
            if (draftBlock.videoFile) {
              try {
                videoUrl = await uploadLaneVideo(draftBlock.videoFile)
              } catch (err) {
                console.error('Lane video upload failed:', err)
              }
            }

            const { data: laneRow, error: lErr } = await supabase
              .from('lane_blocks')
              .insert({
                block_id: blockRow.id,
                instructor_name: draftBlock.instructor_name.trim() || null,
                core_skills: draftBlock.core_skills,
                video_url: videoUrl,
              })
              .select()
              .single()
            if (lErr) throw lErr

            for (let j = 0; j < draftBlock.stations.length; j++) {
              const station = draftBlock.stations[j]
              const uploadedUrls: string[] = []
              for (const photo of station.photos) {
                if (photo.photoFile) {
                  try {
                    const url = await uploadStationPhoto(photo.photoFile)
                    uploadedUrls.push(url)
                  } catch (err) {
                    console.error('Station photo upload failed:', err)
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
            }

          } else if (draftBlock.type === 'game') {
            let videoUrl: string | null = null
            if (draftBlock.videoFile) {
              try {
                videoUrl = await uploadGameVideo(draftBlock.videoFile)
              } catch (err) {
                console.error('Game video upload failed:', err)
              }
            }

            const { error: gErr } = await supabase.from('game_blocks').insert({
              block_id: blockRow.id,
              name: draftBlock.name,
              description: draftBlock.description.trim() || null,
              video_link: draftBlock.video_link.trim() || null,
              video_url: videoUrl,
            })
            if (gErr) throw gErr
          }
        }
      }

      // 3. Delete class_blocks that were removed (cascades to type-specific rows)
      const { data: allBlockRows } = await supabase
        .from('class_blocks')
        .select('id')
        .eq('class_id', cls.id)
      for (const row of allBlockRows ?? []) {
        if (!keptBlockIds.has(row.id)) {
          await supabase.from('class_blocks').delete().eq('id', row.id)
        }
      }

      router.push(`/library/${cls.id}`)
    } catch (err) {
      console.error('Save failed:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save changes. Please try again.'
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
          href={`/library/${cls.id}`}
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-xl text-text-primary leading-none">Edit Class</h1>
          <p className="text-text-dim text-xs mt-0.5">Just Tumble Ninja H.E.R.O.S.</p>
        </div>
      </div>

      {/* Class details */}
      <div className="card p-4 mb-5 space-y-4">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider">Class Details</h2>

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
          <label className="field-label" htmlFor="age_group">Age Group</label>
          <div className="relative">
            <select
              id="age_group"
              value={draft.age_group}
              onChange={(e) =>
                setDraft((d) => ({ ...d, age_group: e.target.value as AgeGroup }))
              }
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

        {/* Title */}
        <div>
          <label className="field-label" htmlFor="title">
            Class Title{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="e.g. Football Training Camp, Spider-Man Theme..."
            className="field-input"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="field-label" htmlFor="notes">
            Coach Notes{' '}
            <span className="text-text-dim font-normal normal-case tracking-normal">(optional)</span>
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
          onAddFromLibrary={addBlockFromLibrary}
          onChange={updateBlock}
          onRemove={removeBlock}
          onReorder={reorderBlocks}
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

      {/* Save */}
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
