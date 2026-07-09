import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

// /api/title — the log-rebuild card-naming endpoint (chunk 5).
// Clones the /api/develop SDK/error/model pattern (claude-haiku-4-5). Returns ONLY a short title —
// never a gate: the client always has a fallback ("Station · Jul 9") and swaps this in when it
// resolves. Two modes:
//   { mode: 'text',   text }                         → name from a raw note
//   { mode: 'vision', imageBase64, mediaType }       → name from a cover photo
// NO DB writes here (the save owns persistence + the title swap).

type TitleRequest =
  | { mode: 'text'; text: string }
  | { mode: 'vision'; imageBase64: string; mediaType: string }

const MAX_TEXT_CHARS = 4000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // ~5MB of base64 — a cover photo is well under this
const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const INSTRUCTION =
  'You name obstacle-course stations for a ninja gym coach\'s library. Give this ONE station a short, ' +
  'clear, specific name (2–5 words) a coach would recognise at a glance — e.g. "Balance Beam Circuit", ' +
  '"Warped Wall Sprint", "Ring Swing Traverse". No quotes, no punctuation, no trailing period, no ' +
  'explanation. Reply with ONLY the name.'

// Trim the model's reply down to a clean title string (strip quotes/markdown/trailing period, clamp).
function cleanTitle(raw: string): string {
  const firstLine = raw.trim().split('\n')[0] ?? ''
  return firstLine
    .replace(/^["'`*_\s]+|["'`*_\s.]+$/g, '')
    .slice(0, 60)
    .trim()
}

export async function POST(request: NextRequest) {
  let body: TitleRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // Build the message content per mode.
  let content: Anthropic.MessageParam['content']
  if (body.mode === 'text') {
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    if (text.length > MAX_TEXT_CHARS) return NextResponse.json({ error: 'text too long' }, { status: 400 })
    content = `${INSTRUCTION}\n\nThe coach described the station: "${text}"`
  } else if (body.mode === 'vision') {
    const { imageBase64, mediaType } = body
    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 })
    }
    if (imageBase64.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'image too large' }, { status: 400 })
    }
    const media = typeof mediaType === 'string' && ALLOWED_MEDIA.has(mediaType) ? mediaType : 'image/jpeg'
    content = [
      {
        type: 'image',
        source: { type: 'base64', media_type: media as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: imageBase64 },
      },
      { type: 'text', text: `${INSTRUCTION}\n\nThis is a photo of the station.` },
    ]
  } else {
    return NextResponse.json({ error: 'mode must be "text" or "vision"' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 40,
      messages: [{ role: 'user', content }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const title = cleanTitle(raw)
    if (!title) throw new Error('empty title')

    return NextResponse.json({ title })
  } catch {
    return NextResponse.json({ error: 'title_failed' }, { status: 500 })
  }
}
