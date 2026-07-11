// @design-locked — the rebuilt log-a-component flow route (chunks 1–3: Capture rest/recording/develop).
// Holds the flow state (photos[], note) and the dev-mock doors (?dev=photo | photos3 | rec | developed).
// The visual truth lives in the Capture components; this file is state + wiring only.
'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Capture, { type Photo, type CaptureRun } from '@/app/components/log/Capture'
import Celebrate, { type CelebrateCard } from '@/app/components/log/Celebrate'
import TypeAgeSheet from '@/app/components/log/TypeAgeSheet'
import PhotoSheet from '@/app/components/log/PhotoSheet'
import SortBins from '@/app/components/log/SortBins'
import { formatEyebrow } from '@/app/lib/typeAge'
import { saveComponent, updateComponentTitle, type SaveCardInput } from '@/app/lib/saveComponent'
import { fallbackTitle, titleFromPhoto } from '@/app/lib/titleForCard'
import { shareCard } from '@/app/lib/shareCard'
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

// The W1 "Multiple setups? Sort →" whisper shows for ~4s the first time a capture reaches 3 photos.
const WHISPER_MS = 4000

// ── multi-station run (chunk 8) ───────────────────────────────────────────────────────────────────
// After SortBins, the run walks the stations one at a time (Rhythm A): each station is captured with
// ITS photos only, saved via the full pipeline ("Save & next station →"), then the screen swaps to the
// next. The last station's "Save to library" flips `done` → the plural celebrate. Forward-only.
interface RunStation {
  photoIds: string[]
  /** The saved library row id (null until saved / on a mock-or-failed save). */
  savedRowId: string | null
  /** The card summary shown on the plural celebrate (set when the station saves). */
  card: CelebrateCard | null
}
interface RunState {
  stations: RunStation[]
  current: number
  /** The current station's save is in flight (Capture disables its finish CTA + header Save). */
  saving: boolean
  /** The current station's save FAILED (chunk 9) — the stepper does NOT advance; Capture shows the
   *  retry toast + re-enables the CTA. Cleared on the next save attempt. */
  saveError: boolean
  /** Every station saved → show the plural celebrate. */
  done: boolean
}

function LogFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const dev = params.get('dev')

  const [photos, setPhotos] = useState<Photo[]>([])
  const [note, setNote] = useState('')

  // ── PhotoSheet (chunk 7) — the manage sheet + the W1 whisper trigger ──────────────────────────────
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const [whisper, setWhisper] = useState(false)
  const whisperFiredRef = useRef(false) // once-per-capture latch; reset on Continue
  const whisperTimerRef = useRef<number | null>(null)
  // Latest photos, read by the unmount-only revoke cleanup (so it never re-runs on every add).
  const photosRef = useRef<Photo[]>([])
  useEffect(() => { photosRef.current = photos }, [photos])
  // Revoke any remaining owned (blob:) object URLs when the flow unmounts without a Continue — this
  // closes the chunk-1 leak (Continue + per-photo removal revoke on their own paths below).
  useEffect(() => () => {
    photosRef.current.forEach((p) => { if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url) })
    if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current)
  }, [])

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
    else if (dev === 'photos3' || dev === 'photosheet') {
      setPhotos([
        { url: MOCK_PHOTO, id: 'mock-0' },
        { url: MOCK_PHOTO, id: 'mock-1' },
        { url: MOCK_PHOTO, id: 'mock-2' },
      ])
      if (dev === 'photosheet') setPhotoSheetOpen(true) // door: open the manage sheet with 3 mocks
      if (dev === 'photos3') setWhisper(true) // door: preview the whisper persistently (no auto-fade)
    }
    else if (dev === 'sortbins') {
      // door: the bins screen with 4 mock photos to sort.
      setPhotos([
        { url: MOCK_PHOTO, id: 'mock-0' },
        { url: MOCK_PHOTO, id: 'mock-1' },
        { url: MOCK_PHOTO, id: 'mock-2' },
        { url: MOCK_PHOTO, id: 'mock-3' },
      ])
      setSorting(true)
    }
    else if (dev === 'stepper') {
      // door: a 2-station run mid-flight — station 1 already saved (mock), station 2 (index 1) active.
      setPhotos([
        { url: MOCK_PHOTO, id: 'mock-0' },
        { url: MOCK_PHOTO, id: 'mock-1' },
        { url: MOCK_PHOTO, id: 'mock-2' },
        { url: MOCK_PHOTO, id: 'mock-3' },
      ])
      setRun({
        stations: [
          { photoIds: ['mock-0', 'mock-1'], savedRowId: 'mock-row-1', card: { eyebrow: 'Station · Ages 5–7', title: 'Balance Gauntlet', photoUrl: MOCK_PHOTO } },
          { photoIds: ['mock-2', 'mock-3'], savedRowId: null, card: null },
        ],
        current: 1,
        saving: false,
        saveError: false,
        done: false,
      })
    }
    else if (dev === 'state15a' || dev === 'state15b' || dev === 'state15c' || dev === 'state15d') {
      // Graceful-state doors (chunk 9): seed the photo (+ a note for 15c/15d) so the forced surface
      // renders over a realistic capture. The state itself is forced via `devForceState` on Capture.
      setPhotos([
        { url: MOCK_PHOTO, id: 'mock-0' },
        { url: MOCK_PHOTO, id: 'mock-1' },
        { url: MOCK_PHOTO, id: 'mock-2' },
      ])
      if (dev === 'state15c' || dev === 'state15d') setNote('Beam, rings, then a foam-pit landing.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev])
  // Graceful-state door (chunk 9): force a 15a–15d surface. 15d also runs the fake-recording loop so
  // the reassurance sits under the live recording dock exactly as the frame authors it.
  const devForceState: '15a' | '15b' | '15c' | '15d' | null =
    devMockEnabled && (dev === 'state15a' || dev === 'state15b' || dev === 'state15c' || dev === 'state15d')
      ? (dev.slice(5) as '15a' | '15b' | '15c' | '15d')
      : null

  // Recording motion door: fake-voice loop drives the full beatIn/recording/beatOut cycle.
  const devFakeRecording = devMockEnabled && (dev === 'rec' || dev === 'state15d')
  // Develop doors: ?dev=rec flows into the opt-in path with a MOCKED /api/develop (no API-key burn);
  // ?dev=developed jumps straight into the developed card + cascade.
  const devMockDevelop = devMockEnabled && (dev === 'rec' || dev === 'developed' || dev === 'stepper')
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

  const addPhotos = useCallback((files: File[]) => {
    if (!files.length) return
    const added = files.map((f) => ({ url: URL.createObjectURL(f), id: nextId(), file: f }))
    // Whisper fires once per capture the moment the count crosses to 3 by ADDING. `photos` is the
    // committed state at call time, so the crossing test is accurate for a single add.
    const crossed = photos.length < 3 && photos.length + added.length >= 3
    setPhotos((prev) => [...prev, ...added])
    if (crossed && !whisperFiredRef.current) {
      whisperFiredRef.current = true
      setWhisper(true)
      if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current)
      whisperTimerRef.current = window.setTimeout(() => setWhisper(false), WHISPER_MS)
    }
  }, [photos.length])

  // ✕ in the PhotoSheet → drop the photo + revoke its owned (blob:) object URL now (leak-safe).
  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target && target.url.startsWith('blob:')) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  // Drag reorder in the PhotoSheet → reindex photos[] to the new id order (index 0 = cover). Commits
  // live so the Capture hero + dots reflect the new cover immediately.
  const reorderPhotos = useCallback((orderedIds: string[]) => {
    setPhotos((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]))
      const next = orderedIds.map((id) => byId.get(id)).filter((p): p is Photo => !!p)
      return next.length === prev.length ? next : prev
    })
  }, [])

  // ── SortBins + multi-station run (chunk 8) ────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState(false)
  const [run, setRun] = useState<RunState | null>(null)
  // Dedup cache: a photo dropped into 2 bins uploads ONCE — the first station that saves it caches the
  // storage URL here (keyed by photo id); later stations reuse it (saveComponent's `uploadedUrl`).
  const uploadedUrlsRef = useRef<Map<string, string>>(new Map())

  // id→Photo lookup for the run's per-station photo subsets (computed during render, always current).
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])

  // Sort into separate stations (⊟ row / whisper) → open SortBins over the current photos.
  const handleSortIntoStations = useCallback(() => {
    setPhotoSheetOpen(false)
    setSorting(true)
  }, [])

  // Dev doors run without a DB write (mirrors devMockSave). `?dev=stepper&real=1` opts into a real run.
  const devRunMock = devMockEnabled && dev === 'stepper' && params.get('real') !== '1'

  // SortBins confirm → start the run (both bins guaranteed non-empty by SortBins). Fresh note + cache.
  const startRun = useCallback((bins: string[][]) => {
    uploadedUrlsRef.current = new Map()
    setNote('')
    setRun({
      stations: bins.map((photoIds) => ({ photoIds, savedRowId: null, card: null })),
      current: 0,
      saving: false,
      saveError: false,
      done: false,
    })
    setSorting(false)
  }, [])

  // Advance after a station's save resolves: record its card + row, then tick to the next station (or
  // flip `done` on the last). Fresh note for the next station; any open station photo tray closes.
  const finishStationSave = useCallback((card: CelebrateCard, rowId: string | null) => {
    setRun((r) => {
      if (!r) return r
      const stations = r.stations.map((s, i) => (i === r.current ? { ...s, savedRowId: rowId, card } : s))
      const isLast = r.current + 1 >= r.stations.length
      return isLast
        ? { ...r, stations, saving: false, saveError: false, done: true }
        : { ...r, stations, current: r.current + 1, saving: false, saveError: false }
    })
    setNote('')
    setPhotoSheetOpen(false)
  }, [])

  // ── station-scoped photo management (chunk 10 item ⑤) ─────────────────────────────────────────────
  // Mid-run the stack chip opens the PhotoSheet over the CURRENT station's photos only. Edits touch
  // that station's photoIds — never the other stations or the global photos[] order (exitRun still
  // returns the full original set). The ⊟ sort row is hidden mid-run (no nested sorting).
  const reorderStationPhotos = useCallback((orderedIds: string[]) => {
    setRun((r) => {
      if (!r || r.done) return r
      const cur = r.stations[r.current]
      const valid = orderedIds.filter((id) => cur.photoIds.includes(id))
      if (valid.length !== cur.photoIds.length) return r
      return { ...r, stations: r.stations.map((s, i) => (i === r.current ? { ...s, photoIds: valid } : s)) }
    })
  }, [])
  // ✕ mid-run removes MEMBERSHIP from this station only — the photo may live in another bin, and the
  // original capture keeps it either way, so the object URL is NOT revoked here.
  const removeStationPhoto = useCallback((id: string) => {
    setRun((r) => {
      if (!r || r.done) return r
      return { ...r, stations: r.stations.map((s, i) => (i === r.current ? { ...s, photoIds: s.photoIds.filter((x) => x !== id) } : s)) }
    })
  }, [])
  // "+" mid-run adds to the global pool AND assigns to the current station (whisper untouched — it
  // stays dormant during runs).
  const addStationPhotos = useCallback((files: File[]) => {
    if (!files.length) return
    const added = files.map((f) => ({ url: URL.createObjectURL(f), id: nextId(), file: f }))
    setPhotos((prev) => [...prev, ...added])
    setRun((r) => {
      if (!r || r.done) return r
      return { ...r, stations: r.stations.map((s, i) => (i === r.current ? { ...s, photoIds: [...s.photoIds, ...added.map((a) => a.id)] } : s)) }
    })
  }, [])

  // Save the CURRENT station via the full pipeline (dedup-aware), then advance. Awaits the insert so a
  // shared photo is uploaded before a later station reuses it, and so the row truly lands before the
  // swap. Never dead-ends, but a FAILED insert does NOT advance (chunk 9): saveStation's catch holds the
  // stepper and flags run.saveError so Capture shows the retry toast; the draft + earlier rows stay.
  const saveStation = useCallback(
    async (kind: 'structured' | 'photo', card: DevelopResult | null) => {
      const r = run
      // Reentrancy guard (mirrors the single flow's `if (saving) return`): a fast double-tap before the
      // disabled prop re-renders must not fire two concurrent inserts → a duplicate library row.
      if (!r || r.done || r.saving) return
      const station = r.stations[r.current]
      const stationPhotos = station.photoIds
        .map((id) => photoById.get(id))
        .filter((p): p is Photo => !!p)
      const coverUrl = stationPhotos[0]?.url ?? ''
      const title = card?.title.trim() || fallbackTitle(saveType)
      const celebrateCard: CelebrateCard = { eyebrow, title, photoUrl: coverUrl }

      setRun((prev) => (prev ? { ...prev, saving: true, saveError: false } : prev))

      if (devRunMock) {
        // Dev door: no DB write — still simulate the awaited beat so the swap timing reads true.
        await new Promise((res) => window.setTimeout(res, 260))
        finishStationSave(celebrateCard, null)
        return
      }

      try {
        const input: SaveCardInput = {
          type: saveType,
          title,
          curriculums: saveCurriculums,
          setupSteps: kind === 'structured' && card ? card.setup_steps : [],
          cues: kind === 'structured' && card ? card.cues : '',
          skills: kind === 'structured' && card ? card.skills : [],
          equipment: kind === 'structured' && card ? card.equipment : [],
          durationMinutes: kind === 'structured' && card ? card.duration_minutes : null,
          // A photo-only station save carries the coach's typed note (if any) as the raw note, mirroring
          // the single flow's 'raw' path — so a note typed but not developed is never silently dropped.
          rawNote: kind === 'photo' ? (note.trim() || undefined) : undefined,
          photos: stationPhotos.map((p) => ({ id: p.id, file: p.file, url: p.url, uploadedUrl: uploadedUrlsRef.current.get(p.id) })),
        }
        const res = await saveComponent(input)
        // Cache uploaded URLs so a shared photo in a later station reuses them (upload once).
        for (const [id, url] of Object.entries(res.photoUrlById)) uploadedUrlsRef.current.set(id, url)
        // Best-effort AI title for a photo-only station (vision on the cover); writes to the row only —
        // the plural celebrate keeps the fallback title (no live swap needed there).
        if (kind === 'photo' && stationPhotos[0]) {
          const cover = stationPhotos[0]
          void titleFromPhoto(cover.file ?? cover.url ?? '').then((t) => {
            if (t) updateComponentTitle(res.id, t).catch((e) => console.warn('[run] title swap failed', e))
          })
        }
        finishStationSave(celebrateCard, res.id)
      } catch (e) {
        // Chunk 9 — a failed station save must NOT advance the stepper: hold on the current station,
        // flag the error (Capture shows the retry toast + re-enables the CTA). The draft (this
        // station's developed card) and every earlier saved row are untouched. Retry re-runs saveStation.
        console.warn('[run] station save failed', e)
        setRun((prev) => (prev ? { ...prev, saving: false, saveError: true } : prev))
      }
    },
    [run, photoById, saveType, saveCurriculums, eyebrow, note, devRunMock, finishStationSave],
  )

  // Back ‹ mid-run (confirmed) → exit the run, return to the normal capture with the original photos
  // intact. Earlier stations stay saved as library rows (forward-only). Note reset.
  const exitRun = useCallback(() => {
    setRun(null)
    setSorting(false)
    setNote('')
  }, [])

  // Continue on the plural celebrate → reset the WHOLE flow (revoke every owned URL, fresh empty
  // capture, whisper latch reset) — same lifecycle as the single-flow Continue.
  const continueAfterRun = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => { if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url) })
      return []
    })
    setNote('')
    uploadedUrlsRef.current = new Map()
    whisperFiredRef.current = false
    setWhisper(false)
    if (whisperTimerRef.current) { window.clearTimeout(whisperTimerRef.current); whisperTimerRef.current = null }
    setPhotoSheetOpen(false)
    setSorting(false)
    setRun(null)
  }, [])

  // Share on the plural celebrate → share the FIRST logged station's card (a single-image share of the
  // run's opening cover). CHOICE flagged for River (13b authors one Share for the whole run).
  const handleRunShare = useCallback(() => {
    const first = run?.stations.find((s) => s.card)?.card
    if (!first) return
    void shareCard({ title: first.title, eyebrow: first.eyebrow, photoUrl: first.photoUrl, setupSteps: [], cues: '' })
  }, [run])

  // Continue on the celebrate screen → revoke the saved photos' object URLs (only blob: ones we own)
  // and reset to a fresh empty capture. Capture resets its own flow state.
  const handleContinue = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => { if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url) })
      return []
    })
    setNote('')
    // New capture → reset the once-per-capture whisper latch + clear any pending fade timer.
    whisperFiredRef.current = false
    setWhisper(false)
    if (whisperTimerRef.current) { window.clearTimeout(whisperTimerRef.current); whisperTimerRef.current = null }
    setPhotoSheetOpen(false)
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

  // ── run-mode derived render state ──────────────────────────────────────────────────────────────
  const runStation = run && !run.done ? run.stations[run.current] : null
  const runPhotos = runStation
    ? runStation.photoIds.map((id) => photoById.get(id)).filter((p): p is Photo => !!p)
    : photos
  const captureRun: CaptureRun | null = runStation && run
    ? { index: run.current, total: run.stations.length, saving: run.saving, saveError: run.saveError, onStationSave: saveStation }
    : null

  // Plural celebrate (13b) — every station saved. Page-owned (the single-card grow-morph is skipped in
  // run mode: a morph has one target, the plural screen has N cards). Arrives as its own screen.
  if (run?.done) {
    const cards = run.stations.map((s) => s.card).filter((c): c is CelebrateCard => !!c)
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgb(8,12,26)', overflow: 'hidden', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <Celebrate eyebrow={eyebrow} title="" photoUrl="" cards={cards} onShare={handleRunShare} onContinue={continueAfterRun} onRename={() => {}} />
      </div>
    )
  }

  return (
    <>
      {sorting ? (
        <SortBins photos={photos} onConfirm={startRun} onBack={() => setSorting(false)} />
      ) : (
        <Capture
          // Remount per station so each gets a fresh phase/develop/note (the run's state is threaded via
          // props + the note reset on advance). 'single' key for the normal flow.
          key={run ? `station-${run.current}` : 'single'}
          photos={runPhotos}
          note={note}
          onNoteChange={setNote}
          onAddPhotos={run ? addStationPhotos : addPhotos}
          onBack={run ? exitRun : () => router.back()}
          showWhisper={run ? false : whisper}
          devFakeRecording={devFakeRecording}
          devMockDevelop={devMockDevelop}
          startDeveloped={run ? null : startDeveloped}
          startExpanded={run ? false : startExpanded}
          saveType={saveType}
          saveCurriculums={saveCurriculums}
          devMockSave={devMockSave}
          onContinue={handleContinue}
          eyebrow={eyebrow}
          onEditTypeAge={() => setSheetOpen(true)}
          onManagePhotos={() => setPhotoSheetOpen(true)}
          onReorderPhotos={run ? reorderStationPhotos : reorderPhotos}
          run={captureRun}
          devForceState={devForceState}
        />
      )}
      {/* The type/age chip stays live in run mode (types/ages editable per station). */}
      <TypeAgeSheet open={sheetOpen} type={saveType} ages={saveCurriculums} onDone={handleTypeAgeDone} />
      {/* PhotoSheet (chunk 10 item ⑤): live in BOTH modes — mid-run it is scoped to the CURRENT
          station's photos (add/remove/reorder/cover touch that station only) and the ⊟ sort row is
          hidden (onSortIntoStations undefined → no nested sorting). Hidden only while SortBins is up. */}
      {!sorting && (
        <PhotoSheet
          open={photoSheetOpen}
          photos={run ? runPhotos : photos}
          onClose={() => setPhotoSheetOpen(false)}
          onReorder={run ? reorderStationPhotos : reorderPhotos}
          onRemove={run ? removeStationPhoto : removePhoto}
          onAddPhotos={run ? addStationPhotos : addPhotos}
          onSortIntoStations={run ? undefined : handleSortIntoStations}
        />
      )}
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
