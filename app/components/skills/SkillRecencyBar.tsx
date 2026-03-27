import type { SkillRecency } from '@/app/lib/database.types'

interface SkillRecencyBarProps {
  item: SkillRecency
}

function formatRelative(dateStr: string, daysSince: number): string {
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return 'Yesterday'
  if (daysSince < 7) return `${daysSince}d ago`
  if (daysSince < 30) return `${Math.floor(daysSince / 7)}w ago`
  return `${Math.floor(daysSince / 30)}mo ago`
}

export default function SkillRecencyBar({ item }: SkillRecencyBarProps) {
  const { skill, status, lastUsed, daysSince } = item

  const barColor =
    status === 'green'
      ? 'bg-accent-green'
      : status === 'yellow'
      ? 'bg-accent-gold'
      : status === 'red'
      ? 'bg-accent-fire'
      : 'bg-bg-border'

  const barWidth =
    status === 'green'
      ? 'w-full'
      : status === 'yellow'
      ? 'w-2/3'
      : status === 'red'
      ? 'w-1/4'
      : 'w-0'

  const labelColor =
    status === 'green'
      ? 'text-accent-green'
      : status === 'yellow'
      ? 'text-accent-gold'
      : status === 'red'
      ? 'text-accent-fire'
      : 'text-text-dim'

  const lastUsedLabel =
    status === 'never'
      ? 'Never'
      : daysSince !== null
      ? formatRelative(lastUsed!, daysSince)
      : ''

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-28 text-sm text-text-primary flex-shrink-0 font-semibold">
        {skill}
      </span>
      <div className="flex-1 h-2 rounded-full bg-bg-border overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor} ${barWidth}`}
        />
      </div>
      <span className={`text-xs font-semibold flex-shrink-0 w-16 text-right ${labelColor}`}>
        {lastUsedLabel}
      </span>
    </div>
  )
}
