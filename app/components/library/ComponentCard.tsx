'use client'

import type { ComponentRow, ComponentType } from '@/app/lib/database.types'

interface ComponentCardProps {
  component: ComponentRow
}

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string; textColor: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
    textColor: 'text-accent-green',
  },
  warmup: {
    label: 'Warmup',
    border: 'border-l-accent-gold',
    badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
    textColor: 'text-accent-gold',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    textColor: 'text-accent-blue',
  },
}

export { TYPE_META }

export default function ComponentCard({ component }: ComponentCardProps) {
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []
  const firstPhoto = photos[0] ?? null

  return (
    <div
      className={[
        'bg-bg-card rounded-2xl shadow-card border border-bg-border border-l-4 p-4',
        meta.border,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="font-heading text-text-primary text-base leading-snug">
            {component.title}
          </p>
          {(component.curriculum || component.duration_minutes != null) && (
            <p className="text-text-dim text-xs mt-0.5">
              {[
                component.curriculum,
                component.duration_minutes != null ? `${component.duration_minutes}m` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {/* Skills pills */}
          {(component.skills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {component.skills!.map((skill) => (
                <span key={skill} className="badge badge-skill">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: thumbnail + badge */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {firstPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstPhoto}
              alt={component.title}
              className="w-16 h-16 rounded-xl object-cover border border-bg-border"
            />
          )}
          <span className={['text-xs font-semibold px-2 py-0.5 rounded-full', meta.badge].join(' ')}>
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  )
}
