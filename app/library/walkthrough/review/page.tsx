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
  const { stations, setParsed, setParseError, clearAll } = useWalkthrough()
  const [saving, setSaving] = useState(false)
  const parseStartedRef = useRef(false)

  useEffect(() => {
    if (stations.length === 0) {
      router.replace('/library/walkthrough')
      return
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
        const { error } = await supabase.from('components').insert({
          type: 'station',
          title: station.parsed.title || 'Untitled station',
          description: station.parsed.description,
          skills: station.parsed.skills,
          duration_minutes: station.parsed.durationMinutes,
          photos: [photoUrl],
          curriculum: null,
          in_handoff: false,
        })
        if (error) throw error
      }
      const count = stations.length
      clearAll()
      router.push(`/library/walkthrough/success?n=${count}`)
    } catch (err) {
      console.error('[walkthrough] save failed', err)
      setSaving(false)
    }
  }

  if (stations.length === 0) return null

  return (
    <W5Review
      stations={stations}
      saving={saving}
      onSaveAll={handleSaveAll}
      onUpdateParsed={setParsed}
    />
  )
}
