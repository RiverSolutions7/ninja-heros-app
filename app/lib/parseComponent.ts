import type { WalkthroughParsed } from '@/app/components/walkthrough/types'

interface ParseRequestExisting {
  title?: string
  description?: string
  skills?: string[]
  durationMinutes?: number | null
}

export async function parseComponentTranscript(
  transcript: string,
  componentType: string,
  availableSkills?: string[],
  existing?: ParseRequestExisting,
): Promise<WalkthroughParsed> {
  const text = transcript.trim()
  if (!text) {
    return { title: '', description: '', skills: [], durationMinutes: null }
  }

  const res = await fetch('/api/parse-component', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: text,
      componentType,
      availableSkills,
      ...(existing ? { existing } : {}),
    }),
  })

  if (!res.ok) throw new Error(`api ${res.status}`)

  const data = (await res.json()) as {
    title: string
    description: string
    skills: string[]
    duration_minutes: number | null
  }

  return {
    title: data.title ?? '',
    description: data.description ?? '',
    skills: data.skills ?? [],
    durationMinutes: data.duration_minutes ?? null,
  }
}
