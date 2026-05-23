import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface ExistingComponent {
  title?: string
  description?: string
  skills?: string[]
  durationMinutes?: number | null
}

interface ParseComponentRequest {
  transcript: string
  componentType: string
  availableSkills?: string[]
  /** When present, Claude refines this content rather than generating from scratch. */
  existing?: ExistingComponent
}

export async function POST(request: NextRequest) {
  let body: ParseComponentRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { transcript, componentType, availableSkills, existing } = body
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const typeLabel =
    componentType === 'game' ? 'game or activity'
    : 'station or drill'

  const skillsSection =
    availableSkills && availableSkills.length > 0
      ? `4. Skills practiced — choose ONLY from this exact list: ${availableSkills.map((s) => `"${s}"`).join(', ')}. Return an empty array if none clearly match.`
      : ''

  const jsonExample =
    availableSkills && availableSkills.length > 0
      ? '{"title": "Activity Name", "sequenceSteps": ["Set up cones in a circle", "Players take turns", "Add a challenge"], "coachTips": ["Watch for bent knees", "Encourage quick resets"], "skills": ["Skill A"], "duration_minutes": 10}'
      : '{"title": "Activity Name", "sequenceSteps": ["Set up cones in a circle", "Players take turns"], "coachTips": ["Watch for bent knees"], "skills": [], "duration_minutes": null}'

  // ── Prompt: refine mode (existing content provided) ──────────────────────────
  const refinePrompt = existing ? `A ninja gym coach is refining a ${typeLabel} they already described. They have existing content and want to add or change something.

Existing content:
- Name: "${existing.title ?? ''}"
- Coaching info: "${existing.description ?? ''}"
- Skills: ${existing.skills && existing.skills.length > 0 ? existing.skills.map((s) => `"${s}"`).join(', ') : 'none'}
- Duration: ${existing.durationMinutes ? `${existing.durationMinutes} minutes` : 'not set'}

Coach's new voice input: "${transcript.trim()}"

Update the content based on what the coach just said:
1. Keep the existing name UNLESS the coach is clearly renaming it.
2. Update or expand the sequence steps to incorporate what the coach added. Keep valid existing steps.
3. Update or expand the coach tips similarly.
${skillsSection}
${skillsSection ? '5.' : '4.'} Update the duration ONLY if the coach explicitly mentions a new time. Otherwise keep the existing value (${existing.durationMinutes ?? 'null'}).

Return ONLY valid JSON — no explanation, no markdown:
${jsonExample}` : null

  // ── Prompt: fresh mode (no existing content) ─────────────────────────────────
  const freshPrompt = `A ninja gym coach just described a ${typeLabel} out loud. Extract:

1. A short, clear name for this ${typeLabel} (2–5 words). Infer the most natural title from what they described — the coach does not need to say the name explicitly.
2. 2–4 clear sequence steps (setup → how to run it → any key variation). Each step is one action-oriented sentence a substitute coach can follow. No bullet prefix needed.
3. 1–3 coach tips: things to watch for, common mistakes, or encouragement cues. Short sentences.
${skillsSection}
${skillsSection ? '5.' : '4.'} Duration in minutes as an integer if the coach explicitly mentions a time (e.g. "15 minutes", "half an hour", "five minute"). Otherwise null.

Return ONLY valid JSON — no explanation, no markdown:
${jsonExample}

Coach said: "${transcript.trim()}"`

  const prompt = refinePrompt ?? freshPrompt

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Extract JSON from response (handle any surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: string
      sequenceSteps?: string[]
      coachTips?: string[]
      skills?: string[]
      duration_minutes?: number | null
    }

    // Only return skills that actually exist in the available list
    const allowedSet = new Set(availableSkills ?? [])
    const matchedSkills = (parsed.skills ?? []).filter(
      (s) => typeof s === 'string' && allowedSet.has(s)
    )

    // In refine mode with no available skills list, pass skills through as-is
    const finalSkills =
      availableSkills && availableSkills.length > 0
        ? matchedSkills
        : (parsed.skills ?? []).filter((s) => typeof s === 'string')

    const durationMinutes =
      typeof parsed.duration_minutes === 'number' && Number.isInteger(parsed.duration_minutes) && parsed.duration_minutes > 0
        ? parsed.duration_minutes
        : null

    const sequenceSteps = (parsed.sequenceSteps ?? []).filter((s) => typeof s === 'string' && s.trim())
    const coachTips = (parsed.coachTips ?? []).filter((s) => typeof s === 'string' && s.trim())

    // Synthesise backward-compat description from steps + tips
    const description = [
      ...sequenceSteps.map((s) => `• ${s}`),
      ...coachTips.map((t) => `• ${t}`),
    ].join('\n')

    return NextResponse.json({
      title: parsed.title?.trim() ?? '',
      description,
      sequenceSteps,
      coachTips,
      skills: finalSkills,
      duration_minutes: durationMinutes,
    })
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
