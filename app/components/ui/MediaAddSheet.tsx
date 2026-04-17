// ============================================================
// MediaAddSheet — bottom sheet with five media-capture options.
// ------------------------------------------------------------
// Unifies what used to be four separate buttons (Take Photo /
// From Library / Record Video / Choose Video) plus the video
// link input, into one affordance: tap "+", pick one of five
// rows, done. The four file-picker rows each own a hidden
// <input type="file">; tapping a row triggers the native
// picker with the correct `accept` + `capture` attributes.
// The fifth row expands inline into a URL input.
//
// Emits: onAdd(item) — parent wires files to upload & link to
// the video_link slot as appropriate.
// ============================================================

'use client'

import { useRef, useState } from 'react'
import BottomSheet from './BottomSheet'
import { randomId } from '@/app/lib/uuid'
import type { MediaItem } from './MediaStrip'

interface MediaAddSheetProps {
  visible: boolean
  onClose: () => void
  onAdd: (item: MediaItem) => void
  /**
   * When the parent already has a video, the record/library-video rows
   * swap to a "Replace video" copy. Same for link.
   */
  hasVideo?: boolean
  hasLink?: boolean
}

export default function MediaAddSheet({
  visible,
  onClose,
  onAdd,
  hasVideo = false,
  hasLink = false,
}: MediaAddSheetProps) {
  const takePhotoRef = useRef<HTMLInputElement>(null)
  const libraryPhotoRef = useRef<HTMLInputElement>(null)
  const recordVideoRef = useRef<HTMLInputElement>(null)
  const libraryVideoRef = useRef<HTMLInputElement>(null)

  const [linkMode, setLinkMode] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  function handleFilePicked(kind: 'photo' | 'video', file: File | null) {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    onAdd({ localId: randomId(), kind, url: previewUrl, file })
    // Reset the input so the same file can be picked again if the coach
    // added, removed, and wants to re-add it.
    if (kind === 'photo') {
      if (takePhotoRef.current) takePhotoRef.current.value = ''
      if (libraryPhotoRef.current) libraryPhotoRef.current.value = ''
    } else {
      if (recordVideoRef.current) recordVideoRef.current.value = ''
      if (libraryVideoRef.current) libraryVideoRef.current.value = ''
    }
    onClose()
  }

  function handleLinkSubmit() {
    const url = linkUrl.trim()
    if (!url) return
    // Prepend https:// if the coach omitted scheme
    const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`
    onAdd({ localId: randomId(), kind: 'link', url: normalized })
    setLinkUrl('')
    setLinkMode(false)
    onClose()
  }

  function handleClose() {
    // Reset the inline link mode so the next open starts fresh.
    setLinkMode(false)
    setLinkUrl('')
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} title="Add to library">
      <div className="px-4 pt-2 pb-6 flex flex-col gap-2">
        {/* 1. Take Photo */}
        <MediaOption
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5l1.125 2.625H21a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0121 19.125H3A1.5 1.5 0 011.5 17.625v-9a1.5 1.5 0 011.5-1.5h2.625L6.75 4.5z" />
            </svg>
          }
          label="Take photo"
          sublabel="Use your camera"
          onClick={() => takePhotoRef.current?.click()}
        />

        {/* 2. Photo from Library */}
        <MediaOption
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6A1.5 1.5 0 016 4.5h12A1.5 1.5 0 0119.5 6v12a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 18V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15l3.75-3.75 4.5 4.5L15.75 12l3.75 3.75M9 9a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          }
          label="Photo from library"
          sublabel="Choose an existing image"
          onClick={() => libraryPhotoRef.current?.click()}
        />

        {/* 3. Record Video */}
        <MediaOption
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          label={hasVideo ? 'Replace video (record)' : 'Record video'}
          sublabel="Use your camera"
          onClick={() => recordVideoRef.current?.click()}
        />

        {/* 4. Video from Library */}
        <MediaOption
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125" />
            </svg>
          }
          label={hasVideo ? 'Replace video (library)' : 'Video from library'}
          sublabel="Choose an existing video"
          onClick={() => libraryVideoRef.current?.click()}
        />

        {/* 5. Paste Video Link — expands inline */}
        {linkMode ? (
          <div className="flex flex-col gap-2 bg-bg-input border border-accent-fire/40 rounded-xl p-3">
            <label className="text-[10px] font-heading uppercase tracking-wider text-text-dim">
              {hasLink ? 'Replace video link' : 'Paste video link'}
            </label>
            <input
              type="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLinkSubmit()
                if (e.key === 'Escape') { setLinkMode(false); setLinkUrl('') }
              }}
              placeholder="youtube.com/… or a direct video URL"
              className="w-full bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/60 transition-colors"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLinkSubmit}
                disabled={!linkUrl.trim()}
                className={[
                  'flex-1 font-heading text-sm py-2 rounded-lg transition-all',
                  linkUrl.trim()
                    ? 'bg-accent-fire text-white active:scale-[0.98]'
                    : 'bg-bg-card text-text-dim border border-bg-border cursor-not-allowed',
                ].join(' ')}
              >
                Add link
              </button>
              <button
                type="button"
                onClick={() => { setLinkMode(false); setLinkUrl('') }}
                className="px-4 text-sm font-heading text-text-dim hover:text-text-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <MediaOption
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            }
            label={hasLink ? 'Replace video link' : 'Paste video link'}
            sublabel="YouTube, Vimeo, or direct URL"
            onClick={() => setLinkMode(true)}
          />
        )}
      </div>

      {/* Hidden file inputs — triggered by the option rows above */}
      <input
        ref={takePhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFilePicked('photo', e.target.files?.[0] ?? null)}
      />
      <input
        ref={libraryPhotoRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFilePicked('photo', e.target.files?.[0] ?? null)}
      />
      <input
        ref={recordVideoRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(e) => handleFilePicked('video', e.target.files?.[0] ?? null)}
      />
      <input
        ref={libraryVideoRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => handleFilePicked('video', e.target.files?.[0] ?? null)}
      />
    </BottomSheet>
  )
}

// ── Option row primitive ─────────────────────────────────────────────────────

function MediaOption({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-bg-input border border-bg-border rounded-xl px-4 py-3 text-left hover:border-accent-fire/40 active:scale-[0.99] transition-all"
    >
      <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-fire/10 flex items-center justify-center text-accent-fire">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-heading text-[15px] text-text-primary leading-tight">{label}</span>
        <span className="block text-[11px] text-text-dim mt-0.5">{sublabel}</span>
      </span>
      <svg className="w-4 h-4 text-text-dim/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
