import { supabase } from './supabase'
import type {
  ClassRow,
  ComponentRow,
  CurriculumRow,
  FullClass,
  FullBlock,
  ClassBlockRow,
  WarmupBlockRow,
  LaneBlockRow,
  StationRow,
  GameBlockRow,
  SkillRow,
  FolderRow,
  HandoffNoteRow,
  SkillRecency,
} from './database.types'

// ============================================================
// Fetch all curriculums (ordered by sort_order, then created_at)
// ============================================================
export async function fetchCurriculums(): Promise<CurriculumRow[]> {
  const { data, error } = await supabase
    .from('curriculums')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as CurriculumRow[]
}

// ============================================================
// Fetch all skills from the skills table
// ============================================================
export async function fetchSkills(ageGroup?: string): Promise<SkillRow[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('name')
  if (error) throw error
  const rows = data ?? []
  // When ageGroup is provided, show only skills belonging strictly to that curriculum
  if (ageGroup) {
    return rows.filter((r) => r.age_group === ageGroup)
  }
  return rows
}

// ============================================================
// Fetch all folders
// ============================================================
export async function fetchFolders(): Promise<FolderRow[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

// ============================================================
// Fetch all classes (summary list)
// ============================================================
export async function fetchClasses(opts?: {
  q?: string
  age?: string
  inHandoff?: boolean
}): Promise<ClassRow[]> {
  let query = supabase
    .from('classes')
    .select('*')
    .order('class_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts?.age) {
    query = query.eq('age_group', opts.age)
  }
  if (opts?.q) {
    query = query.or(`title.ilike.%${opts.q}%,notes.ilike.%${opts.q}%`)
  }
  if (opts?.inHandoff !== undefined) {
    query = query.eq('in_handoff', opts.inHandoff)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// ============================================================
// Fetch a single class with all blocks fully hydrated
// ============================================================
export async function fetchFullClass(classId: string): Promise<FullClass | null> {
  const { data: classRow, error: classErr } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single()

  if (classErr || !classRow) return null

  const { data: blockRows, error: blocksErr } = await supabase
    .from('class_blocks')
    .select('*')
    .eq('class_id', classId)
    .order('sort_order')

  if (blocksErr || !blockRows) return { ...classRow, blocks: [] }

  const blocks: FullBlock[] = []

  for (const block of blockRows as ClassBlockRow[]) {
    if (block.block_type === 'warmup') {
      const { data: warmup } = await supabase
        .from('warmup_blocks')
        .select('*')
        .eq('block_id', block.id)
        .single()
      if (warmup) {
        blocks.push({ type: 'warmup', block, data: warmup as WarmupBlockRow })
      }
    } else if (block.block_type === 'lane') {
      const { data: lane } = await supabase
        .from('lane_blocks')
        .select('*')
        .eq('block_id', block.id)
        .single()
      if (lane) {
        const { data: stationRows } = await supabase
          .from('stations')
          .select('*')
          .eq('lane_block_id', (lane as LaneBlockRow).id)
          .order('sort_order')
        blocks.push({
          type: 'lane',
          block,
          data: lane as LaneBlockRow,
          stations: (stationRows ?? []) as StationRow[],
        })
      }
    } else if (block.block_type === 'game') {
      const { data: game } = await supabase
        .from('game_blocks')
        .select('*')
        .eq('block_id', block.id)
        .single()
      if (game) {
        blocks.push({ type: 'game', block, data: game as GameBlockRow })
      }
    }
  }

  return { ...classRow, blocks }
}

// ============================================================
// Fetch all classes with full block data (for handoff view)
// ============================================================
export async function fetchAllFullClasses(): Promise<FullClass[]> {
  const classes = await fetchClasses()
  const full = await Promise.all(classes.map((c) => fetchFullClass(c.id)))
  return full.filter(Boolean) as FullClass[]
}

// ============================================================
// Fetch handoff classes (in_handoff = true)
// ============================================================
export async function fetchHandoffClasses(): Promise<FullClass[]> {
  const classes = await fetchClasses({ inHandoff: true })
  const full = await Promise.all(classes.map((c) => fetchFullClass(c.id)))
  return full.filter(Boolean) as FullClass[]
}

// ============================================================
// Fetch handoff notes (newest first)
// ============================================================
export async function fetchHandoffNotes(): Promise<HandoffNoteRow[]> {
  const { data, error } = await supabase
    .from('handoff_notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as HandoffNoteRow[]
}

// ============================================================
// Fetch components (standalone games, warmups, stations)
// ============================================================
export async function fetchComponents(type?: string): Promise<ComponentRow[]> {
  let query = supabase
    .from('components')
    .select('*')
    .order('created_at', { ascending: false })
  if (type) {
    query = query.eq('type', type)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ComponentRow[]
}

// ============================================================
// Skill Tracker: compute recency for all skills (from DB)
// ============================================================
export async function fetchSkillRecency(ageGroup?: string): Promise<SkillRecency[]> {
  // Fetch skills and lane block data in parallel
  const [skillRows, { data, error }] = await Promise.all([
    fetchSkills(ageGroup),
    supabase
      .from('lane_blocks')
      .select(`
        id,
        core_skills,
        class_blocks!inner (
          class_id,
          classes!inner (
            class_date,
            age_group
          )
        )
      `),
  ])

  if (error) throw error

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build a map: skill name → most recent class_date
  const skillLatest: Record<string, string> = {}

  for (const row of data ?? []) {
    const classBlocks = row.class_blocks as unknown as {
      classes: { class_date: string; age_group: string }
    }
    const classDate = classBlocks?.classes?.class_date
    if (!classDate) continue

    // Filter by age group when provided
    if (ageGroup && classBlocks?.classes?.age_group !== ageGroup) continue

    for (const skill of row.core_skills as string[]) {
      if (!skillLatest[skill] || classDate > skillLatest[skill]) {
        skillLatest[skill] = classDate
      }
    }
  }

  return skillRows
    .map((row): SkillRecency => {
      const skill = row.name
      const lastUsed = skillLatest[skill] ?? null
      if (!lastUsed) {
        return { skill, lastUsed: null, daysSince: null, status: 'never' }
      }
      const last = new Date(lastUsed)
      last.setHours(0, 0, 0, 0)
      const daysSince = Math.floor(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
      )
      const status =
        daysSince <= 7 ? 'green' : daysSince <= 21 ? 'yellow' : 'red'
      return { skill, lastUsed, daysSince, status }
    })
    .sort((a, b) => {
      // Most overdue first: never > red (most days) > yellow > green
      if (a.status === 'never' && b.status !== 'never') return -1
      if (b.status === 'never' && a.status !== 'never') return 1
      if (a.daysSince === null) return -1
      if (b.daysSince === null) return 1
      return b.daysSince - a.daysSince
    })
}

// ============================================================
// Fetch recent classes with lane/skill data (for skill tracker list)
// ============================================================
export interface RecentClassWithSkills {
  classId: string
  classDate: string
  title: string | null
  lanes: { laneNumber: number; instructorName: string | null; skills: string[] }[]
}

export async function fetchRecentClassesWithSkills(
  limit = 15,
  ageGroup?: string
): Promise<RecentClassWithSkills[]> {
  let query = supabase
    .from('classes')
    .select('id, title, class_date')
    .order('class_date', { ascending: false })
    .limit(limit)

  if (ageGroup) {
    query = query.eq('age_group', ageGroup)
  }

  const { data: classes } = await query

  if (!classes) return []

  const results: RecentClassWithSkills[] = []

  for (const cls of classes) {
    const { data: blockRows } = await supabase
      .from('class_blocks')
      .select('id, sort_order, block_type')
      .eq('class_id', cls.id)
      .eq('block_type', 'lane')
      .order('sort_order')

    if (!blockRows?.length) continue

    const lanes: RecentClassWithSkills['lanes'] = []
    let laneNum = 1

    for (const block of blockRows) {
      const { data: lane } = await supabase
        .from('lane_blocks')
        .select('instructor_name, core_skills')
        .eq('block_id', block.id)
        .single()

      if (lane && (lane.core_skills as string[]).length > 0) {
        lanes.push({
          laneNumber: laneNum,
          instructorName: lane.instructor_name,
          skills: lane.core_skills as string[],
        })
        laneNum++
      }
    }

    if (lanes.length > 0) {
      results.push({
        classId: cls.id,
        classDate: cls.class_date,
        title: cls.title,
        lanes,
      })
    }
  }

  return results
}
