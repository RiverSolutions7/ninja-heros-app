import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface SplitStepRequest {
  step: string
}

export async function POST(request: NextRequest) {
  let body: SplitStepRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { step } = body
  if (!step || typeof step !== 'string' || !step.trim()) {
    return NextResponse.json({ error: 'step is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const prompt = `You are helping a ninja/martial arts gym coach split an exercise step into two.

Split this single step into exactly two meaningful sub-steps. Each sub-step should be one clear, action-oriented sentence that a coach or substitute could follow on its own.

Rules:
- Keep both parts concise (under 12 words each if possible)
- Split at the most natural logical boundary (setup vs. execution, or two distinct actions)
- Do NOT add new information — only split what is already there
- Return ONLY valid JSON, no explanation: {"part1": "...", "part2": "..."}

Step to split: "${step.trim()}"`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as { part1?: string; part2?: string }

    const part1 = parsed.part1?.trim()
    const part2 = parsed.part2?.trim()

    if (!part1 || !part2) throw new Error('Missing parts in response')

    return NextResponse.json({ part1, part2 })
  } catch {
    return NextResponse.json({ error: 'split_failed' }, { status: 500 })
  }
}
