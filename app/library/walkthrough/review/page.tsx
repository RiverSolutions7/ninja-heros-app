'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import { parseComponentTranscript } from '@/app/lib/parseComponent'
import { useWalkthrough } from '@/app/components/walkthrough/WalkthroughContext'
import W5Review from '@/app/components/walkthrough/W5Review'

export default function WalkthroughReviewPage() {
  const router = useRouter()
  const { stations, setParsed, setParseError } = useWalkthrough()
  const [saving, setSaving] = useState(false)
  const parseStartedRef = useRef(false)
  // Tracks whether the empty-stations redirect was already evaluated on
  // mount. Without this ref the redirect fires *every* time `stations`
  // becomes empty — including the one beat between the save loop's
  // success and the navigation to /success — which races the push and
  // dumps the coach back on the intro screen.
  const emptyCheckDoneRef = useRef(false)
  // Set to true once we've kicked off the navigation to /success so the
  // page stops responding to context changes while React unmounts it.
  const completingRef = useRef(false)

  useEffect(() => {
    if (!emptyCheckDoneRef.current) {
      emptyCheckDoneRef.current = true
      if (stations.length === 0) {
        router.replace('/library/walkthrough')
        return
      }
    }
    if (parseStartedRef.current) return
    parseStartedRef.current = true

    const stationsToParse = stations.filter((s) => !s.parsed && !s.parseError)
    stationsToParse.forEach(async (s) => {
      try {
        const result = await parseComponentTranscript(s.transcript || '', 'station')
        setParsed(s.id, result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parse failed'
        setParseError(s.id, message)
        setParsed(s.id, {
          title: 'Untitled station',
          description: s.transcript ? `[Voice — please review]\n${s.transcript}` : '',
          skills: [],
          durationMinutes: null,
        })
      }
    })
  }, [stations, setParsed, setParseError, router])

  async function handleSaveAll() {
    if (saving) return
    setSaving(true)
    try {
      for (const station of stations) {
        if (!station.parsed) continue
        const photoUrl = await uploadStationPhoto(station.photoFile)
        const insertPayload = {
          type: 'station',
          title: station.parsed.title.trim() || 'Untitled station',
          curriculum: null,
          description: station.parsed.description.trim() || null,
          skills: station.parsed.skills.length > 0 ? station.parsed.skills : null,
          photos: [photoUrl],
          duration_minutes: station.parsed.durationMinutes,
        }
        const { error } = await supabase.from('components').insert(insertPayload)
        if (error) {
          console.error('[walkthrough] insert error', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            payload: insertPayload,
          })
          throw new Error(error.message || 'Insert failed')
        }
      }
      const count = stations.length
      // Mark complete BEFORE navigating so the success page (which calls
      // clearAll on mount) won't trigger our empty-stations redirect.
      completingRef.current = true
      router.push(`/library/walkthrough/success?n=${count}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      console.error('[walkthrough] save failed:', message, err)
      setSaving(false)
      alert(`Save failed: ${message}`)
    }
  }

  // Only block the initial render when we landed here with no stations
  // and haven't yet started saving. Once saving completes, completingRef
  // is true and the page just unmounts as it navigates to /success.
  if (stations.length === 0 && !completingRef.current) return null

  return (
    <W5Review
      stations={stations}
      saving={saving}
      onSaveAll={handleSaveAll}
      onUpdateParsed={setParsed}
    />
  )
}
