import { supabase } from './supabase'
import type { PlanRow, PlanItem } from './database.types'

export async function createPlan(
  items: PlanItem[],
  title?: string,
  curriculum?: string
): Promise<PlanRow> {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      items: JSON.parse(JSON.stringify(items)),
      title: title ?? null,
      curriculum: curriculum ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as PlanRow
}

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

export async function fetchLatestPlan(): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as PlanRow
}
