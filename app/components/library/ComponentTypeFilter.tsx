import Link from 'next/link'

interface ComponentTypeFilterProps {
  activeType: string
}

const PILLS = [
  { label: 'All', value: '' },
  { label: 'Games', value: 'game' },
  { label: 'Warmups', value: 'warmup' },
  { label: 'Stations', value: 'station' },
]

export default function ComponentTypeFilter({ activeType }: ComponentTypeFilterProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PILLS.map(({ label, value }) => {
        const href = value
          ? `/library?view=components&ctype=${value}`
          : '/library?view=components'
        const isActive = activeType === value
        return (
          <Link
            key={label}
            href={href}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap',
              isActive
                ? 'bg-accent-fire text-white shadow-glow-fire'
                : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
            ].join(' ')}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
