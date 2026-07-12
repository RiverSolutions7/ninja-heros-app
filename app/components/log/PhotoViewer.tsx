// UNAUTHORED surface — chunk 10 gate-B item ③ (River-approved package, 2026-07-09): tap the Capture
// hero photo → this full-screen viewer. NO export frame authors it, so every value here is chosen in
// the flow's token language and FLAGGED for River's eyeball:
//   · backdrop = near-black rgb(4,7,16) (the flow's scrim base, full opacity) — photo whole
//     (object-fit contain) on black.
//   · chrome = minimal: a 44px ✕ top-LEFT (30px disc face, the PhotoSheet ✕ language, scaled up;
//     moved from top-right per River's chunk-12 ✎ note — iOS-Photos convention, off the clock cluster),
//     the D2 pill-progress dots bottom-center (active 14×5 white pill / inactive 5px, EXACTLY the
//     hero's dot language), and a quiet "Make cover" text-chip above the dots (Inter 600 12.5px,
//     rgba(255,255,255,0.12) fill, r17, white text; hidden when the photo already IS the cover).
//   · gestures: swipe left/right between angles (index synced up to the Capture hero dots via
//     onIndexChange) · pinch zoom (clamp 1–4×) + pan while zoomed · double-tap toggles 1 ↔ 2.5×
//     at the tap point · swipe-DOWN (at 1×) or ✕ closes. Escape/arrow keys mirror the gestures.
//   · motion: open/close = 200ms crossfade (reduced motion identical — crossfade is already the
//     reduced language); swipe settle 260ms ease-out; all transform/opacity only, NOTHING here
//     frosts (no backdrop-filter — freeze-rule safe by construction).
// While recording, Capture never opens this (the photo is not a 44px control during a take).
// polish-audit: flag a11y / tap-targets / state / motion-perf / bugs — not the (flagged) values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Photo } from './Capture'

const INTER = 'var(--font-inter), sans-serif'

export interface PhotoViewerProps {
  photos: Photo[]
  /** Current photo index — shared with the Capture hero (dots stay in sync while browsing here). */
  index: number
  onIndexChange: (i: number) => void
  /** "Make cover" → the parent moves this photo to index 0 (tray/hero/dots follow). */
  onMakeCover: (id: string) => void
  onClose: () => void
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2l10 10M12 2 2 12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// Gesture bookkeeping (refs — the hot path writes styles directly, no re-render per move).
interface GestureState {
  pointers: Map<number, { x: number; y: number }>
  mode: 'none' | 'swipe' | 'dismiss' | 'pan' | 'pinch'
  startX: number
  startY: number
  dx: number
  dy: number
  // pinch baseline
  dist0: number
  mid0: { x: number; y: number }
  base: { s: number; tx: number; ty: number }
  moved: boolean
  lastTap: { t: number; x: number; y: number } | null
}

const ZOOM_MAX = 4
const DTAP_ZOOM = 2.5
const SWIPE_COMMIT = 48
const DISMISS_COMMIT = 90

export default function PhotoViewer({ photos, index, onIndexChange, onMakeCover, onClose }: PhotoViewerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null) // translateY target for swipe-down dismiss
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const zoom = useRef({ s: 1, tx: 0, ty: 0 })
  const g = useRef<GestureState>({
    pointers: new Map(),
    mode: 'none',
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    dist0: 0,
    mid0: { x: 0, y: 0 },
    base: { s: 1, tx: 0, ty: 0 },
    moved: false,
    lastTap: null,
  })
  const closingRef = useRef(false)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const indexRef = useRef(index)
  indexRef.current = index

  const n = photos.length
  const clampIndex = useCallback((i: number) => Math.max(0, Math.min(n - 1, i)), [n])

  // ── style writers (transform/opacity only) ──────────────────────────────────────────────────────
  const setStrip = useCallback((dxPx: number, animate: boolean) => {
    const el = stripRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 260ms cubic-bezier(0.22,0.61,0.36,1)' : 'none'
    el.style.transform = `translateX(calc(${-indexRef.current * 100}% + ${dxPx}px))`
  }, [])

