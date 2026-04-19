// ============================================================
// Spinner — single source of truth for loading indicators.
// ------------------------------------------------------------
// Migrates the 10+ inline copies of the fire-red spinner pattern
// ("w-8 h-8 border-2 border-accent-fire border-t-transparent
// rounded-full animate-spin"). Use `tone="current"` inside
// dark contexts where currentColor already matches.
// ============================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
export type SpinnerTone = 'fire' | 'current' | 'muted'

interface SpinnerProps {
  size?: SpinnerSize
  tone?: SpinnerTone
  className?: string
  ariaLabel?: string
}

const SIZE: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-2',
}

const TONE: Record<SpinnerTone, string> = {
  fire:    'border-accent-fire',
  current: 'border-current',
  muted:   'border-text-dim',
}

export default function Spinner({
  size = 'md',
  tone = 'fire',
  className,
  ariaLabel = 'Loading',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        'inline-block border-t-transparent rounded-full animate-spin',
        SIZE[size],
        TONE[tone],
        className ?? '',
      ].join(' ')}
    />
  )
}
