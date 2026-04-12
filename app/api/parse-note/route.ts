import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

interface ParseNoteRequest {
  transcript: string
}

export async function POST(request: NextRequest) {
  let body: ParseNoteRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { transcript } = body
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const prompt = `A coach at a ninja obstacle gym is giving running instructions for a station. Convert their spoken note into 2-3 clear bullet points that a substitute coach could follow. Each bullet starts with "• ". Be concise and action-oriented. Don't invent details not mentioned.

<transcript>${transcript.trim()}</transcript>

Return ONLY the bullet points as plain text — no JSON, no title.`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const note = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return NextResponse.json({ note })
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 500 })
  }
}
