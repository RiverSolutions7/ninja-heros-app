'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 bottom-0 top-0 flex flex-col bg-bg-secondary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-bg-border flex-shrink-0">
          {title && (
            <h2 className="font-heading text-lg text-text-primary">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-text-muted hover:text-text-primary p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
