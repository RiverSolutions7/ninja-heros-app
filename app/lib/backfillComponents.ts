import { supabase } from './supabase'
import { autoPopulateComponents } from './autoPopulateComponents'
import type { ComponentCandidate } from './autoPopulateComponents'

function parseDurationMinutes(time: string): number | null {
  const match = time.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * One-time backfill: reads all existing classes and extracts their blocks
 * into the components table. Safe to run repeatedly — dedup prevents doubles.
 * Called from instrumentation.ts on server start.
 */
export async function backfillComponents(): Promise<void> {
  const { data: classes, error: classErr } = await supabase
    .from('classes')
    .select('id, age_group')

  if (classErr || !classes?.length) return

  const candidates: ComponentCandidate[] = []

  for (const cls of classes) {
    const { data: blockRows } = await supabase
      .from('class_blocks')
      .select('*')
      .eq('class_id', cls.id)
      .order('sort_order')

    if (!blockRows?.length) continue

    for (const block of blockRows) {
      if (block.block_type === 'warmup') {
        const { data: warmup } = await supabase
          .from('warmup_blocks')
          .select('*')
          .eq('block_id', block.id)
          .single()

        if (warmup) {
          const title = (warmup.description as string)?.slice(0, 80).trim()
          if (title) {
            candidates.push({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: 'warmup' as any,
              title,
              curriculum: cls.age_group,
              description: (warmup.description as string)?.trim() || null,
              skills: (warmup.skill_focus as string)?.trim()
                ? [(warmup.skill_focus as string).trim()]
                : null,
              photos: null,
              duration_minutes: parseDurationMinutes(warmup.time as string || ''),
              equipment: null,
            })
          }
        }
      } else if (block.block_type === 'lane') {
        const { data: lane } = await supabase
          .from('lane_blocks')
          .select('*')
          .eq('block_id', block.id)
          .single()

        if (lane) {
          const { data: stations } = await supabase
            .from('stations')
            .select('*')
            .eq('lane_block_id', lane.id)
            .order('sort_order')

          const allPhotos: string[] = []
          const equipmentParts: string[] = []
          const descriptionParts: string[] = []

          for (const station of stations ?? []) {
            const urls = (station.photo_urls as string[]) ?? []
            if (urls.length) allPhotos.push(...urls)
            if ((station.equipment as string)?.trim())
              equipmentParts.push((station.equipment as string).trim())
            if ((station.description as string)?.trim())
              descriptionParts.push((station.description as string).trim())
          }

          const title =
            (lane.instructor_name as string)?.trim() || 'Obstacle Course Station'
          candidates.push({
            type: 'station',
            title,
            curriculum: cls.age_group,
            description: descriptionParts.join('\n\n') || null,
            skills: (lane.core_skills as string[])?.length
              ? (lane.core_skills as string[])
              : null,
            photos: allPhotos.length ? allPhotos : null,
            duration_minutes: null,
            equipment: equipmentParts.join(', ') || null,
          })
        }
      } else if (block.block_type === 'game') {
        const { data: game } = await supabase
          .from('game_blocks')
          .select('*')
          .eq('block_id', block.id)
          .single()

        if (game && (game.name as string)?.trim()) {
          candidates.push({
            type: 'game',
            title: (game.name as string).trim(),
            curriculum: cls.age_group,
            description: (game.description as string)?.trim() || null,
            skills: null,
            photos: null,
            duration_minutes: null,
            equipment: null,
          })
        }
      }
    }
  }

  if (candidates.length > 0) {
    await autoPopulateComponents(candidates)
    console.log(
      `[backfill] Processed ${candidates.length} component candidates from ${classes.length} classes`
    )
  }
}
