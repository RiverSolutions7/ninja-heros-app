// Type + age-group model for the rebuilt log flow (chunk 6). The picker (TypeAgeSheet) reads these
// from public.component_types + public.curriculums; this module holds the shared shapes, the seeded
// fallbacks (so the flow never blocks when the DB is unreachable), and the eyebrow formatter that the
// header chip + every card eyebrow (DevelopedCard / NotesDoc / Celebrate) render from flow state.

export interface TypeOption {
  name: string
  /** Custom types carry an auto first-letter monogram; defaults are null (rendered text-only). */
  monogram: string | null
  is_default: boolean
  sort_order: number
}

export interface AgeOption {
  /** curriculums.age_group — the unique stored value (what components.curriculums holds). */
  age_group: string
  /** curriculums.label — the short chip label. */
  label: string
  sort_order: number
}

// Seeded defaults, mirrored from migration 017 (component_types) + 002 (curriculums). Used verbatim
// when the DB read fails/returns empty so the sheet always renders real options and the flow proceeds.
export const FALLBACK_TYPES: TypeOption[] = [
  { name: 'station', monogram: null, is_default: true, sort_order: 0 },
  { name: 'game', monogram: null, is_default: true, sort_order: 1 },
  { name: 'warmup', monogram: null, is_default: true, sort_order: 2 },
]

export const FALLBACK_AGES: AgeOption[] = [
  { age_group: 'Mini Ninjas (3.5-5)', label: 'Mini Ninjas', sort_order: 0 },
  { age_group: 'Junior Ninjas (5-9)', label: 'Junior Ninjas', sort_order: 1 },
]

// Type names are stored lowercase (component_types.name); the eyebrow + pills show them title-cased.
export function displayType(name: string): string {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : name
}

// Compress the selected age groups into the eyebrow's "Ages X–Y" phrase. The real age_group values
// embed a numeric range in parens ("Junior Ninjas (5-9)"), so the span is the min→max across every
// selected group. Custom groups with no numbers fall back to joining their raw values.
export function compressAges(ages: string[]): string {
  if (ages.length === 0) return ''
  const nums: number[] = []
  for (const a of ages) {
    const m = a.match(/\d+(?:\.\d+)?/g)
    if (m) for (const x of m) { const n = parseFloat(x); if (!Number.isNaN(n)) nums.push(n) }
  }
  if (nums.length) {
    const lo = Math.min(...nums)
    const hi = Math.max(...nums)
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n))
    return lo === hi ? `Ages ${fmt(lo)}` : `Ages ${fmt(lo)}–${fmt(hi)}` // en-dash, matches the frame
  }
  return ages.join(' · ')
}

// The eyebrow string used everywhere ("Station · Ages 5–7"). Type-only when no ages are selected.
export function formatEyebrow(type: string, ages: string[]): string {
  const t = displayType(type)
  const a = compressAges(ages)
  return a ? `${t} · ${a}` : t
}

// Auto-monogram for a custom type: the first non-space character, uppercased.
export function monogramFor(name: string): string {
  const c = name.trim().charAt(0)
  return c ? c.toUpperCase() : '?'
}
