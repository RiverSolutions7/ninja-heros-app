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
  const photos = component.photos ?? []
  const firstPhoto = photos[0] ?? null
  const hasDetail = !!(component.description || component.equipment || (component.skills?.length ?? 0) > 0)

  return (
    <div
      onClick={onClick}
      className={[
        'px-4 py-3.5 border-b border-bg-border/50 cursor-pointer hover:bg-white/5 active:bg-white/[0.03] transition-colors border-l-4',
        meta.border,
      ].join(' ')}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-heading text-[15px] text-text-primary leading-snug">
            {component.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-heading uppercase tracking-wide flex-shrink-0 ${meta.textColor}`}>
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
        {showMenu && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ComponentCardMenu component={component} />
          </div>
        )}
      </div>

      {/* Photo + description body */}
      {(firstPhoto || hasDetail) && (
        <div className="flex gap-3 mt-2.5">
          {/* Photo thumbnail — larger than before, tap-to-expand indicator */}
          {firstPhoto && (
            <div className="relative flex-shrink-0">
              <div className="w-[84px] h-[84px] rounded-xl overflow-hidden border border-bg-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={firstPhoto}
                  alt={component.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                />
              </div>
              {photos.length > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
                  +{photos.length - 1}
                </span>
              )}
            </div>
          )}

          {/* Text detail */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {component.description && (
              <p className="text-[13px] text-text-primary leading-relaxed">
                {component.description}
              </p>
            )}
            {component.equipment && (
              <p className="text-[12px] text-text-dim">
                <span className="font-heading uppercase text-[9px] text-text-dim/50 mr-1 tracking-wide">Gear</span>
                {component.equipment}
              </p>
            )}
            {(component.skills?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {component.skills!.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-text-dim border border-bg-border leading-none"
                  >
                    {skill}
                  </span>
                ))}
                {component.skills!.length > 4 && (
                  <span className="text-[10px] text-text-dim/50">+{component.skills!.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
