// ============================================================
// MediaStrip — horizontal thumbnails row + trailing "+" tile.
// ------------------------------------------------------------
// Display surface for the log-component form's media zone.
// Renders photo, video, and link tiles; tapping a thumbnail
// previews it (photos use PhotoLightbox, videos inline player
// in a lightbox-style portal, links open in a new tab). The
// trailing "+" tile shape changes based on whether any media
// exists yet: full-width dashed placeholder when empty, compact
// 72x72 add-another tile when one or more items are present.
// ============================================================

'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { PhotoLightbox } from './PhotoLightbox'

// ── Shared type — also used by MediaAddSheet and the log-component pages ──────

export type MediaItem =
  | { localId: string; kind: 'photo'; url: string; file?: File }
  | { localId: string; kind: 'video'; url: string; file?: File }
  | { localId: string; kind: 'link'; url: string }

// ── Props ────────────────────────────────────────────────────────────────────

interface MediaStripProps {
  items: MediaItem[]
  onAdd: () => void
  onRemove: (localId: string) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MediaStrip({ items, onAdd, onRemove }: MediaStripProps) {
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  const photoUrls = items.filter((i) => i.kind === 'photo').map((i) => i.url)

  function handleTileTap(item: MediaItem) {
    if (item.kind === 'photo') {
      const idx = photoUrls.indexOf(item.url)
      setLightbox({ photos: photoUrls, index: Math.max(0, idx) })
    } else if (item.kind === 'video') {
      setVideoPreview(item.url)
    } else {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  // ── Empty state: wide full-width "+" placeholder ─────────────────────────
  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="w-full h-[120px] rounded-2xl border-2 border-dashed border-bg-border text-text-dim hover:text-accent-fire hover:border-accent-fire/50 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-2"
        aria-label="Add photo or video"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-heading">Add photo or video</span>
      </button>
    )
  }

  // ── Populated: horizontal scroll row of tiles + compact trailing "+" ─────
  return (
    <>
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory', touchAction: 'pan-x pan-y' }}
      >
        {items.map((item) => (
          <MediaTile
            key={item.localId}
            item={item}
            onTap={() => handleTileTap(item)}
            onRemove={() => onRemove(item.localId)}
          />
        ))}

        <button
          type="button"
          onClick={onAdd}
          className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 border-dashed border-bg-border text-text-dim hover:text-accent-fire hover:border-accent-fire/50 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Add another photo or video"
          style={{ scrollSnapAlign: 'end' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Photo lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Inline video player */}
      {videoPreview && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
          className="bg-black flex flex-col"
          onClick={() => setVideoPreview(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setVideoPreview(null) }}
              className="text-white/80 hover:text-white transition-colors p-1.5 -ml-1.5"
              aria-label="Close video"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <video src={videoPreview} controls autoPlay playsInline className="max-w-full max-h-full" />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// ── Tile — single thumbnail with remove "x" overlay ──────────────────────────

function MediaTile({
  item,
  onTap,
  onRemove,
}: {
  item: MediaItem
  onTap: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="relative flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-bg-input"
      style={{ scrollSnapAlign: 'start' }}
    >
      <button type="button" onClick={onTap} className="absolute inset-0 block active:opacity-75 transition-opacity">
        {item.kind === 'photo' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="Photo" className="w-full h-full object-cover" />
        ) : item.kind === 'video' ? (
          <div className="w-full h-full flex items-center justify-center bg-black/50">
            <svg className="w-7 h-7 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          </div>
        ) : (
          // Link tile — editorial icon, no preview fetch
          <div className="w-full h-full flex items-center justify-center bg-accent-fire/10 text-accent-fire">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        )}
      </button>

      {/* Remove button — top-right corner */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 active:scale-90 transition-all"
        aria-label="Remove"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
