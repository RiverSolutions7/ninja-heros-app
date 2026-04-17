// ============================================================
// MenuList — presentational action-list.
// ------------------------------------------------------------
// Rendered inside any surface (popover on desktop, bottom sheet
// on mobile, inline anywhere). Owns no state, no portal — just
// the list of action rows. Consumers wrap it in whatever shell
// makes sense for their context, guaranteeing the internals
// look identical across surfaces.
// ============================================================

'use client'

export interface MenuItem {
  /** Icon rendered on the left (inline SVG, emoji, etc.). */
  icon?: React.ReactNode
  label: string
  onClick: () => void
  /** Red styling for destructive actions (Delete, Remove, etc.). */
  destructive?: boolean
  /** When true, a thin divider is rendered above this row. */
  dividerAbove?: boolean
  disabled?: boolean
}

interface MenuListProps {
  items: MenuItem[]
  /** Optional ARIA label for the list. */
  ariaLabel?: string
}

export default function MenuList({ items, ariaLabel }: MenuListProps) {
  return (
    <ul role="menu" aria-label={ariaLabel} className="flex flex-col">
      {items.map((item, idx) => (
        <li key={idx} role="none">
          {item.dividerAbove && idx > 0 && (
            <div className="h-px bg-bg-border mx-3" aria-hidden="true" />
          )}
          <button
            type="button"
            role="menuitem"
            onClick={item.onClick}
            disabled={item.disabled}
            className={[
              'w-full flex items-center gap-2.5 px-4 py-3.5 text-sm text-left transition-colors disabled:opacity-40',
              item.destructive
                ? 'text-accent-fire hover:bg-accent-fire/10'
                : 'text-text-primary hover:bg-white/5',
            ].join(' ')}
          >
            {item.icon && (
              <span
                className={[
                  'w-4 h-4 flex-shrink-0',
                  item.destructive ? 'text-accent-fire' : 'text-text-dim',
                ].join(' ')}
              >
                {item.icon}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
