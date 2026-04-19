// ============================================================
// ConfirmSheet — shared bottom-sheet confirmation dialog.
// ------------------------------------------------------------
// Replaces native window.confirm across the app. Visually
// matches the existing plan-delete sheet (centered title +
// body prose + destructive button + cancel), but factored out
// so every yes/no in the product feels identical.
//
// Auto-manages an in-flight "loading" state while onConfirm is
// awaiting, so the caller doesn't have to track it separately.
// Backdrop, Esc, and swipe-down are all disabled during that
// loading window to prevent double-commits.
// ============================================================

'use client'

import { useState } from 'react'
import BottomSheet from './BottomSheet'

interface ConfirmSheetProps {
  visible: boolean
  title: string
  /** Supporting copy under the title — prose, no chrome. Optional. */
  body?: React.ReactNode
  /** Primary action label when idle. */
  confirmLabel: string
  /** Primary action label while onConfirm is running. Default "Working…". */
  workingLabel?: string
  /** Secondary action label. Default "Cancel". */
  cancelLabel?: string
  /** Destructive style (red). Non-destructive uses the app's fire primary. */
  destructive?: boolean
  /**
   * Fired when the coach taps the primary button. May be async — the sheet
   * locks into a loading state until the promise settles. Parent is
   * responsible for closing the sheet on success (via onClose).
   */
  onConfirm: () => void | Promise<void>
  /** Fired on any dismiss (backdrop, Esc, swipe-down, Cancel button). */
  onClose: () => void
}

export default function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  workingLabel = 'Working…',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (loading) return
    try {
      setLoading(true)
      await onConfirm()
    } catch {
      // Parent handles error surfacing (toast, inline, etc.). We just release
      // the loading lock so the coach can retry or cancel.
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose} disableSwipeDismiss={loading}>
      <div className="px-6 pt-1 pb-10 flex flex-col gap-4">
        <p className="font-heading text-lg text-text-primary text-center">{title}</p>
        {body && (
          <p className="text-sm text-text-dim text-center leading-relaxed">{body}</p>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className={[
            'w-full py-3.5 rounded-xl font-heading text-base active:scale-[0.98] transition-all disabled:opacity-70 min-h-[52px] inline-flex items-center justify-center gap-2',
            destructive
              ? 'bg-red-500 text-white'
              : 'bg-accent-fire text-white shadow-glow-fire',
          ].join(' ')}
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? workingLabel : confirmLabel}
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="w-full py-3.5 rounded-xl border border-bg-border font-heading text-sm text-text-muted hover:bg-white/5 active:scale-[0.98] transition-all min-h-[48px] disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
