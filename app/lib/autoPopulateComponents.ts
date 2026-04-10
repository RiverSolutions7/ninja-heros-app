import { supabase } from './supabase'
import type { ComponentType } from './database.types'

export interface ComponentCandidate {
  type: ComponentType
  title: string
  curriculum: string
  description: string | null
  skills: string[] | null
  photos: string[] | null
  duration_minutes: number | null
  equipment: string | null
  video_link?: string | null
}

/**
 * After saving a class, silently extract and save its components to the
 * components table. Dedup key: type + title (case-insensitive) + curriculum.
 * If a matching component already exists, merge in any new data (combine
 * photos, overwrite other fields only when the new value is non-empty).
 * Fire-and-forget — do not await this in the UI.
 */
export async function autoPopulateComponents(
  candidates: ComponentCandidate[]
): Promise<void> {
  const valid = candidates.filter((c) => c.title.trim())
  console.log(
    `[autoPopulateComponents] called with ${candidates.length} candidates, ${valid.length} valid:`,
    valid.map((c) => `${c.type}:"${c.title}"`)
  )
  if (valid.length === 0) return

  for (const candidate of valid) {
    const title = candidate.title.trim()

    // Look for an existing component with the same type + title + curriculum
    const { data, error: selectErr } = await supabase
      .from('components')
      .select('id, photos')
      .eq('type', candidate.type)
      .ilike('title', title)
      .eq('curriculum', candidate.curriculum)
      .limit(1)

    if (selectErr) {
      console.error(`[autoPopulateComponents] select failed for "${title}":`, JSON.stringify(selectErr))
      continue
    }

    if (data && data.length > 0) {
      // Upsert: merge new data over existing — combine photos, overwrite
      // other fields only when the incoming value has content.
      const existing = data[0] as { id: string; photos: string[] | null }
      const combinedPhotos = Array.from(
        new Set([...(existing.photos ?? []), ...(candidate.photos ?? [])])
      ).filter((u) => !u.startsWith('blob:'))

      const updates: Record<string, unknown> = {}
      if (combinedPhotos.length > 0) updates.photos = combinedPhotos
      if (candidate.description) updates.description = candidate.description
      if (candidate.skills?.length) updates.skills = candidate.skills
      if (candidate.duration_minutes != null) updates.duration_minutes = candidate.duration_minutes
      if (candidate.equipment) updates.equipment = candidate.equipment
      if (candidate.video_link) updates.video_link = candidate.video_link

      if (Object.keys(updates).length > 0) {
        const { error: updateErr } = await supabase
          .from('components')
          .update(updates)
          .eq('id', existing.id)
        if (updateErr) {
          console.error(`[autoPopulateComponents] update failed for "${title}" (id=${existing.id}):`, JSON.stringify(updateErr))
        } else {
          console.log(`[autoPopulateComponents] updated component "${title}" (${candidate.type})`)
        }
      }
    } else {
      // New component — insert
      const { error: insertErr } = await supabase.from('components').insert({
        type: candidate.type,
        title,
        curriculum: candidate.curriculum || null,
        description: candidate.description,
        skills: candidate.skills,
        photos: (candidate.photos ?? []).filter((u) => !u.startsWith('blob:')),
        duration_minutes: candidate.duration_minutes,
        equipment: candidate.equipment,
        video_link: candidate.video_link ?? null,
      })
      if (insertErr) {
        console.error(`[autoPopulateComponents] insert failed for "${title}":`, JSON.stringify(insertErr))
      } else {
        console.log(`[autoPopulateComponents] inserted new component "${title}" (${candidate.type})`)
      }
    }
  }
}
