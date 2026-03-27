'use client'

import { useRef, useState } from 'react'

interface CameraUploadProps {
  preview: string | null
  onFileSelected: (file: File, preview: string) => void
}

export default function CameraUpload({ preview, onFileSelected }: CameraUploadProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    onFileSelected(file, objectUrl)
    e.target.value = ''
  }

  return (
    <>
      <div className="flex items-center gap-3 mt-1 flex-wrap">
        {/* Take Photo — triggers camera directly */}
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors py-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {preview ? 'Retake Photo' : 'Take Photo'}
        </button>

        {/* Choose from Library */}
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Choose from Library
        </button>

        {/* Thumbnail */}
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Station photo preview"
            className="w-14 h-14 rounded-lg object-cover border border-bg-border cursor-pointer active:scale-95 transition-transform"
            onClick={() => setFullscreen(true)}
          />
        )}
      </div>

      {/* Camera input — forces camera capture */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
        aria-label="Take station photo"
      />

      {/* Library input — opens photo library */}
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-label="Choose photo from library"
      />

      {/* Fullscreen photo preview */}
      {fullscreen && preview && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10"
            onClick={() => setFullscreen(false)}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Full size station photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