  const applyZoom = useCallback((animate: boolean) => {
    const el = slideRefs.current[indexRef.current]
    if (!el) return
    const { s, tx, ty } = zoom.current
    el.style.transition = animate ? 'transform 200ms cubic-bezier(0.22,0.61,0.36,1)' : 'none'
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`
  }, [])

  const resetZoom = useCallback((animate: boolean) => {
    zoom.current = { s: 1, tx: 0, ty: 0 }
    applyZoom(animate)
  }, [applyZoom])

  const clampPan = useCallback(() => {
    const root = rootRef.current
    if (!root) return
    const { s } = zoom.current
    const maxX = ((s - 1) * root.clientWidth) / 2
    const maxY = ((s - 1) * root.clientHeight) / 2
    zoom.current.tx = Math.max(-maxX, Math.min(maxX, zoom.current.tx))
    zoom.current.ty = Math.max(-maxY, Math.min(maxY, zoom.current.ty))
  }, [])

  // Keep the strip parked on the current index (and clear any stale zoom) whenever index changes.
  useLayoutEffect(() => {
    resetZoom(false)
    setStrip(0, false)
  }, [index, resetZoom, setStrip])

  // ── open/close crossfade (WAAPI; reduced motion = the same crossfade) ───────────────────────────
  useLayoutEffect(() => {
    restoreFocus.current = (document.activeElement as HTMLElement) ?? null
    const el = rootRef.current
    el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'both' })
    el?.focus()
    return () => { restoreFocus.current?.focus?.() }
  }, [])

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    const el = rootRef.current
    if (!el) { onClose(); return }
    const dur = prefersReduced() ? 160 : 200
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'both' })
    // onfinish + a timer belt: if the animation timeline is throttled (backgrounded tab / a stalled
    // compositor) the unmount must still land. onClose is parent setState — safe to call once either way.
    let done = false
    const finish = () => { if (!done) { done = true; onClose() } }
    a.onfinish = finish
    window.setTimeout(finish, dur + 120)
  }, [onClose])

  // ── keyboard (Esc closes · arrows browse · Tab trapped inside the dialog) ──────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onIndexChange(clampIndex(indexRef.current - 1)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onIndexChange(clampIndex(indexRef.current + 1)) }
      else if (e.key === 'Tab') {
        // Focus trap (mirrors PhotoSheet's): the viewer is modal — Tab cycles ✕ / Make cover only.
        const root = rootRef.current
        if (!root) return
        const f = Array.from(root.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])'))
          .filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0)
        if (f.length === 0) { e.preventDefault(); return }
        const first = f[0]
        const last = f[f.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [close, onIndexChange, clampIndex])

  // ── gestures ────────────────────────────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    const s = g.current
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
    if (s.pointers.size === 2) {
      // pinch start
      const [a, b] = Array.from(s.pointers.values())
      s.mode = 'pinch'
      s.dist0 = Math.hypot(b.x - a.x, b.y - a.y) || 1
      s.mid0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      s.base = { s: zoom.current.s, tx: zoom.current.tx, ty: zoom.current.ty }
    } else if (s.pointers.size === 1) {
      s.mode = 'none'
      s.startX = e.clientX
      s.startY = e.clientY
      s.dx = 0
      s.dy = 0
      s.moved = false
      s.base = { s: zoom.current.s, tx: zoom.current.tx, ty: zoom.current.ty }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current
    if (!s.pointers.has(e.pointerId)) return
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const root = rootRef.current
    if (!root) return

    if (s.mode === 'pinch' && s.pointers.size >= 2) {
      const [a, b] = Array.from(s.pointers.values())
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const cx = root.clientWidth / 2
      const cy = root.clientHeight / 2
      const s1 = Math.max(1, Math.min(ZOOM_MAX, (s.base.s * dist) / s.dist0))
      // keep the pinch midpoint fixed: t1 = t0 + m0·(s0 − s1), then pan by the midpoint's travel.
      const m0x = s.mid0.x - cx
      const m0y = s.mid0.y - cy
      zoom.current.s = s1
      zoom.current.tx = s.base.tx + (m0x - s.base.tx) * (1 - s1 / s.base.s) + (mid.x - s.mid0.x)
      zoom.current.ty = s.base.ty + (m0y - s.base.ty) * (1 - s1 / s.base.s) + (mid.y - s.mid0.y)
      clampPan()
      applyZoom(false)
      s.moved = true
      return
    }

    if (s.pointers.size !== 1) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    s.dx = dx
    s.dy = dy
    if (!s.moved && Math.hypot(dx, dy) > 8) s.moved = true
    if (!s.moved) return

    if (zoom.current.s > 1.02) {
      // zoomed → pan
      s.mode = 'pan'
      zoom.current.tx = s.base.tx + dx
      zoom.current.ty = s.base.ty + dy
      clampPan()
      applyZoom(false)
      return
    }

    if (s.mode === 'none') {
      // Direction lock needs a clear 1.5× axis bias (gesture hygiene): a mis-locked 'swipe' is
      // harmless, but a mis-locked 'dismiss' CLOSES the viewer — an ambiguous diagonal stays
      // unlocked until the intent is unambiguous.
      if (Math.abs(dx) > Math.abs(dy) * 1.5) s.mode = 'swipe'
      else if (dy > 0 && dy > Math.abs(dx) * 1.5) s.mode = 'dismiss'
    }
    if (s.mode === 'swipe') {
      // rubber-band at the ends
      const atEdge = (indexRef.current === 0 && dx > 0) || (indexRef.current === n - 1 && dx < 0)
      setStrip(atEdge ? dx * 0.35 : dx, false)
    } else if (s.mode === 'dismiss') {
      const stage = stageRef.current
      const dyc = Math.max(0, dy)
      if (stage) {
        stage.style.transition = 'none'
        stage.style.transform = `translateY(${dyc}px)`
      }
      if (rootRef.current) rootRef.current.style.opacity = String(Math.max(0.4, 1 - dyc / 500))
    }
  }

  const settle = (e: React.PointerEvent) => {
    const s = g.current
    if (!s.pointers.has(e.pointerId)) return
    s.pointers.delete(e.pointerId)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }

    if (s.mode === 'pinch') {
      if (s.pointers.size < 2) {
        s.mode = 'none'
        if (zoom.current.s <= 1.02) resetZoom(true)
      }
      return
    }
    if (s.pointers.size > 0) return

    if (s.mode === 'swipe') {
      const dx = s.dx
      s.mode = 'none'
      if (dx < -SWIPE_COMMIT && indexRef.current < n - 1) onIndexChange(indexRef.current + 1)
      else if (dx > SWIPE_COMMIT && indexRef.current > 0) onIndexChange(indexRef.current - 1)
      setStrip(0, true) // (index effect re-parks without animation when it actually changes)
      return
    }
    if (s.mode === 'dismiss') {
      s.mode = 'none'
      if (s.dy > DISMISS_COMMIT) { close(); return }
      const stage = stageRef.current
      if (stage) {
        stage.style.transition = 'transform 200ms cubic-bezier(0.22,0.61,0.36,1)'
        stage.style.transform = 'translateY(0px)'
      }
      if (rootRef.current) rootRef.current.style.opacity = '1'
      return
    }
    if (s.mode === 'pan') { s.mode = 'none'; return }

    // No movement → a tap. Double-tap toggles zoom at the tap point; single tap does nothing (the
    // chrome is minimal + always visible — no tap-to-hide layer to manage).
    if (!s.moved) {
      const now = performance.now()
      const last = s.lastTap
      if (last && now - last.t < 300 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24) {
        s.lastTap = null
        const root = rootRef.current
        if (root) {
          if (zoom.current.s > 1.02) resetZoom(true)
          else {
            const cx = root.clientWidth / 2
            const cy = root.clientHeight / 2
            const m0x = e.clientX - cx
            const m0y = e.clientY - cy
            zoom.current.s = DTAP_ZOOM
            zoom.current.tx = m0x * (1 - DTAP_ZOOM)
            zoom.current.ty = m0y * (1 - DTAP_ZOOM)
            clampPan()
            applyZoom(true)
          }
        }
      } else {
        s.lastTap = { t: now, x: e.clientX, y: e.clientY }
      }
    }
  }

  const current = photos[clampIndex(index)]
  const isCover = clampIndex(index) === 0

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo viewer — photo ${clampIndex(index) + 1} of ${n}`}
      tabIndex={-1}
      data-viewer-layer=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgb(4,7,16)',
        overflow: 'hidden',
        outline: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      {/* stage — translateY target for the swipe-down dismiss */}
      <div ref={stageRef} style={{ position: 'absolute', inset: 0 }}>
        {/* photo strip — transform-only swipe between angles */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={settle}
          onPointerCancel={settle}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <div
            ref={stripRef}
            style={{ display: 'flex', width: '100%', height: '100%', transform: `translateX(${-clampIndex(index) * 100}%)` }}
          >
            {photos.map((p, i) => (
              <div
                key={p.id}
                ref={(el) => { slideRefs.current[i] = el }}
                aria-hidden={i !== clampIndex(index)}
                style={{ flex: '0 0 100%', height: '100%', position: 'relative', willChange: 'transform' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Course photo ${i + 1} of ${n}`}
                  draggable={false}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* live announce for VoiceOver while swiping */}
        <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          {`Photo ${clampIndex(index) + 1} of ${n}${isCover ? ', cover' : ''}`}
        </div>

        {/* ✕ — 44px target, 30px disc face (the PhotoSheet ✕ language, scaled for full-screen) */}
        <button
          type="button"
          aria-label="Close photo viewer"
          onClick={close}
          style={{
            position: 'absolute',
            // CHUNK 12 ⑥ (River ✎ note, 2026-07-12: "I don't think the X should be there — kind of
            // looks like a bug"): moved TOP-LEFT (the iOS-Photos close convention), away from the
            // clock/battery cluster the top-right spot visually collided with. Safe-area aware (chunk 11
            // ③'s notch fix carried over): never above 46px, never inside the notch. UNAUTHORED values —
            // flagged for River's eyeball. 44px target preserved; visible disc bumped 28→30px so the
            // control reads deliberate in its new corner.
            top: 'max(46px, calc(env(safe-area-inset-top, 0px) + 12px))',
            left: 'max(16px, calc(env(safe-area-inset-left, 0px) + 12px))',
            width: 44,
            height: 44,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <span style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloseGlyph />
          </span>
        </button>

        {/* bottom chrome — quiet "Make cover" + the D2 dots (the hero's exact dot language). CHUNK 11 ③:
            lift off the home indicator via safe-area-inset-bottom (same notched-device fix as the ✕). */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'max(42px, calc(env(safe-area-inset-bottom, 0px) + 24px))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 2, pointerEvents: 'none' }}>
          {!isCover && current && (
            <button
              type="button"
              onClick={() => onMakeCover(current.id)}
              aria-label="Make this photo the cover"
              className="transition-transform active:scale-[0.96]"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '0 4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 17, background: 'rgba(255,255,255,0.12)', fontFamily: INTER, fontWeight: 600, fontSize: 12.5, color: 'rgb(255,255,255)' }}>
                Make cover
              </span>
            </button>
          )}
          {n > 1 && (
            <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
              {photos.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    width: i === clampIndex(index) ? 14 : 5,
                    height: 5,
                    borderRadius: 3,
                    background: i === clampIndex(index) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
