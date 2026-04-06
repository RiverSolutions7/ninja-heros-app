import Link from 'next/link'

interface LibraryToggleProps {
  view: 'classes' | 'components'
}

export default function LibraryToggle({ view }: LibraryToggleProps) {
  return (
    <div className="flex rounded-xl border border-bg-border overflow-hidden bg-bg-secondary p-0.5 gap-0.5">
      <Link
        href="/library"
        className={[
          'flex-1 text-center text-sm font-heading py-2 rounded-lg transition-all duration-150',
          view === 'classes'
            ? 'bg-accent-fire text-white shadow-glow-fire'
            : 'text-text-muted hover:text-text-primary',
        ].join(' ')}
      >
        Classes
      </Link>
      <Link
        href="/library?view=components"
        className={[
          'flex-1 text-center text-sm font-heading py-2 rounded-lg transition-all duration-150',
          view === 'components'
            ? 'bg-accent-fire text-white shadow-glow-fire'
            : 'text-text-muted hover:text-text-primary',
        ].join(' ')}
      >
        Components
      </Link>
    </div>
  )
}
