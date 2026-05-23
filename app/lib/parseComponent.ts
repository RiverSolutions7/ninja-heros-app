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
    return { title: '', description: '', sequenceSteps: [], coachTips: [], skills: [], durationMinutes: null }
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
    sequenceSteps: string[]
    coachTips: string[]
    skills: string[]
    duration_minutes: number | null
  }

  return {
    title: data.title ?? '',
    description: data.description ?? '',
    sequenceSteps: data.sequenceSteps ?? [],
    coachTips: data.coachTips ?? [],
    skills: data.skills ?? [],
    durationMinutes: data.duration_minutes ?? null,
  }
}
