// ============================================================
// useIsMobile — matchMedia wrapper for responsive surface choice.
// ------------------------------------------------------------
// Used by surfaces that render differently on mobile vs desktop
// (ComponentCardMenu: bottom sheet on mobile, popover on desktop).
//
// SSR-safe: always returns false during SSR/initial mount so
// hydration matches the server, then flips on the first client
// effect tick. A brief single-frame "desktop layout on mobile"
// flash is acceptable for non-critical responsive choices.
// ============================================================

'use client'

import { useEffect, useState } from 'react'

const MOBILE_MAX_WIDTH = 640 // Tailwind's `sm` breakpoint

export default function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    // Safari <14 uses addListener; modern uses addEventListener
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
    }
  }, [])

  return isMobile
}
