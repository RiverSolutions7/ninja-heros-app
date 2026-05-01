'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVoiceNote } from '@/app/hooks/useVoiceNote'
import { useWalkthrough } from '@/app/components/walkthrough/WalkthroughContext'
import W2Frame from '@/app/components/walkthrough/W2Frame'
import W3Ready from '@/app/components/walkthrough/W3Ready'
import W3Describe from '@/app/components/walkthrough/W3Describe'

type Step = 'frame' | 'ready' | 'recording'

export default function WalkthroughCapturePage() {
  const router = useRouter()
  const { stations, addStation, clearAll } = useWalkthrough()
  const voice = useVoiceNote()

  const [step, setStep] = useState<Step>('frame')
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; url: string } | null>(null)
  const [newStationId, setNewStationId] = useState<string | null>(null)
  const pendingUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pendingUrlRef.current) {
        URL.revokeObjectURL(pendingUrlRef.current)
        pendingUrlRef.current = null
      }
    }
  }, [])

  function handlePhoto(file: File) {
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    pendingUrlRef.current = url
    setPendingPhoto({ file, url })
    setStep('ready')
  }

  function handleRecord() {
    voice.startRecording()
    setStep('recording')
  }

  function handleStop() {
    voice.stopRecording()
    if (pendingPhoto) {
      const transcript = voice.transcript
      const id = addStation(pendingPhoto.file, transcript)
      pendingUrlRef.current = null
      setPendingPhoto(null)
      setNewStationId(id)
      voice.reset()
      setStep('frame')
      window.setTimeout(() => setNewStationId(null), 600)
    }
  }

  function handleRetake() {
    voice.reset()
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current)
      pendingUrlRef.current = null
    }
    setPendingPhoto(null)
    setStep('frame')
  }

  function handleClose() {
    voice.reset()
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current)
      pendingUrlRef.current = null
    }
    clearAll()
    router.push('/library')
  }

  function handleDone() {
    if (stations.length === 0) return
    router.push('/library/walkthrough/review')
  }

  const stationNumber = stations.length + 1

  if (step === 'ready' && pendingPhoto) {
    return (
      <W3Ready
        station={stationNumber}
        photoUrl={pendingPhoto.url}
        stations={stations}
        newStationId={newStationId}
        onRecord={handleRecord}
        onRetake={handleRetake}
        onDone={handleDone}
      />
    )
  }

  if (step === 'recording' && pendingPhoto) {
    return (
      <W3Describe
        station={stationNumber}
        photoUrl={pendingPhoto.url}
        stations={stations}
        newStationId={newStationId}
        onStop={handleStop}
        onRetake={handleRetake}
        onDone={handleDone}
      />
    )
  }

  return (
    <W2Frame
      station={stationNumber}
      stations={stations}
      newStationId={newStationId}
      onPhoto={handlePhoto}
      onClose={handleClose}
      onDone={handleDone}
    />
  )
}
