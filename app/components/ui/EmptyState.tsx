// ============================================================
// EmptyState — centered icon + title + optional body + action.
// ------------------------------------------------------------
// Replaces one-off "Nothing planned yet" / "No components yet"
// prose sprinkled around the app. A SaaS buyer sees empty states
// on first run and in edge cases; inconsistency there is a tell.
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  body?: React.ReactNode
  /** Primary action — typically a <Button> or a <Link> wrapped button. */
  action?: React.ReactNode
  /** Dial the padding down for inline contexts (inside a card, e.g.). */
  compact?: boolean
}

export default function EmptyState({ icon, title, body, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
      ].join(' ')}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-text-dim mb-4">
          {icon}
        </div>
      )}
      <p className="font-heading text-text-muted text-base leading-snug">{title}</p>
      {body && (
        <p className="text-sm text-text-dim/70 mt-1.5 leading-relaxed max-w-xs">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
