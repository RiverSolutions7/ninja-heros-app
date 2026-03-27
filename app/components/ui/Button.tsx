'use client'

import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-heading rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // Variants
          'bg-accent-fire text-white hover:bg-accent-fire/90 shadow-lg shadow-accent-fire/25':
            variant === 'primary',
          'bg-bg-border text-text-primary hover:bg-bg-border/80':
            variant === 'secondary',
          'text-text-muted hover:text-text-primary hover:bg-white/5':
            variant === 'ghost',
          'bg-red-900/50 text-red-400 hover:bg-red-900/70 border border-red-900':
            variant === 'danger',
          // Sizes
          'text-xs px-3 py-2 min-h-[36px]': size === 'sm',
          'text-sm px-4 py-2.5 min-h-[44px]': size === 'md',
          'text-base px-6 py-3 min-h-[52px]': size === 'lg',
          // Width
          'w-full': fullWidth,
        },
        className
      )}
    >
      {children}
    </button>
  )
}
