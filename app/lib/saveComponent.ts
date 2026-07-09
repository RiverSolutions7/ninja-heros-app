// Data path for the rebuilt log flow's Save (chunk 5). Inserts a new card into public.components via
// the app's existing supabase client + photo-upload helper, and maps the structured card down to the
// legacy `description` column so the new card still renders in the OLD library UI until that redesign.
//
// Migration 017 (setup_steps jsonb + cues text) is a River approval gate and MAY NOT be applied yet.
// This save is deliberately resilient: it tries the full post-017 shape first, and if the insert fails
// on a missing column it retries once WITHOUT setup_steps/cues (both are already folded into the
// description mapping) and warns quietly. So the flow works pre-017 and uses the full schema post-017.
import { supabase } from './supabase'
import { uploadStationPhoto } from './uploadPhoto'

export interface SaveCardInput {
  /** component_types.name — defaults to 'station' upstream. */
  type: string
  title: string
  /** Age groups (curriculums.age_group). First is also written to the legacy `curriculum` column. */
  curriculums: string[]
  /** Ordered setup steps (post-017 setup_steps + the numbered lines in description). */
  setupSteps: string[]
  /** Coach's cues (post-017 cues + the "Coach's cues:" paragraph in description). */
  cues: string
  skills: string[]
  /** Hidden data — joined into the legacy text `equipment` column if present. */
  equipment: string[]
  durationMinutes: number | null
  /** Ordered photos (first = cover). Each is uploaded; a File is uploaded directly, a url is fetched. */
  photos: Array<{ file?: File; url?: string }>
}

export interface SaveCardResult {
  id: string
  /** True when the insert had to fall back to the pre-017 shape (setup_steps/cues columns absent). */
  usedLegacyShape: boolean
}

// Transitional description mapping (retired at the library redesign): numbered steps, then a blank
// line + "Coach's cues:" paragraph. Plain text so the legacy card tile/detail render acceptably.
export function buildDescription(setupSteps: string[], cues: string): string {
  const stepLines = setupSteps.map((s, i) => `${i + 1}. ${s}`)
  const parts: string[] = []
  if (stepLines.length) parts.push(stepLines.join('\n'))
  const trimmedCues = cues.trim()
  if (trimmedCues) parts.push(`Coach's cues: ${trimmedCues}`)
  return parts.join('\n\n')
}

// Upload one photo — a captured File goes straight up; a url (e.g. a dev mock asset) is fetched to a
// blob first so the same path works for both. Returns the public URL.
async function uploadOne(photo: { file?: File; url?: string }): Promise<string | null> {
  let file = photo.file
  if (!file && photo.url) {
    const res = await fetch(photo.url)
    const blob = await res.blob()
    const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0]
    file = new File([blob], `photo.${ext}`, { type: blob.type || 'image/jpeg' })
  }
  if (!file) return null
  return uploadStationPhoto(file)
}

// PostgREST / Postgres signals for "column does not exist" — the trigger to retry without the
// post-017 columns. 42703 = undefined_column (Postgres); PGRST204 = column not in schema cache.
function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703' || err.code === 'PGRST204') return true
  return /setup_steps|cues|column/i.test(err.message ?? '')
}

export async function saveComponent(input: SaveCardInput): Promise<SaveCardResult> {
  let photoUrls: string[]
  try {
    const uploaded = await Promise.all(input.photos.map(uploadOne))
    photoUrls = uploaded.filter((u): u is string => typeof u === 'string')
  } catch (e) {
    // Distinct tag so a storage/upload failure isn't misread as an insert failure downstream.
    throw new Error(`photo upload failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const description = buildDescription(input.setupSteps, input.cues)
  const equipment = input.equipment.length ? input.equipment.join(', ') : null

  // Columns that exist pre-017 (the legacy shape the flow must still work against).
  const base = {
    type: input.type,
    title: input.title.trim(),
    curriculum: input.curriculums[0] ?? null,
    curriculums: input.curriculums,
    description: description || null,
    skills: input.skills,
    photos: photoUrls,
    equipment,
    duration_minutes: input.durationMinutes,
    video_url: null,
    video_link: null,
  }

  // Post-017 additions — folded into `description` too, so dropping them on the retry loses nothing.
  const full = { ...base, setup_steps: input.setupSteps, cues: input.cues.trim() || null }

  let usedLegacyShape = false
  let inserted = await supabase.from('components').insert(full).select('id').single()

  if (inserted.error && isMissingColumnError(inserted.error)) {
    console.warn(
      '[saveComponent] setup_steps/cues columns absent (migration 017 not applied) — saving legacy shape; steps + cues remain in description.',
    )
    usedLegacyShape = true
    inserted = await supabase.from('components').insert(base).select('id').single()
  }

  if (inserted.error) throw new Error(inserted.error.message)
  const id = (inserted.data as { id: string } | null)?.id
  if (!id) throw new Error('save returned no id')

  return { id, usedLegacyShape }
}

// Rename an already-saved row (celebrate title tap-to-rename, and the async AI-title swap-in).
export async function updateComponentTitle(id: string, title: string): Promise<void> {
  const clean = title.trim()
  if (!clean) return
  const { error } = await supabase.from('components').update({ title: clean }).eq('id', id)
  if (error) throw new Error(error.message)
}
