import type { ComponentRow, ComponentType } from '@/app/lib/database.types'

interface ComponentCardProps {
  component: ComponentRow
}

const TYPE_META: Record<ComponentType, { label: string; border: string; badge: string }> = {
  game: {
    label: 'Game',
    border: 'border-l-accent-green',
    badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20',
  },
  warmup: {
    label: 'Warmup',
    border: 'border-l-accent-gold',
    badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20',
  },
  station: {
    label: 'Station',
    border: 'border-l-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
  },
}

export default function ComponentCard({ component }: ComponentCardProps) {
  const meta = TYPE_META[component.type]

  return (
    <div
      className={[
        'bg-bg-card rounded-2xl shadow-card border border-bg-border border-l-4 p-4',
        meta.border,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-heading text-text-primary text-base leading-snug truncate">
            {component.title}
          </p>
          {(component.curriculum || component.equipment) && (
            <p className="text-text-dim text-xs mt-0.5 truncate">
              {[component.curriculum, component.equipment].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {component.duration_minutes != null && (
            <span className="text-xs text-text-dim">
              {component.duration_minutes}m
            </span>
          )}
          <span className={['text-xs font-semibold px-2 py-0.5 rounded-full', meta.badge].join(' ')}>
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  )
}
