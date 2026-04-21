'use client'

import { useEffect } from 'react'

/**
 * Guards against accidental navigation when a form has unsaved changes.
 *
 * - Intercepts ALL <a href> clicks (covers tab bar Links, back Links, any anchor)
 *   using a document-level capture listener that fires before Next.js routing.
 * - Adds a beforeunload listener for browser back / swipe-to-go-back / refresh.
 *
 * When either fires and isDirty is true, calls onBlock(destination) with the
 * target href. The caller is responsible for showing a ConfirmSheet and then
 * navigating to the destination if the coach confirms.
 *
 * Usage:
 *   const [guardDest, setGuardDest] = useState<string | null>(null)
 *   useUnsavedGuard(isDirty, setGuardDest)
 *   // render <ConfirmSheet visible={guardDest !== null} onConfirm={() => router.push(guardDest!)} ... />
 */
export function useUnsavedGuard(
  isDirty: boolean,
  onBlock: (destination: string) => void
) {
  // Native browser dialog for back/forward/refresh/swipe-back
  useEffect(() => {
    if (!isDirty) return
    const handle = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handle)
    return () => window.removeEventListener('beforeunload', handle)
  }, [isDirty])

  // Capture-phase click listener — intercepts <a> before Next.js Link navigates
  useEffect(() => {
    if (!isDirty) return
    const handle = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const dest = anchor.getAttribute('href') ?? ''
      // Ignore fragment-only, same-page, or external links
      if (!dest || dest.startsWith('#') || dest === window.location.pathname) return
      if (dest.startsWith('http') && !dest.startsWith(window.location.origin)) return
      e.preventDefault()
      e.stopPropagation()
      onBlock(dest)
    }
    document.addEventListener('click', handle, true)
    return () => document.removeEventListener('click', handle, true)
  }, [isDirty, onBlock])
}
