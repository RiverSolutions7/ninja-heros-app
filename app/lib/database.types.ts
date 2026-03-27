// ============================================================
// Ninja H.E.R.O.S. Coach Hub — Database Types
// ============================================================

export type AgeGroup =
  | 'Mini Ninjas (3.5-5)'
  | 'Junior Ninjas (5-9)'
  | 'All Ages'
  | 'Tiny Ninjas (3.5-5)'   // legacy — existing DB rows only
  | 'Elite Ninjas (9-11)'   // legacy — existing DB rows only

export type Difficulty =
  | 'Beginner'
  | 'Beginner-Intermediate'
  | 'Intermediate'
  | 'Intermediate-Advanced'
  | 'Advanced'

export type BlockType = 'warmup' | 'lane' | 'game'

export type WarmupTime = '5 min' | '6 min' | '7 min'

// Skills are now dynamic (stored in the `skills` table).
// Skill is a plain string so custom skills work seamlessly.
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

export const AGE_GROUPS: AgeGroup[] = [
  'Mini Ninjas (3.5-5)',
  'Junior Ninjas (5-9)',
  'All Ages',
]

export const DIFFICULTIES: Difficulty[] = [
  'Beginner',
  'Beginner-Intermediate',
  'Intermediate',
  'Intermediate-Advanced',
  'Advanced',
]

export const WARMUP_TIMES: WarmupTime[] = ['5 min', '6 min', '7 min']

// ============================================================
// Raw DB Row Types
// ============================================================

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

export interface HandoffNoteRow {
  id: string
  content: string
  author_name: string | null
  created_at: string
}

export interface ClassRow {
  id: string
  title: string | null
  class_date: string
  age_group: AgeGroup
  difficulty: Difficulty
  notes: string | null
  folder_id: string | null
  in_handoff: boolean
  created_at: string
  updated_at: string
}

export interface ClassBlockRow {
  id: string
  class_id: string
  block_type: BlockType
  sort_order: number
  created_at: string
}

export interface WarmupBlockRow {
  id: string
  block_id: string
  description: string
  time: WarmupTime
  skill_focus: string | null
}

export interface LaneBlockRow {
  id: string
  block_id: string
  instructor_name: string | null
  core_skills: string[]
  video_url: string | null
}

export interface StationRow {
  id: string
  lane_block_id: string
  sort_order: number
  equipment: string
  description: string
  photo_url: string | null
  photo_urls: string[]
}

export interface GameBlockRow {
  id: string
  block_id: string
  name: string
  description: string | null
  video_link: string | null
  video_url: string | null
}

// ============================================================
// Composed Types for UI
// ============================================================

export type FullBlock =
  | { type: 'warmup'; block: ClassBlockRow; data: WarmupBlockRow }
  | { type: 'lane'; block: ClassBlockRow; data: LaneBlockRow; stations: StationRow[] }
  | { type: 'game'; block: ClassBlockRow; data: GameBlockRow }

export interface FullClass extends ClassRow {
  blocks: FullBlock[]
}

// ============================================================
// Draft Types for the block builder form
// ============================================================

export interface DraftPhotoItem {
  localId: string
  photoFile: File | null      // null when loaded from existing URL
  photoPreview: string | null // local object URL or existing remote URL
  photo_url: string | null    // null until uploaded, then the Supabase URL
}

export interface DraftStation {
  id?: string           // existing station DB row id (set when editing)
  localId: string
  sort_order: number
  equipment: string
  description: string
  photos: DraftPhotoItem[]
}

export interface DraftWarmupBlock {
  id?: string           // existing warmup_block row id (set when editing)
  blockId?: string      // existing class_block row id (set when editing)
  type: 'warmup'
  localId: string
  description: string
  time: WarmupTime
  skill_focus: string
}

export interface DraftLaneBlock {
  id?: string           // existing lane_block row id (set when editing)
  blockId?: string      // existing class_block row id (set when editing)
  existingVideoUrl?: string | null  // persisted video URL (kept if no new recording)
  type: 'lane'
  localId: string
  instructor_name: string
  core_skills: string[]
  stations: DraftStation[]
  videoFile: File | null
  videoPreview: string | null
}

export interface DraftGameBlock {
  id?: string           // existing game_block row id (set when editing)
  blockId?: string      // existing class_block row id (set when editing)
  existingVideoUrl?: string | null  // persisted video URL (kept if no new recording)
  type: 'game'
  localId: string
  name: string
  description: string
  video_link: string
  videoFile: File | null
  videoPreview: string | null
}

export type DraftBlock = DraftWarmupBlock | DraftLaneBlock | DraftGameBlock

export interface ClassDraft {
  title: string
  class_date: string
  age_group: AgeGroup
  difficulty: Difficulty
  notes: string
  blocks: DraftBlock[]
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
