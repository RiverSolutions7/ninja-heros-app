import { supabase } from './supabase'
import type {
  ComponentRow,
  FolderRow,
  PlanItem,
} from './database.types'

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

export async function countComponents(ageGroup?: string): Promise<number> {
  let query = supabase.from('components').select('*', { count: 'exact', head: true })
  if (ageGroup) query = query.eq('curriculum', ageGroup)
  const { count, error } = await query
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
// Component usage — how often and how recently a component has
// been taught (drawn from saved plans). Source of truth for the
// "Taught N times / Last used X days ago" identity stats shown
// on the component detail screen.
// ============================================================
export interface ComponentUsage {
  timesUsed: number
  lastUsed: string | null
  daysSince: number | null
}

export async function fetchComponentUsage(componentId: string): Promise<ComponentUsage> {
  const { data: plans, error } = await supabase
    .from('plans')
    .select('plan_date, items')
    .not('plan_date', 'is', null)
    .order('plan_date', { ascending: false })
  if (error) throw error

  let timesUsed = 0
  let lastUsed: string | null = null
  for (const plan of plans ?? []) {
    const items = (plan.items ?? []) as PlanItem[]
    const found = items.some((i) => i.component?.id === componentId)
    if (found) {
      timesUsed++
      if (!lastUsed && plan.plan_date) lastUsed = plan.plan_date
    }
  }

  let daysSince: number | null = null
  if (lastUsed) {
    // Parse YYYY-MM-DD as local midnight. Using new Date('YYYY-MM-DD') would
    // produce UTC midnight, which then shifts to the *previous* day in negative-
    // offset timezones — causing the "−1 days ago" bug seen on US devices.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [y, m, d] = lastUsed.split('-').map(Number)
    const last = new Date(y, m - 1, d) // local-time midnight
    daysSince = Math.max(0, Math.floor((today.getTime() - last.getTime()) / 86_400_000))
  }

  return { timesUsed, lastUsed, daysSince }
}

// ============================================================
// Plan count — total saved plans (plan_date not null)
// ============================================================
export async function fetchPlanCount(): Promise<number> {
  const { count, error } = await supabase
    .from('plans')
    .select('*', { count: 'exact', head: true })
    .not('plan_date', 'is', null)
  if (error) throw error
  return count ?? 0
}

// ============================================================
// Top components — most frequently used in saved plans
// ============================================================
export async function fetchTopComponents(
  ageGroup?: string,
  limit = 5
): Promise<Array<{ component: ComponentRow; count: number }>> {
  const { data: plans, error } = await supabase
    .from('plans')
    .select('items')
    .not('plan_date', 'is', null)
  if (error) throw error

  const freq: Record<string, { component: ComponentRow; count: number }> = {}

  for (const plan of plans ?? []) {
    const items = (plan.items ?? []) as PlanItem[]
    for (const item of items) {
      if (!item.component?.id) continue
      if (ageGroup && item.component.curriculum !== ageGroup) continue
      const id = item.component.id
      if (freq[id]) {
        freq[id].count++
      } else {
        freq[id] = { component: item.component as ComponentRow, count: 1 }
      }
    }
  }

  return Object.values(freq)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

