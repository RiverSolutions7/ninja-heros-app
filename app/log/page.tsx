// @design-locked — the rebuilt log-a-component flow route (chunks 1–3: Capture rest/recording/develop).
// Holds the flow state (photos[], note) and the dev-mock doors (?dev=photo | photos3 | rec | developed).
// The visual truth lives in the Capture components; this file is state + wiring only.
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Capture, { type Photo } from '@/app/components/log/Capture'
import type { DevelopResult } from '@/app/components/log/DevelopedCard'

const MOCK_PHOTO = '/design-export-assets/course-photo.svg'

// Dev-only develop payload for ?dev=developed (jump straight into the developed card + cascade).
const MOCK_DEVELOPED: DevelopResult = {
  title: 'Balance Gauntlet',
  setup_steps: ['Cross the balance beam', 'Grab the rings'],
  cues: 'Keep eyes forward and arms wide for balance.',
  skills: ['balance', 'grip', 'agility'],
  equipment: ['balance beam', 'rings'],
  duration_minutes: null,
}

// Dev-only payload for ?dev=notes (expanded editorial doc). Four steps + cues + skills so
// merge / reorder / delete are all exercisable. Matches frame 8e's content.
const MOCK_NOTES: DevelopResult = {
  title: 'Balance Gauntlet',
  setup_steps: ['Cross the balance beam', 'Grab the rings', 'Cross the warped wall', 'Ring the bell'],
  cues: 'Eyes up, not down at their feet. Spot every kid on the landing.',
  skills: ['balance', 'grip', 'agility'],
  equipment: ['balance beam', 'rings', 'warped wall'],
  duration_minutes: null,
}

let photoSeq = 0
const nextId = () => `p${Date.now().toString(36)}${(photoSeq++).toString(36)}`

function LogFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const dev = params.get('dev')

  const [photos, setPhotos] = useState<Photo[]>([])
  const [note, setNote] = useState('')

  // Dev-mock door: preload mock photos so the rest states are reviewable without a camera.
  // Guarded to non-production so a guessable ?dev= param can't inject fake photos into a real flow.
  const devMockEnabled = process.env.NODE_ENV !== 'production'
  useEffect(() => {
    if (!devMockEnabled) return
    if (dev === 'photo' || dev === 'rec' || dev === 'developed' || dev === 'notes') setPhotos([{ url: MOCK_PHOTO, id: 'mock-0' }])
    else if (dev === 'photos3') setPhotos([
      { url: MOCK_PHOTO, id: 'mock-0' },
      { url: MOCK_PHOTO, id: 'mock-1' },
      { url: MOCK_PHOTO, id: 'mock-2' },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev])

  // The whisper renders under the 3-photo mock (real trigger wiring lands in chunk 7).
  const showWhisper = devMockEnabled && dev === 'photos3'
  // Recording motion door: fake-voice loop drives the full beatIn/recording/beatOut cycle.
  const devFakeRecording = devMockEnabled && dev === 'rec'
  // Develop doors: ?dev=rec flows into the opt-in path with a MOCKED /api/develop (no API-key burn);
  // ?dev=developed jumps straight into the developed card + cascade.
  const devMockDevelop = devMockEnabled && (dev === 'rec' || dev === 'developed')
  const startDeveloped = devMockEnabled
    ? dev === 'developed'
      ? MOCK_DEVELOPED
      : dev === 'notes'
        ? MOCK_NOTES
        : null
    : null
  const startExpanded = devMockEnabled && dev === 'notes'

  const addPhotos = (files: File[]) => {
    const added = files.map((f) => ({ url: URL.createObjectURL(f), id: nextId() }))
    setPhotos((prev) => [...prev, ...added])
  }

  return (
    <Capture
      photos={photos}
      note={note}
      onNoteChange={setNote}
      onAddPhotos={addPhotos}
      onBack={() => router.back()}
      showWhisper={showWhisper}
      devFakeRecording={devFakeRecording}
      devMockDevelop={devMockDevelop}
      startDeveloped={startDeveloped}
      startExpanded={startExpanded}
    />
  )
}

export default function LogPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <LogFlow />
    </Suspense>
  )
}
