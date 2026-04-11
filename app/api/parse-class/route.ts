import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface ParseClassRequest {
  transcript: string
  curriculums: Array<{ id: string; age_group: string; label: string }>
}

interface ParseClassResponse {
  title: string | null
  matched_curriculum_id: string | null
  notes: string
}

export async function POST(request: NextRequest) {
  let body: ParseClassRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { transcript, curriculums } = body
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const curriculumList = (curriculums ?? [])
    .map((c) => `id: "${c.id}" → "${c.label}"`)
    .join('\n')

  const prompt = `You are a martial arts / ninja gym coach assistant. A coach just spoke this voice memo after class:

<transcript>
${transcript}
</transcript>

Available class types (id → label):
${curriculumList || '(none available)'}

Return ONLY a valid JSON object — no markdown, no explanation — with exactly these three keys:

{
  "title": "A short punchy title for this class (5 words max, e.g. 'Balance Beam Day'). Null if you cannot determine one.",
  "matched_curriculum_id": "The id from the list above that best matches the age group or class type mentioned. Null if unclear.",
  "notes": "A clean bullet-point summary of what the coach covered. Each bullet starts with '• '. Keep it factual and concise."
}

Rules:
- The title should NOT repeat the curriculum label (e.g., don't say 'Junior Ninjas Junior Ninjas').
- For age group matching: 'tiny/3-5/little kids/toddlers' → look for the youngest curriculum; '5-9/older kids/juniors' → junior curriculum. Default to null if ambiguous.
- The notes field must always have content. If you can't parse much, reproduce the key facts as bullets.
- Never invent activities that weren't mentioned.`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    // Strip any markdown code fences if the model adds them
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(cleaned) as ParseClassResponse

    if (typeof parsed.notes !== 'string') throw new Error('missing notes')

    return NextResponse.json({
      title: typeof parsed.title === 'string' ? parsed.title : null,
      matched_curriculum_id:
        typeof parsed.matched_curriculum_id === 'string' ? parsed.matched_curriculum_id : null,
      notes: parsed.notes,
    } satisfies ParseClassResponse)
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
