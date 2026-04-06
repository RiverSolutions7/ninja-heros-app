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
}

/**
 * After saving a class, silently extract and save its components to the
 * components table. Skips duplicates (same title + type).
 * Fire-and-forget — do not await this in the UI.
 */
export async function autoPopulateComponents(
  candidates: ComponentCandidate[]
): Promise<void> {
  const valid = candidates.filter((c) => c.title.trim())
  if (valid.length === 0) return

  for (const candidate of valid) {
    // Skip if a component with this title + type already exists
    const { data } = await supabase
      .from('components')
      .select('id')
      .eq('type', candidate.type)
      .ilike('title', candidate.title.trim())
      .limit(1)

    if (data && data.length > 0) continue

    await supabase.from('components').insert({
      type: candidate.type,
      title: candidate.title.trim(),
      curriculum: candidate.curriculum || null,
      description: candidate.description,
      skills: candidate.skills,
      photos: candidate.photos,
      duration_minutes: candidate.duration_minutes,
      equipment: candidate.equipment,
    })
  }
}
