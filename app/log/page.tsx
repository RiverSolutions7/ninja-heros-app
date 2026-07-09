// @design-locked — the rebuilt log-a-component flow route (chunks 1–3: Capture rest/recording/develop).
// Holds the flow state (photos[], note) and the dev-mock doors (?dev=photo | photos3 | rec | developed).
// The visual truth lives in the Capture components; this file is state + wiring only.
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Capture, { type Photo } from '@/app/components/log/Capture'
import Celebrate from '@/app/components/log/Celebrate'
import TypeAgeSheet from '@/app/components/log/TypeAgeSheet'
import { formatEyebrow } from '@/app/lib/typeAge'
import type { DevelopResult } from '@/app/components/log/DevelopedCard'

const MOCK_PHOTO = '/design-export-assets/course-photo.svg'

// ── type + ages persistence (chunk 6) ─────────────────────────────────────────────────────────────
// Last-used carries across app launches (localStorage); the once-per-launch auto-open checkpoint is a
// per-launch flag (sessionStorage). First-ever launch with no last-used = type 'station' (the default
// type, matches 8g's pre-selected Station pill), NO ages selected — the auto-open checkpoint exists
// precisely to make the coach confirm the class, so an empty age default is the honest initial state
// (chip reads "Station" until they pick). CHOICE flagged for River.
const LS_TYPE = 'ninja-log-type'
const LS_AGES = 'ninja-log-ages'
const SS_CHECKPOINT = 'ninja-log-typeage-checkpoint'

function readType(): string {
  try { return localStorage.getItem(LS_TYPE) || 'station' } catch { return 'station' }
}
function readAges(): string[] {
  try {
    const raw = localStorage.getItem(LS_AGES)
    if (!raw) return []
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

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

  // Type + ages flow state (chunk 6). Seeded from last-used (localStorage) via lazy initializers —
  // /log is client-rendered (useSearchParams bails to CSR) so there's no SSR mismatch.
  const [saveType, setSaveType] = useState<string>(() => readType())
  const [saveCurriculums, setSaveCurriculums] = useState<string[]>(() => readAges())
  const [sheetOpen, setSheetOpen] = useState(false)
  const eyebrow = formatEyebrow(saveType, saveCurriculums)

  // Session checkpoint: the sheet auto-opens ONCE per app launch on the first real log (the
  // confirm-or-change moment). ?dev=sheet force-opens it; the other dev doors skip the checkpoint.
  useEffect(() => {
    if (dev === 'sheet') { setSheetOpen(true); return }
    if (dev) return
    try {
      if (!sessionStorage.getItem(SS_CHECKPOINT)) {
        sessionStorage.setItem(SS_CHECKPOINT, '1')
        setSheetOpen(true)
      }
    } catch { /* storage blocked — skip the checkpoint, chip still carries defaults */ }
  }, [dev])

  // Done / dismiss → commit the selection to flow state + persist last-used, then close.
  const handleTypeAgeDone = useCallback((type: string, ages: string[]) => {
    setSaveType(type)
    setSaveCurriculums(ages)
    try {
      localStorage.setItem(LS_TYPE, type)
      localStorage.setItem(LS_AGES, JSON.stringify(ages))
    } catch { /* ignore persistence failure — the in-memory selection still holds this session */ }
    setSheetOpen(false)
  }, [])

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

  // Dev-mock save: exercise the morph/celebrate WITHOUT a DB write on the mock doors. `?dev=…&real=1`
  // opts INTO a real insert (data-acceptance verification) — the mock photo is fetched + uploaded.
  const devMockSave = devMockEnabled && (dev === 'developed' || dev === 'notes' || dev === 'rec') && params.get('real') !== '1'

  const addPhotos = (files: File[]) => {
    const added = files.map((f) => ({ url: URL.createObjectURL(f), id: nextId(), file: f }))
    setPhotos((prev) => [...prev, ...added])
  }

  // Continue on the celebrate screen → revoke the saved photos' object URLs (only blob: ones we own)
  // and reset to a fresh empty capture. Capture resets its own flow state.
  const handleContinue = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => { if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url) })
      return []
    })
    setNote('')
  }, [])

  // Dev door: jump straight to the settled celebrate screen (8f) with mock data — no morph, no write.
  if (devMockEnabled && dev === 'celebrate') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgb(8,12,26)', overflow: 'hidden', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <Celebrate
          eyebrow={eyebrow}
          title="Balance Gauntlet"
          photoUrl={MOCK_PHOTO}
          staged={false}
          showThumbPhoto
          onShare={() => {}}
          onContinue={() => router.push('/library')}
          onRename={() => {}}
        />
      </div>
    )
  }

  return (
    <>
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
        saveType={saveType}
        saveCurriculums={saveCurriculums}
        devMockSave={devMockSave}
        onContinue={handleContinue}
        eyebrow={eyebrow}
        onEditTypeAge={() => setSheetOpen(true)}
      />
      <TypeAgeSheet open={sheetOpen} type={saveType} ages={saveCurriculums} onDone={handleTypeAgeDone} />
    </>
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
