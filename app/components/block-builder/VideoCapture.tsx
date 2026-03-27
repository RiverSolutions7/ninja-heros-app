'use client'

import { useRef } from 'react'

interface VideoCaptureProps {
  preview: string | null
  onFileSelected: (file: File, preview: string) => void
}

export default function VideoCapture({ preview, onFileSelected }: VideoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    onFileSelected(file, objectUrl)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      {/* Record button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 text-sm font-semibold text-accent-fire hover:text-accent-fire/80 transition-colors py-2 px-3 rounded-xl border border-accent-fire/30 hover:bg-accent-fire/5"
      >
        {/* Video camera icon */}
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {preview ? 'Re-record Video' : 'Record Video'}
      </button>

      {/* Video preview player */}
      {preview && (
        <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
          <video
            src={preview}
            controls
            playsInline
            className="w-full"
            style={{ maxHeight: '220px' }}
          />
        </div>
      )}

      {/* Hidden file input — triggers camera in video mode on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-label="Record or upload video"
      />
    </div>
  )
}
