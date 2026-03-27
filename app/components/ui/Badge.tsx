import { clsx } from 'clsx'

type BadgeVariant =
  | 'difficulty'
  | 'age'
  | 'skill'
  | 'equipment'
  | 'warmup'
  | 'lane'
  | 'game'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'badge',
        {
          'badge-difficulty': variant === 'difficulty',
          'badge-age': variant === 'age',
          'badge-skill': variant === 'skill',
          'badge-equipment': variant === 'equipment',
          'badge-warmup': variant === 'warmup',
          'badge-lane': variant === 'lane',
          'badge-game': variant === 'game',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
