// TEMPORARY dev harness for verifying the Capture screen in isolation (the preview can't
// drive the native file-picker). Seeds sample photos of mixed aspect. Deleted in Chunk 9.
'use client'

import { useEffect, useState } from 'react'
import Capture from '@/app/components/log-flow/Capture'
import type { MicState } from '@/app/components/log-flow/atoms'

function makeImg(w: number, h: number, label: string, c1: string, c2: string): string {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const x = cv.getContext('2d')!
  const g = x.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, c1)
  g.addColorStop(1, c2)
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  x.strokeStyle = 'rgba(255,255,255,0.28)'
  x.lineWidth = Math.max(2, w * 0.008)
  x.strokeRect(0, 0, w, h)
  x.fillStyle = 'rgba(255,255,255,0.92)'
  x.font = `700 ${Math.round(Math.min(w, h) * 0.13)}px Nunito, sans-serif`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(label, w / 2, h / 2)
  return cv.toDataURL('image/png')
}

export default function DevCapturePage() {
  const [urls, setUrls] = useState<string[]>([])
  const [micState, setMicState] = useState<MicState>('idle')

  useEffect(() => {
    setUrls([
      makeImg(1600, 900, 'WIDE 16:9', '#3d1100', '#0e0500'),
      makeImg(800, 1000, 'TALL 4:5', '#0b2436', '#04101a'),
      makeImg(1000, 1000, 'SQUARE', '#231400', '#090700'),
    ])
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      {/* tiny dev controls to drive states the file-picker / mic can't */}
      <div style={{ position: 'fixed', top: 6, left: 6, zIndex: 99999, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
        {(['idle', 'typing', 'recording', 'stopped', 'parsing'] as MicState[]).map((s) => (
          <button
            key={s}
            onClick={() => setMicState(s)}
            style={{ fontSize: 10, padding: '2px 5px', background: micState === s ? '#f97316' : '#222', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            {s}
          </button>
        ))}
        <button onClick={() => setUrls([])} style={{ fontSize: 10, padding: '2px 5px', background: '#222', color: '#fff', border: 'none', borderRadius: 4 }}>
          empty
        </button>
      </div>

      <Capture
        type="station"
        previewUrls={urls}
        onCapture={() => setUrls((u) => [...u, makeImg(1200, 800, `NEW ${u.length + 1}`, '#1a3a1a', '#06140a')])}
        onRemove={(i) => setUrls((u) => u.filter((_, j) => j !== i))}
        onReorder={(order) => setUrls((u) => order.map((i) => u[i]))}
        state={micState}
        getAmplitude={() => 0.35}
        onStart={() => setMicState('recording')}
        onTypingStart={() => setMicState('typing')}
        onTypeSubmit={() => setMicState('idle')}
        onCancel={() => setMicState('idle')}
        onStop={() => setMicState('stopped')}
        onDone={() => setMicState('idle')}
        onBack={() => {}}
        onClose={() => {}}
      />
    </div>
  )
}
