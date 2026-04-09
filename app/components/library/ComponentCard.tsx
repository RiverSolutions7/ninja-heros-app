'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCardMenu from './ComponentCardMenu'

interface ComponentCardProps {
  component: ComponentRow
  showMenu?: boolean
  onClick?: () => void
}

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string; textColor: string; placeholderBg: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    textColor: 'text-accent-green',
    placeholderBg: 'bg-accent-green/20',
  },
  warmup: {
    label: 'Warmup',
    border: 'border-l-accent-gold',
    badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
    textColor: 'text-accent-gold',
    placeholderBg: 'bg-accent-gold/20',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    textColor: 'text-accent-blue',
    placeholderBg: 'bg-accent-blue/20',
  },
}

export { TYPE_META }

function PlaceholderIcon({ type }: { type: ComponentType }) {
  if (type === 'warmup') {
    return (
      <svg className="w-6 h-6 text-accent-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    )
  }
  if (type === 'game') {
    return (
      <svg className="w-6 h-6 text-accent-green/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    )
  }
  // station
  return (
    <svg className="w-6 h-6 text-accent-blue/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export default function ComponentCard({ component, showMenu = false, onClick }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const firstPhoto = component.photos?.[0] ?? null
  const [shareToast, setShareToast] = useState(false)

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const url = `${window.location.origin}/component/${component.id}`
    if (navigator.share) {
      navigator.share({ title: component.title, url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareToast(true)
        setTimeout(() => setShareToast(false), 2500)
      })
    }
  }

  const meta2 = [
    component.curriculum,
    meta.label,
    component.duration_minutes != null ? `${component.duration_minutes}m` : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <div
        onClick={onClick}
        className={[
          'flex items-center gap-3 px-4 py-3 border-b border-bg-border/50 cursor-pointer hover:bg-white/5 active:bg-white/[0.03] transition-colors border-l-4',
          meta.border,
        ].join(' ')}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
          {firstPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstPhoto}
              alt={component.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={['w-full h-full flex items-center justify-center', meta.placeholderBg].join(' ')}>
              <PlaceholderIcon type={component.type} />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-heading text-[15px] text-text-primary leading-snug truncate">
            {component.title}
          </p>
          {meta2 && (
            <p className="text-xs text-text-dim mt-0.5 truncate">{meta2}</p>
          )}
        </div>

        {/* Actions */}
        {showMenu && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share component"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <ComponentCardMenu component={component} />
            </div>
          </div>
        )}
      </div>

      {/* Link copied toast */}
      {shareToast && typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-bg-card border border-bg-border rounded-xl px-4 py-2.5 shadow-2xl text-sm text-text-primary whitespace-nowrap pointer-events-none">
          <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Link copied!
        </div>,
        document.body
      )}
    </>
  )
}
