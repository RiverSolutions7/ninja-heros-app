'use client'

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

export default function ComponentCard({ component, showMenu = false, onClick }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const firstPhoto = component.photos?.[0] ?? null

  const meta2 = component.curriculum || ''

  return (
    <>
      <div
        onClick={onClick}
        className={[
          'flex items-center gap-3 px-4 py-3 border-b border-bg-border/50 cursor-pointer hover:bg-white/5 active:bg-white/[0.03] transition-colors border-l-4',
          meta.border,
        ].join(' ')}
      >
        {/* Thumbnail — only when photo exists */}
        {firstPhoto && (
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firstPhoto}
              alt={component.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

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
          <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ComponentCardMenu component={component} />
          </div>
        )}
      </div>
    </>
  )
}
