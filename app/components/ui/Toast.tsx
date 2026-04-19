// ============================================================
// Toast — unified provider + hook + single portaled outlet.
// ------------------------------------------------------------
// Replaces the hand-rolled floating toasts in ComponentCardMenu
// ("Link copied") and the inline "Added to {date}" toast in
// TodaysPlanClient. Mount <ToastProvider> once at the app root;
// anywhere in the tree call `const toast = useToast()` and then
// `toast.success('Link copied')` / `toast.error(...)`.
//
// Queue model: one toast visible at a time; subsequent calls
// replace the current message (with a tiny animation reset via
// keyed remount).
// ============================================================

'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastTone = 'success' | 'error' | 'info'

interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Hook — anywhere in the tree ──────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return ctx
}

// ── Provider — mount once at the app root ───────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [mounted, setMounted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(0)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const show = useCallback((message: string, tone: ToastTone = 'info', duration = 2400) => {
    const id = nextId.current++
    setToast({ id, message, tone })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev))
    }, duration)
  }, [])

  const value: ToastContextValue = {
    show,
    success: (msg, duration) => show(msg, 'success', duration),
    error:   (msg, duration) => show(msg, 'error', duration),
    info:    (msg, duration) => show(msg, 'info', duration),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && toast && createPortal(
        <ToastOutlet key={toast.id} message={toast.message} tone={toast.tone} />,
        document.body
      )}
    </ToastContext.Provider>
  )
}

// ── Outlet — editorial floating card, matches the app's voice ──────────────

function ToastOutlet({ message, tone }: { message: string; tone: ToastTone }) {
  const iconColor =
    tone === 'success' ? 'text-accent-green' :
    tone === 'error'   ? 'text-red-400'      :
                         'text-text-primary'

  const borderColor =
    tone === 'success' ? 'border-accent-green/30' :
    tone === 'error'   ? 'border-red-500/30'      :
                         'border-bg-border'

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] animate-slide-up pointer-events-none">
      <div
        className={[
          'flex items-center gap-2.5 bg-bg-card shadow-card rounded-xl px-4 py-2.5 border',
          borderColor,
        ].join(' ')}
      >
        <svg className={['w-4 h-4 flex-shrink-0', iconColor].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {tone === 'error' ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          )}
        </svg>
        <span className="text-sm text-text-primary">{message}</span>
      </div>
    </div>
  )
}

// ── Legacy default-export Toast (kept for back-compat with log-component pages
//    that import it inline). Wraps the single-toast pattern without the
//    provider — for anywhere ToastProvider isn't mounted yet. Prefer useToast().
export default function ToastLegacy({
  message,
  type,
  onDismiss,
  duration = 2400,
}: {
  message: string
  type: ToastTone | 'success' | 'error'
  onDismiss: () => void
  duration?: number
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  if (!mounted || typeof window === 'undefined') return null

  return createPortal(
    <ToastOutlet message={message} tone={type as ToastTone} />,
    document.body
  )
}
