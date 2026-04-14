'use client'

import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentCardMenu from './ComponentCardMenu'

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string; textColor: string; placeholderBg: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    textColor: 'text-accent-green',
    placeholderBg: 'bg-accent-green/20',
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

// ── Type icons (shown when no photo) ─────────────────────────────────────────

const TYPE_ICONS: Record<ComponentType, React.ReactNode> = {
  game: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  station: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
}

interface ComponentCardProps {
  component: ComponentRow
  showMenu?: boolean
  onClick?: () => void
}

function CameraIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
    </svg>
  )
}

export default function ComponentCard({ component, showMenu = false, onClick }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const firstPhoto = photos[0] ?? null
  const hasVideo = !!(component.video_link || component.video_url)

  // Games: title + metadata only, with subtle media icons if content exists
  const showMediaBadges = component.type !== 'station' && (photos.length > 0 || hasVideo)

  return (
    <div
      onClick={onClick}
      className={[
        'px-4 py-3.5 border-b border-bg-border/50 cursor-pointer hover:bg-white/5 active:bg-white/[0.03] transition-colors border-l-4',
        meta.border,
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Station thumbnail — photo if available, play icon if video only */}
        {component.type === 'station' && (firstPhoto || component.video_url) && (
          <div className="relative flex-shrink-0">
            <div className={[
              'w-14 h-14 rounded-xl overflow-hidden border border-bg-border/50 flex items-center justify-center',
              !firstPhoto ? 'bg-black/40' : '',
            ].join(' ')}>
              {firstPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={firstPhoto}
                  alt={component.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                />
              ) : (
                <svg className={['w-6 h-6', meta.textColor].join(' ')} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              )}
            </div>
            {photos.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
                +{photos.length - 1}
              </span>
            )}
          </div>
        )}

        {/* Title + metadata */}
        <div className="flex-1 min-w-0">
          <p className="font-heading text-[15px] text-text-primary leading-snug truncate">
            {component.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={['text-[10px] font-heading uppercase tracking-wide flex-shrink-0', meta.textColor].join(' ')}>
              {meta.label}
            </span>
            {component.curriculum && (
              <>
                <span className="text-text-dim/30 text-[10px] flex-shrink-0">·</span>
                <span className="text-[10px] text-text-dim truncate">{component.curriculum}</span>
              </>
            )}
          </div>
        </div>

        {/* Media presence indicators (games & warmups only) */}
        {showMediaBadges && (
          <div className="flex items-center gap-1.5 flex-shrink-0 text-text-dim/40">
            {photos.length > 0 && <CameraIcon />}
            {hasVideo && <VideoIcon />}
          </div>
        )}

        {showMenu && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ComponentCardMenu component={component} />
          </div>
        )}
      </div>
    </div>
  )
}
