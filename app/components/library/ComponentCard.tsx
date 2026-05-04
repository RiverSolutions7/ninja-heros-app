'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCardMenu from './ComponentCardMenu'

// ── Type metadata (exported — used by detail sheet and pickers) ─────────────

const TYPE_META: Record<ComponentType, {
  label: string
  border: string
  badge: string
  textColor: string
  placeholderBg: string
}> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-fire',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    textColor: 'text-accent-green',
    placeholderBg: 'bg-accent-green/20',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-fire',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    textColor: 'text-accent-blue',
    placeholderBg: 'bg-accent-blue/20',
  },
}

export { TYPE_META }

// ── Type icons — shown as ghost placeholder when no photo ────────────────────

function TypeIcon({ type, className }: { type: ComponentType; className?: string }) {
  if (type === 'game') {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface ComponentCardProps {
  component: ComponentRow
  showMenu?: boolean
  onClick?: () => void
  trailing?: React.ReactNode
}

// 76px thumbnail — card target ~100px tall
const THUMB = 76

export default function ComponentCard({ component, showMenu = false, onClick, trailing }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const firstPhoto = photos[0] ?? null
  const hasVideoUrl = !!component.video_url
  const hasVideo = !!(component.video_link || component.video_url)

  const [previewing, setPreviewing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (previewing) {
      videoRef.current?.play().catch(() => {})
    } else {
      videoRef.current?.pause()
    }
  }, [previewing])

  return (
    <div
      onClick={onClick}
      className="relative flex items-center gap-4 px-4 py-3 cursor-pointer active:bg-white/[0.02] transition-colors"
    >
      {/* ─── Thumbnail ───────────────────────────────────────────────────── */}
      <div
        style={{ width: THUMB, height: THUMB, minWidth: THUMB }}
        className="relative shrink-0 rounded-lg overflow-hidden"
      >
        {hasVideoUrl ? (
          <>
            {/* First-frame thumbnail or live preview */}
            <video
              ref={videoRef}
              src={previewing ? component.video_url! : `${component.video_url}#t=0.001`}
              preload="metadata"
              muted
              autoPlay={previewing}
              playsInline
              loop={previewing}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {previewing ? (
              /* Stop overlay — tap to end preview */
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.22)' }}
                onClick={(e) => { e.stopPropagation(); setPreviewing(false) }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {/* Stop square */}
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="1" y="1" width="7" height="7" rx="1" fill="#fff" />
                  </svg>
                </div>
              </div>
            ) : (
              /* Play overlay — tap to start preview */
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.22)' }}
                onClick={(e) => { e.stopPropagation(); setPreviewing(true) }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.40)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
                    <path d="M2 1.5l6.5 4L2 9.5V1.5z" fill="#fff" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : firstPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firstPhoto}
              alt={component.title}
              style={{ width: THUMB, height: THUMB }}
              className="object-cover block"
            />
            {hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </div>
            )}
            {photos.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
                +{photos.length - 1}
              </span>
            )}
          </>
        ) : (
          <div
            style={{ width: THUMB, height: THUMB }}
            className={`flex items-center justify-center ${meta.placeholderBg}`}
          >
            {hasVideo ? (
              <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            ) : (
              <TypeIcon type={component.type} className="w-5 h-5 text-white/50" />
            )}
          </div>
        )}
      </div>

      {/* ─── Info stack ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide">
          <span className={meta.textColor}>{meta.label}</span>
          {component.curriculum && (
            <>
              <span className="text-text-dim/40">·</span>
              <span className="text-text-dim truncate">{component.curriculum}</span>
            </>
          )}
        </div>
        <p className="font-heading text-[15px] uppercase text-text-primary leading-tight truncate mt-1.5">
          {component.title}
        </p>
      </div>

      {trailing ? (
        <div className="flex-shrink-0">{trailing}</div>
      ) : showMenu ? (
        <div data-component-menu className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ComponentCardMenu component={component} />
        </div>
      ) : null}
    </div>
  )
}
