import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// Type-only import (erased at compile) — DevelopedCard owns the canonical DevelopResult shape.
import type { DevelopResult } from '@/app/components/log/DevelopedCard'

export const runtime = 'nodejs'

// /api/revise — the log-rebuild "✦ Critique" endpoint (chunk N1). Clones /api/develop's SDK/error/
// model pattern (do NOT modify that route). Takes the coach's CURRENT structured card + a plain-language
// critique ("make step 2 shorter", "add a landing", "these are for older kids") and returns the revised
// DevelopResult the NotesDoc re-renders in place (with glow on the changed rows). NO DB writes — the save
// still lands via saveComponent. Guards mirror /api/develop; the critique is capped at 1000 chars.

interface ReviseRequest {
  currentCard: {
    title?: string
    setup_steps?: string[]
    cues?: string | null
    skills?: string[]
    equipment?: string[]
    duration_minutes?: number | null
  }
  critique: string
  /** Optional: the coach's original raw note, for extra context when applying the critique. */
  rawNote?: string
}

// Guard against runaway prompts (and token burn). The grill caps the critique input at ~1000 chars.
const MAX_CRITIQUE_CHARS = 1000
const MAX_RAWNOTE_CHARS = 4000

export async function POST(request: NextRequest) {
  let body: ReviseRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { currentCard, critique, rawNote } = body
  if (!critique || typeof critique !== 'string' || !critique.trim()) {
    return NextResponse.json({ error: 'critique is required' }, { status: 400 })
  }
  if (critique.length > MAX_CRITIQUE_CHARS) {
    return NextResponse.json({ error: 'critique too long' }, { status: 400 })
  }
  if (!currentCard || typeof currentCard !== 'object') {
    return NextResponse.json({ error: 'currentCard is required' }, { status: 400 })
  }
  if (typeof rawNote === 'string' && rawNote.length > MAX_RAWNOTE_CHARS) {
    return NextResponse.json({ error: 'rawNote too long' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // Normalize the incoming card so the model always sees a clean, predictable shape.
  const cleanList = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()) : []
  const current = {
    title: typeof currentCard.title === 'string' ? currentCard.title.trim() : '',
    setup_steps: cleanList(currentCard.setup_steps),
    cues: typeof currentCard.cues === 'string' ? currentCard.cues.trim() : '',
    skills: cleanList(currentCard.skills).map((s) => s.toLowerCase()),
    equipment: cleanList(currentCard.equipment).map((s) => s.toLowerCase()),
    duration_minutes:
      typeof currentCard.duration_minutes === 'number' && Number.isInteger(currentCard.duration_minutes) && currentCard.duration_minutes > 0
        ? currentCard.duration_minutes
        : null,
  }

  const jsonExample =
    '{"title": "Balance Gauntlet", "setup_steps": ["Cross the balance beam", "Grab the rings"], "cues": "Keep eyes forward and arms wide for balance.", "skills": ["balance", "grip", "agility"], "equipment": ["balance beam", "rings"], "duration_minutes": null}'

  const prompt = `A ninja gym coach has a structured obstacle-course station card and wants to REVISE it. Apply the coach's change request to the card and return the FULL revised card. Keep everything the coach did NOT ask to change exactly as it is — only touch what the critique asks for. Preserve the order and wording of unchanged steps verbatim.

Current card (JSON):
${JSON.stringify(current)}
${rawNote && rawNote.trim() ? `\nThe coach's original spoken/typed note (context only):\n"${rawNote.trim()}"\n` : ''}
The coach's change request:
"${critique.trim()}"

Return the revised card as ONLY valid JSON in this exact shape — no explanation, no markdown:
${jsonExample}

Rules:
- title — keep the current title unless the critique asks to rename.
- setup_steps — 2–6 short imperative steps in order. No numbering, no bullet prefix. Preserve unchanged steps verbatim.
- cues — a single short string (1–2 sentences); must NOT restate the steps. Empty string "" if there are none.
- skills — 2–4 lowercase one-word skill tags. Empty array [] if none are clear.
- equipment — lowercase names of equipment. Empty array [] if none.
- duration_minutes — an integer only if a time is stated, otherwise null.`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON from response (handle any surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: string
      setup_steps?: string[]
      cues?: string
      skills?: string[]
      equipment?: string[]
      duration_minutes?: number | null
    }

    const duration =
      typeof parsed.duration_minutes === 'number' && Number.isInteger(parsed.duration_minutes) && parsed.duration_minutes > 0
        ? parsed.duration_minutes
        : null

    const result: DevelopResult = {
      // Fall back to the current value for any field the model dropped — a revise must never blank a
      // field the coach didn't ask to clear.
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : current.title,
      setup_steps: cleanList(parsed.setup_steps),
      cues: typeof parsed.cues === 'string' ? parsed.cues.trim() : current.cues,
      skills: cleanList(parsed.skills).map((s) => s.toLowerCase()),
      equipment: cleanList(parsed.equipment).map((s) => s.toLowerCase()),
      duration_minutes: duration,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'revise_failed' }, { status: 500 })
  }
}
