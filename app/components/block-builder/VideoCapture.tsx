'use client'

import { useRef } from 'react'

interface VideoCaptureProps {
  preview: string | null
  onFileSelected: (file: File, preview: string) => void
}

export default function VideoCapture({ preview, onFileSelected }: VideoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    onFileSelected(file, objectUrl)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Record Video — triggers camera directly */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-accent-fire hover:text-accent-fire/80 transition-colors py-2 px-3 rounded-xl border border-accent-fire/30 hover:bg-accent-fire/5"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {preview ? 'Re-record Video' : 'Record Video'}
        </button>

        {/* Choose from Library */}
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-2 px-3 rounded-xl border border-bg-border hover:bg-white/5"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Choose from Library
        </button>
      </div>

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

      {/* Camera/library input */}
      <input
        ref={cameraRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
        aria-label="Record video"
      />

      {/* Library input — opens video library */}
      <input
        ref={libraryRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
        aria-label="Choose video from library"
      />
    </div>
  )
}
