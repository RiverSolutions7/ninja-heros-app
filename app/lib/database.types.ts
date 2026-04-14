// ============================================================
// Ninja H.E.R.O.S. Coach Hub — Database Types
// ============================================================

// AgeGroup is now dynamic — values come from the `curriculums` table.
export type AgeGroup = string

// Skills are now dynamic (stored in the `skills` table).
export type Skill = string

// Kept for fallback / seeding reference only
export const ALL_SKILLS = [
  'Balance',
  'Agility',
  'Jumping',
  'Rolling',
  'Climbing',
  'Grip Strength',
  'Body Control',
  'Coordination',
  'Speed',
  'Teamwork',
  'Confidence',
  'Tumbling',
  'Core Strength',
] as const

// ============================================================
// Raw DB Row Types
// ============================================================

export interface CurriculumRow {
  id: string
  label: string
  age_group: string
  sort_order: number
  created_at: string
}

export interface SkillRow {
  id: string
  name: string
  age_group: string | null
  created_at: string
}

export interface FolderRow {
  id: string
  name: string
  sort_order: number
  created_at: string
}

// ============================================================
// Component Library
// ============================================================

export type ComponentType = 'game' | 'station'

export interface ComponentRow {
  id: string
  type: ComponentType
  title: string
  curriculum: string | null
  description: string | null
  equipment: string | null
  skills: string[] | null
  photos: string[] | null
  duration_minutes: number | null
  video_link: string | null
  video_url: string | null
  folder_id: string | null
  in_handoff: boolean
  created_at: string
}

// ============================================================
// Plans (Today's Plan — synced via Supabase)
// ============================================================

export interface PlanItem {
  localId: string
  component: ComponentRow
  isAdHoc?: boolean
  durationMinutes: number | null
  coachNote: string | null
}

export interface PlanRow {
  id: string
  title: string | null
  curriculum: string | null
  plan_date: string | null
  items: PlanItem[]
  created_at: string
  updated_at: string
}

// ============================================================
// Inspiration Clips
// ============================================================

export interface InspirationClipRow {
  id: string
  url: string
  title: string | null
  thumbnail_url: string | null
  source_domain: string | null
  tags: string[]
  notes: string | null
  start_seconds: number | null
  end_seconds: number | null
  created_at: string
}

// ============================================================
// Skill Tracker
// ============================================================

export type SkillStatus = 'green' | 'yellow' | 'red' | 'never'

export interface SkillRecency {
  skill: string
  lastUsed: string | null
  daysSince: number | null
  status: SkillStatus
}
