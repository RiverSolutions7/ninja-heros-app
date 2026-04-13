import { supabase } from './supabase'
import type {
  ComponentRow,
  CurriculumRow,
  SkillRow,
  FolderRow,
  SkillRecency,
  PlanItem,
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
// Components
// ============================================================

export async function countComponents(): Promise<number> {
  const { count, error } = await supabase
    .from('components')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function fetchComponents(type?: string, curriculum?: string): Promise<ComponentRow[]> {
  let query = supabase
    .from('components')
    .select('*')
    .order('created_at', { ascending: false })
  if (type) {
    query = query.eq('type', type)
  }
  if (curriculum) {
    query = query.eq('curriculum', curriculum)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ComponentRow[]
}

// ============================================================
// Skill Tracker: compute recency from saved plan history
// ============================================================
export async function fetchSkillRecency(ageGroup?: string): Promise<SkillRecency[]> {
  // Fetch skills and all saved plans in parallel
  const [skillRows, { data: plans, error: plansError }] = await Promise.all([
    fetchSkills(ageGroup),
    supabase
      .from('plans')
      .select('plan_date, items')
      .not('plan_date', 'is', null)
      .order('plan_date', { ascending: false }),
  ])

  if (plansError) throw plansError

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build a map: skill name → most recent plan_date it appeared in
  const skillLatest: Record<string, string> = {}

  for (const plan of plans ?? []) {
    const planDate = plan.plan_date as string
    const items = (plan.items ?? []) as PlanItem[]

    for (const item of items) {
      const skills = item.component?.skills ?? []
      // Filter by curriculum/age group if provided
      if (ageGroup && item.component?.curriculum !== ageGroup) continue
      for (const skill of skills) {
        if (!skillLatest[skill] || planDate > skillLatest[skill]) {
          skillLatest[skill] = planDate
        }
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
