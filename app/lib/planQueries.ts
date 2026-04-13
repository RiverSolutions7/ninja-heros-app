import { supabase } from './supabase'
import type { PlanRow, PlanItem } from './database.types'

// ── Calendar plan queries ─────────────────────────────────────────────────────

/** Insert a brand-new plan for a calendar date. Always creates a new row. */
export async function addPlanToCalendar(
  date: string,
  items: PlanItem[],
  title?: string
): Promise<PlanRow> {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      plan_date: date,
      items: JSON.parse(JSON.stringify(items)),
      title: title ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as PlanRow
}

/** Move an existing plan to a new calendar date. */
export async function movePlanToDate(id: string, newDate: string): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .update({ plan_date: newDate })
    .eq('id', id)
  if (error) throw error
}

/** Permanently delete a plan by ID. Throws on error. */
export async function deletePlanById(id: string): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Update an existing plan by Supabase ID (used for auto-save when editing a loaded plan). */
export async function updatePlanById(
  id: string,
  items: PlanItem[],
  title?: string
): Promise<PlanRow> {
  const update: Record<string, unknown> = {
    items: JSON.parse(JSON.stringify(items)),
  }
  if (title !== undefined) update.title = title

  const { data, error } = await supabase
    .from('plans')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as PlanRow
}

/** Returns ALL plans for a given date (multiple coaches / curriculums allowed). */
export async function fetchPlansForDate(date: string): Promise<PlanRow[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('plan_date', date)
    .not('items', 'eq', '[]')
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data as PlanRow[]
}

/** Returns the ISO date strings within a range that have at least one plan. */
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

// ── Shared plan page (read by ID) ─────────────────────────────────────────────

export async function fetchPlan(id: string): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as PlanRow
}

/** Legacy update used by the shared plan page. */
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
