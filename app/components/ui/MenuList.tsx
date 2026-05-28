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
          {idx > 0 && (
            <div
              className="mx-4"
              style={{
                height: '0.5px',
                background: item.dividerAbove
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(255,255,255,0.08)',
              }}
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            role="menuitem"
            onClick={item.onClick}
            disabled={item.disabled}
            className={[
              'w-full flex items-center gap-3 px-4 py-4 text-[15px] text-left transition-colors disabled:opacity-40',
              item.destructive
                ? 'text-accent-fire hover:bg-accent-fire/10 active:bg-accent-fire/15'
                : 'text-text-primary hover:bg-white/5 active:bg-white/10',
            ].join(' ')}
          >
            {item.icon && (
              <span className="w-5 h-5 flex-shrink-0 text-accent-fire">
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
