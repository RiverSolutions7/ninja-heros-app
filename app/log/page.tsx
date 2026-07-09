// @design-locked — the rebuilt log-a-component flow route (chunk 1: Capture rest states).
// Holds the flow state (photos[], note) and the dev-mock door (?dev=photo | ?dev=photos3).
// The visual truth lives in the Capture components; this file is state + wiring only.
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Capture, { type Photo } from '@/app/components/log/Capture'

const MOCK_PHOTO = '/design-export-assets/course-photo.svg'

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
    if (dev === 'photo' || dev === 'rec') setPhotos([{ url: MOCK_PHOTO, id: 'mock-0' }])
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
