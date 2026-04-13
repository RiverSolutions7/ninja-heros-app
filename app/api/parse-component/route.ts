import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface ParseComponentRequest {
  transcript: string
  componentType: string
  availableSkills?: string[]
}

export async function POST(request: NextRequest) {
  let body: ParseComponentRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { transcript, componentType, availableSkills } = body
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const typeLabel =
    componentType === 'game' ? 'game or activity'
    : componentType === 'warmup' ? 'warmup'
    : 'station or drill'

  const skillsSection =
    availableSkills && availableSkills.length > 0
      ? `3. Skills practiced in this activity — choose ONLY from this exact list: ${availableSkills.map((s) => `"${s}"`).join(', ')}. Return an empty array if none clearly match.`
      : ''

  const jsonExample =
    availableSkills && availableSkills.length > 0
      ? '{"title": "Activity Name", "description": "• Cue one\\n• Cue two\\n• Cue three", "skills": ["Skill A"]}'
      : '{"title": "Activity Name", "description": "• Cue one\\n• Cue two\\n• Cue three", "skills": []}'

  const prompt = `A ninja gym coach just described a ${typeLabel} out loud. Extract:

1. A short, clear name for this ${typeLabel} (2–5 words). If the coach says a specific name, use it exactly. Otherwise infer the most natural title from what they described.
2. 2–3 concise coaching cues a substitute coach could follow. Each starts with "•". Action-oriented. No invented details.
${skillsSection}

Return ONLY valid JSON — no explanation, no markdown:
${jsonExample}

Coach said: "${transcript.trim()}"`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON from response (handle any surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as { title?: string; description?: string; skills?: string[] }

    // Only return skills that actually exist in the available list
    const allowedSet = new Set(availableSkills ?? [])
    const matchedSkills = (parsed.skills ?? []).filter(
      (s) => typeof s === 'string' && allowedSet.has(s)
    )

    return NextResponse.json({
      title: parsed.title?.trim() ?? '',
      description: parsed.description?.trim() ?? '',
      skills: matchedSkills,
    })
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
