import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * DEV/PREVIEW-ONLY critique sink. The `DevCritique` component POSTs a tapped-element
 * note here and we insert it into `public.dev_notes` so the orchestrator can read
 * feedback straight from the DB instead of River relaying it through chat.
 *
 * Gate: available in local dev AND on Vercel preview builds (which run
 * NODE_ENV=production, so the VERCEL_ENV==='preview' check is what re-enables it).
 * Returns 404 everywhere else so it disappears in production.
 */
function gateOpen(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

function clamp(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  if (!gateOpen()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const note = clamp(payload.note, 4000).trim()
  if (!note) {
    return NextResponse.json({ error: 'note_required' }, { status: 400 })
  }

  const route = clamp(payload.route, 500).trim() || '/'
  const row = {
    route,
    element: clamp(payload.element, 1000) || null,
    label: clamp(payload.label, 500) || null,
    note,
    viewport: clamp(payload.viewport, 40) || null,
    build: clamp(payload.build, 200) || null,
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.from('dev_notes').insert(row).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data?.id })
}

export async function GET() {
  if (!gateOpen()) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase
    .from('dev_notes')
    .select('id, route, element, label, note, viewport, build, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notes: data ?? [] })
}
