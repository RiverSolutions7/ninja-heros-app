// ============================================================
// Button — single source of truth for the app's button styles.
// ------------------------------------------------------------
// Before this existed, every page rolled its own inline
// button chrome — "Save" rendered four different ways across
// /plan, /library, and the log-component form. That's the
// textbook "AI-generated toy" tell to a SaaS buyer. This
// component collapses the variations into four variants
// (primary / secondary / ghost / destructive) × three sizes
// (sm / md / lg).
//
// Use `as={Link}` or `href` via an `<a>` wrapper when you need
// navigation behavior — Button only renders a real <button>.
// ============================================================

import { forwardRef } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Show a spinner and disable the button while loading. */
  loading?: boolean
  /** Optional leading icon node (rendered at 16–20px depending on size). */
  icon?: React.ReactNode
  /** Stretch the button to fill its container's width. */
  block?: boolean
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:     'bg-accent-fire text-white shadow-glow-fire',
  secondary:   'bg-transparent border border-bg-border text-text-muted hover:border-accent-fire/40 hover:text-text-primary',
  ghost:       'bg-transparent text-text-muted hover:text-text-primary hover:bg-white/5',
  destructive: 'bg-red-500 text-white',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'text-sm py-2 px-3 rounded-lg min-h-[36px]',
  md: 'text-sm py-3 px-4 rounded-xl min-h-[44px]',
  lg: 'text-base py-4 px-5 rounded-2xl min-h-[52px]',
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    block = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 font-heading transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        block ? 'w-full' : '',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className={['border-2 border-current border-t-transparent rounded-full animate-spin', ICON_SIZE[size]].join(' ')} />
      ) : icon ? (
        <span className={['flex-shrink-0', ICON_SIZE[size]].join(' ')}>{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  )
})

export default Button
