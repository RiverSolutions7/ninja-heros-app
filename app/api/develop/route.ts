import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// Type-only import (erased at compile) — DevelopedCard owns the canonical DevelopResult shape.
import type { DevelopResult } from '@/app/components/log/DevelopedCard'

export const runtime = 'nodejs'

// /api/develop — the log-rebuild "Structure it ✨" endpoint (chunk 3).
// Clones the /api/parse-component SDK/error/model pattern (do NOT modify that route). Takes a raw
// voice/typed note and returns the structured glimpse the DevelopedCard renders. NO DB writes here —
// the save lands in chunk 5. Empty sections come back empty and the card just omits them.

interface DevelopRequest {
  transcript: string
}

// Guard against runaway prompts (and token burn) — a real voice note is well under this.
const MAX_TRANSCRIPT_CHARS = 4000

export async function POST(request: NextRequest) {
  let body: DevelopRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { transcript } = body
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return NextResponse.json({ error: 'transcript too long' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const jsonExample =
    '{"title": "Balance Gauntlet", "setup_steps": ["Cross the balance beam", "Grab the rings"], "cues": "Keep eyes forward and arms wide for balance.", "skills": ["balance", "grip", "agility"], "equipment": ["balance beam", "rings"], "duration_minutes": null}'

  const prompt = `A ninja gym coach just described an obstacle-course station or drill out loud. Turn it into a clean, structured card. Extract:

1. title — a short, clear name for this station (2–5 words). Infer the most natural title; the coach does not need to say it explicitly.
2. setup_steps — 2–4 short, imperative steps a substitute coach can follow, in order (e.g. "Cross the balance beam", "Grab the rings"). Each step is one concise action sentence. No numbering, no bullet prefix.
3. cues — a single short string (1–2 sentences) of coaching cues: what to watch for, common mistakes, or encouragement. Must NOT restate the steps. Empty string "" if the coach gave none.
4. skills — 2–4 lowercase one-word skill tags this station trains (e.g. "balance", "grip", "agility"). Empty array [] if none are clear.
5. equipment — lowercase names of equipment mentioned or clearly implied (e.g. "rings", "balance beam"). Empty array [] if none.
6. duration_minutes — an integer if the coach explicitly states a time, otherwise null.

Return ONLY valid JSON — no explanation, no markdown:
${jsonExample}

Coach said: "${transcript.trim()}"`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
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

    const cleanList = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()) : []

    const duration =
      typeof parsed.duration_minutes === 'number' && Number.isInteger(parsed.duration_minutes) && parsed.duration_minutes > 0
        ? parsed.duration_minutes
        : null

    const result: DevelopResult = {
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      setup_steps: cleanList(parsed.setup_steps),
      cues: typeof parsed.cues === 'string' ? parsed.cues.trim() : '',
      skills: cleanList(parsed.skills).map((s) => s.toLowerCase()),
      equipment: cleanList(parsed.equipment).map((s) => s.toLowerCase()),
      duration_minutes: duration,
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'develop_failed' }, { status: 500 })
  }
}
