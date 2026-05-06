'use client'

import { useEffect, useRef, useState } from 'react'
import CaptureStrip from './CaptureStrip'
import type { WalkthroughStation } from './types'

interface Props {
  station: number
  stations: WalkthroughStation[]
  newStationId: string | null
  onPhoto: (file: File) => void
  onClose: () => void
  onDone: () => void
}

const DOCK_H = 136
const STRIP_H = 66

function ViewfinderCorners() {
  const arm = 28
  const t = 2.5
  const color = 'rgba(255,255,255,0.85)'
  const positions: React.CSSProperties[] = [
    { top: 90, left: 36 },
    { top: 90, right: 36 },
    { bottom: 200, left: 36 },
    { bottom: 200, right: 36 },
  ]
  return (
    <>
      {positions.map((pos, i) => {
        const isTop = pos.top !== undefined
        const isLeft = pos.left !== undefined
        return (
          <div key={i} style={{ position: 'absolute', width: arm, height: arm, ...pos, pointerEvents: 'none' }}>
            <div
              style={{
                position: 'absolute',
                width: arm,
                height: t,
                background: color,
                top: isTop ? 0 : undefined,
                bottom: isTop ? undefined : 0,
                left: isLeft ? 0 : undefined,
                right: isLeft ? undefined : 0,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: t,
                height: arm,
                background: color,
                top: isTop ? 0 : undefined,
                bottom: isTop ? undefined : 0,
                left: isLeft ? 0 : undefined,
                right: isLeft ? undefined : 0,
              }}
            />
          </div>
        )
      })}
    </>
  )
}

export default function W2Frame({ station, stations, newStationId, onPhoto, onClose, onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [streamReady, setStreamReady] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera not supported on this browser')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          try {
            await video.play()
          } catch {
            // Some browsers throw on play() interruption — ignore.
          }
          setStreamReady(true)
        }
      } catch (err) {
        const name = (err as { name?: string })?.name
        const message =
          name === 'NotAllowedError'
            ? 'Camera access denied'
            : name === 'NotFoundError'
            ? 'No camera found'
            : 'Camera unavailable'
        setCameraError(message)
      }
    }

    start()

    return () => {
      cancelled = true
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      const video = videoRef.current
      if (video) {
        video.srcObject = null
      }
    }
  }, [])

  function handleShutter() {
    // No live stream → fall back to native camera/file picker.
    if (cameraError || !streamReady) {
      fallbackInputRef.current?.click()
      return
    }
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      fallbackInputRef.current?.click()
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `station-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onPhoto(file)
      },
      'image/jpeg',
      0.92,
    )
  }

  function handleFallbackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onPhoto(file)
    e.target.value = ''
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Live camera preview — fills the whole screen behind the UI. */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          background: '#000',
          display: cameraError ? 'none' : 'block',
        }}
      />

      {/* Vignette behind the video for the corner brackets to sit on. Visible only while the stream is loading or on error. */}
      {(cameraError || !streamReady) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'radial-gradient(ellipse 80% 60% at 50% 45%, #1a1a1f 0%, #050505 90%)',
          }}
        />
      )}

      <ViewfinderCorners />

      {/* Fallback file input — only used when getUserMedia fails. */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackChange}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 56,
          left: 16,
          zIndex: 30,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-label="Exit walkthrough"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {cameraError && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 24,
            right: 24,
            zIndex: 30,
            textAlign: 'center',
            fontFamily: 'var(--font-nunito), sans-serif',
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.45,
          }}
        >
          {cameraError}. Tap shutter to use your camera app instead.
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: DOCK_H + STRIP_H + 22,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 30,
          fontFamily: 'var(--font-russo), sans-serif',
          fontSize: 12,
          letterSpacing: '0.24em',
          color: 'rgba(255,255,255,0.85)',
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}
      >
        Frame the station
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: DOCK_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 60%)',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={handleShutter}
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#fff',
              border: '5px solid rgba(255,255,255,0.4)',
              boxShadow: '0 0 0 2px #fff, 0 0 24px rgba(255,255,255,0.25)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Take photo"
          />
        </div>

        <CaptureStrip stations={stations} newStationId={newStationId} onDone={onDone} />
      </div>
    </div>
  )
}
