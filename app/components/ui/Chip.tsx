// ============================================================
// Chip — small labeled pill for tags, badges, statuses.
// ------------------------------------------------------------
// One source of truth for the "STATION" / "GAME" / "IN PLAN" /
// "SAVED" / "NEW SKILL" style micro-labels. Variants map to the
// app's accent palette.
// ============================================================

export type ChipVariant = 'fire' | 'green' | 'blue' | 'neutral'
export type ChipSize = 'xs' | 'sm'

interface ChipProps {
  variant?: ChipVariant
  size?: ChipSize
  /** Optional leading icon (shows at 12–14px). */
  icon?: React.ReactNode
  children: React.ReactNode
  /** Tinted background + border vs ghost (text only). */
  filled?: boolean
  className?: string
}

const VARIANT_STYLES: Record<ChipVariant, { text: string; bg: string; border: string }> = {
  fire:    { text: 'text-accent-fire',  bg: 'bg-accent-fire/10',  border: 'border-accent-fire/25' },
  green:   { text: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/25' },
  blue:    { text: 'text-accent-blue',  bg: 'bg-accent-blue/10',  border: 'border-accent-blue/25' },
  neutral: { text: 'text-text-dim',     bg: 'bg-white/5',         border: 'border-bg-border' },
}

const SIZE_STYLES: Record<ChipSize, string> = {
  xs: 'text-[10px] px-2 py-0.5',
  sm: 'text-[11px] px-2.5 py-1',
}

export default function Chip({
  variant = 'neutral',
  size = 'xs',
  icon,
  children,
  filled = false,
  className,
}: ChipProps) {
  const v = VARIANT_STYLES[variant]
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full font-heading uppercase tracking-wide whitespace-nowrap',
        SIZE_STYLES[size],
        v.text,
        filled ? `${v.bg} border ${v.border}` : '',
        className ?? '',
      ].join(' ')}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
