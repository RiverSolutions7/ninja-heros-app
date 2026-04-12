import { supabase } from './supabase'
import type { PlanRow, PlanItem } from './database.types'

// ── Date-based plan queries ───────────────────────────────────

export async function fetchPlanForDate(date: string): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('plan_date', date)
    .single()

  // PGRST116 = no rows found — not a real error
  if (error) return null
  return data as PlanRow
}

export async function upsertPlanForDate(
  date: string,
  items: PlanItem[]
): Promise<PlanRow> {
  const { data, error } = await supabase
    .from('plans')
    .upsert(
      { plan_date: date, items: JSON.parse(JSON.stringify(items)) },
      { onConflict: 'plan_date' }
    )
    .select()
    .single()

  if (error) throw error
  return data as PlanRow
}

export async function fetchDatesWithPlans(
  from: string,
  to: string
): Promise<string[]> {
  const { data } = await supabase
    .from('plans')
    .select('plan_date')
    .gte('plan_date', from)
    .lte('plan_date', to)
    .not('items', 'eq', '[]')

  if (!data) return []
  return data
    .map((r: { plan_date: string | null }) => r.plan_date)
    .filter((d): d is string => d !== null)
}

// ── Shared plan page (read by ID) ────────────────────────────

export async function fetchPlan(id: string): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as PlanRow
}

export async function updatePlanItems(
  id: string,
  items: PlanItem[],
  title?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    items: JSON.parse(JSON.stringify(items)),
  }
  if (title !== undefined) update.title = title
  const { error } = await supabase
    .from('plans')
    .update(update)
    .eq('id', id)

  if (error) throw error
}
