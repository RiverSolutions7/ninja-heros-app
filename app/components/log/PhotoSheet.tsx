// @design-locked — built from design-export/capture/frames/8i-photo-manage-sheet.html (the pixel
// truth). Every color/size/radius/opacity/padding here is copied from that frame: the solid navy
// panel over a plain scrim, the r14 photo tiles, the frosted "Cover" tag on the first tile, the
// per-tile ✕, the "+" add tile, and the "⊟ Sort into separate stations" row (2+ photos only).
//
// The sheet opens from ONE TAP on the Capture stack-chip (no intermediate menu). Drag reorders the
// tiles; the FIRST tile is always the cover and the "Cover" tag FOLLOWS the reorder (index 0 of the
// flow-state photos[]). Reorder commits LIVE to flow state (the parent's photos[]), so the Capture
// hero + dots update immediately — Done just closes. ✕ removes a photo (the parent revokes its object
// URL). "+" reuses the existing add path (onAddPhotos → the same URL.createObjectURL pipeline).
//
// ARRIVAL/EXIT MOTION: reuses the TypeAgeSheet D2 pattern for cross-sheet consistency (panel slides
// translateY(100%→0) on a sampled damped spring ζ=0.72 ωn=9, 460ms; scrim fades 240ms; exit slide-down
// 260ms; reduced-motion = opacity crossfade only).
//
// FROSTED/FREEZE LAW: the frame authors the PANEL solid (rgb(20,28,50), no backdrop-filter) so the
// slide animates transform/opacity ONLY — nothing frosted moves. The ONE frosted element is the
// "Cover" tag (static blur(20px), per the frame). Because a tile is transformed while it is dragged,
// a moving backdrop-filter would risk the iOS raster-compositor stall (the project's freeze rule), so
// while its OWN tile isDragging the Cover tag drops to a SOLID fallback (no backdrop-filter) — the
// frost is only ever painted on a STATIC element. dnd's per-tile transform is the only motion in the
// tile grid; no backdrop-filter is ever keyframed.
//
// MASONRY: the frame shows a 2-column whole-photo masonry with varying tile heights. Implemented with
// CSS `columns:2` (true gapless column-fill, no grid row-alignment gaps) + tiles sized by each photo's
// natural aspect (clamped) so photos show WHOLE (object-fit cover on a box that matches the aspect =
// no crop). Reorder correctness rides on onDragEnd's flat-array arrayMove (rectSortingStrategy), not
// the mid-drag preview, so the CSS-columns layout can't corrupt the committed order. DIVERGENCE from
// the frame: the tiles area scrolls (overflow-y:auto) when photos exceed the 548px panel — the frame's
// overflow:hidden is a 3-photo snapshot; N photos need a scroll region.
//
// EMPTY STATE (intentional): the sheet opens from the 2+/3+ stack-chip or the whisper, but a coach can
// ✕ every tile while it's open. At 0 photos the tiles region collapses to just the "+" add tile — that
// standalone tile IS the "add your first photo" affordance; no separate empty copy is authored (the
// frame has none) and the sheet does not auto-close (surprising). The ⊟ row correctly hides below 2.
// polish-audit: flag a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Photo } from './Capture'

const INTER = 'var(--font-inter), sans-serif'

// Whole-photo band clamp for the tiles (tall 3:4 ↔ wide 3:2). A box at the photo's own aspect makes
// object-fit:cover a no-op crop, so clamped photos read whole; only extreme aspects get trimmed.
const AR_MIN = 0.72
const AR_MAX = 1.5
const clampAspect = (a: number) => (a > 0 ? Math.min(AR_MAX, Math.max(AR_MIN, a)) : 1)

// ── D2 spring-settle arrival (same rig as TypeAgeSheet, kept in-lockstep for sheet consistency) ────
const D2 = { inMs: 460, samples: 30, zeta: 0.72, wn: 9, scrimInMs: 240, outMs: 260, scrimOutMs: 220 }
function springSettle(t: number): number {
  if (t >= 1) return 1
  const { zeta, wn } = D2
  const wd = wn * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + ((zeta * wn) / wd) * Math.sin(wd * t))
}
function slideKeyframes(): Keyframe[] {
  const kf: Keyframe[] = []
  for (let i = 0; i <= D2.samples; i++) {
    const p = springSettle(i / D2.samples)
    kf.push({ transform: `translateY(${(1 - p) * 100}%)` })
  }
  return kf
}
function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export interface PhotoSheetProps {
  open: boolean
  /** Live flow-state photos (index 0 = cover). Reorder/remove/add mutate this via the callbacks. */
  photos: Photo[]
  /** Any close path (Done · scrim tap · Esc · swipe-down) — the sheet only closes; reorder/remove are live. */
  onClose: () => void
  /** New flat order of photo ids after a drag. Parent maps → photos[] (index 0 = cover). */
  onReorder: (orderedIds: string[]) => void
  /** Remove a photo by id (parent revokes its object URL). */
  onRemove: (id: string) => void
  /** "+" add tile → reuse the existing add path (same URL.createObjectURL pipeline as Capture). */
  onAddPhotos: (files: File[]) => void
  /** "⊟ Sort into separate stations" → the multi-station sort-bins flow. CHUNK 8 fills this; wired
   *  but INERT here (a no-op stub) with this comment so the row is present + accessible today. */
  onSortIntoStations?: () => void
}

function CloseGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlusGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 3.5v15M3.5 11h15" stroke="#9fb0c8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RowChevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
      <path d="M1 1l4.5 5L1 11" stroke="#5b6b86" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── one draggable/removable tile (tpl488/494/500 + Cover tag tpl490 + ✕ tpl491) ───────────────────
function Tile({
  photo,
  index,
  total,
  isCover,
  aspect,
  onRemove,
  onAspect,
}: {
  photo: Photo
  index: number
  total: number
  isCover: boolean
  aspect: number
  onRemove: (id: string) => void
  onAspect: (id: string, ar: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  // dnd's translate + (while lifted) the frame's dragged pose: rotate(2.5deg) scale(1.045).
  const base = CSS.Transform.toString(transform)
  const dragged = isDragging ? `${base ?? ''} rotate(2.5deg) scale(1.045)` : base

  return (
    <div
      ref={setNodeRef}
      // dnd-kit's {...attributes} supplies role="button" + keyboard-drag ARIA; the aria-label adds the
      // photo's position + cover status so VoiceOver announces "Photo 1 of 3, cover, button".
      aria-label={`Photo ${index + 1} of ${total}${isCover ? ', cover' : ''}`}
      style={{
        position: 'relative',
        // whole-photo box: aspect matches the source so object-fit:cover doesn't crop.
        aspectRatio: String(aspect),
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 10, // CSS-columns gutter (columns use margin, not gap)
        breakInside: 'avoid',
        transform: dragged,
        transition,
        // the dragged tile lifts: frame shadow rgba(0,0,0,0.6) 0 18px 34px + z 2 (tpl500)
        boxShadow: isDragging ? 'rgba(0,0,0,0.6) 0px 18px 34px' : 'none',
        zIndex: isDragging ? 2 : 1,
        cursor: 'grab',
        // no touchAction:'none' — the TouchSensor delay distinguishes long-press drag from a scroll,
        // so the tiles area can still scroll natively when photos overflow the panel.
        outline: 'none',
      }}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth && img.naturalHeight) onAspect(photo.id, img.naturalWidth / img.naturalHeight)
        }}
        style={{ display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
      />

      {isCover && (
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            display: 'flex',
            alignItems: 'center',
            height: 22,
            padding: '0px 9px',
            borderRadius: 11,
            // FREEZE LAW / build-token DIVERGENCE: the frame authors this tag frosted (backdrop-filter
            // blur(20px)). But the tag rides TWO motions — the sheet's arrival/exit slide (the whole
            // panel subtree transforms) AND its own tile's drag — and a moving backdrop-filter stalls
            // the iOS/Chromium raster compositor (the project's parked freeze; confirmed here: the slide
            // WAAPI froze at t=0 until this went solid). Per the tokens ("solid for anything that
            // animates"), it is a SOLID navy pill. Verified visual delta is negligible over the photo.
            background: 'rgba(12,19,34,0.92)',
            boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset',
            fontFamily: INTER,
            fontWeight: 600,
            fontSize: 10.5,
            color: 'rgb(231,238,250)',
            pointerEvents: 'none',
          }}
        >
          Cover
        </div>
      )}

      {/* ✕ — visible glyph is the frame's 22px disc; an invisible ≥44px hit-slop wraps it. The
          stopPropagation on pointer-down keeps a ✕ tap from starting a drag. */}
      <button
        type="button"
        aria-label={`Remove photo ${index + 1}`}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          // Keyboard/VO focus handoff: this tile unmounts on remove, so re-anchor focus to the "+"
          // add tile (always present) rather than letting it fall to <body> past the Tab trap.
          const dialog = (e.currentTarget as HTMLElement).closest('[role="dialog"]')
          onRemove(photo.id)
          requestAnimationFrame(() => dialog?.querySelector<HTMLElement>('[aria-label="Add photos"]')?.focus())
        }}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 44,
          height: 44,
          margin: -11, // center the 22px disc under the 44px hit area at the frame's 8px inset
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(4,7,16,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseGlyph />
        </span>
      </button>
    </div>
  )
}

// ── grab handle (tpl482) — 38×5 bar, ≥44px swipe-down hit area via hit-slop ────────────────────────
function GrabHandle({
  onDown,
  onMove,
  onUp,
}: {
  onDown: (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void
  onUp: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 44,
        // hit-slop: keep the visible bar's center where the frame places it (bar center pinned; the
        // 20px gap to the header below preserved) while giving a 44px-tall swipe target.
        marginTop: -10,
        marginBottom: 10,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <div style={{ width: 38, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
    </div>
  )
}

export default function PhotoSheet({ open, photos, onClose, onReorder, onRemove, onAddPhotos, onSortIntoStations }: PhotoSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [aspects, setAspects] = useState<Record<string, number>>({})
  const [dragging, setDragging] = useState(false)

  const scrimRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const swipeStart = useRef<number | null>(null)
  const dragDy = useRef(0)
  const restoreFocus = useRef<HTMLElement | null>(null)

  // MouseSensor (not PointerSensor) so mouse input stays SEPARATE from touch: touch also fires pointer
  // events, so a PointerSensor's 8px distance would win the race before the TouchSensor's 200ms
  // long-press, hijacking a scroll-intent touch into a drag. MouseSensor listens to mouse events only,
  // TouchSensor owns touch (long-press), KeyboardSensor owns keyboard reorder — no cross-input race.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setAspect = useCallback((id: string, ar: number) => {
    setAspects((prev) => (prev[id] === ar ? prev : { ...prev, [id]: clampAspect(ar) }))
  }, [])

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  // On open: remember the trigger for focus restore.
  useEffect(() => {
    if (!open) return
    restoreFocus.current = (document.activeElement as HTMLElement) ?? null
  }, [open])

  // ── entrance / exit motion (WAAPI, transform + opacity only — no backdrop-filter touched) ────────
  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const scrim = scrimRef.current
    const reduced = prefersReduced()
    panel?.getAnimations().forEach((a) => a.cancel())
    scrim?.getAnimations().forEach((a) => a.cancel())

    if (open) {
      if (scrim) scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 200 : D2.scrimInMs, easing: 'ease-out', fill: 'both' })
      if (panel) {
        panel.style.transform = 'translateY(0%)'
        if (reduced) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'both' })
        else panel.animate(slideKeyframes(), { duration: D2.inMs, easing: 'linear', fill: 'both' })
      }
      dragDy.current = 0
      dialogRef.current?.focus()
      return
    }

    // exit — a natural finish unmounts + restores focus; a reopen mid-flight cancels via cleanup.
    let cancelled = false
    const finish = () => {
      if (cancelled) return
      restoreFocus.current?.focus?.()
      setMounted(false)
    }
    if (scrim) scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 160 : D2.scrimOutMs, easing: 'ease-in', fill: 'both' })
    if (panel) {
      const startTransform = dragDy.current > 0 ? `translateY(${dragDy.current}px)` : 'translateY(0%)'
      const a = reduced
        ? panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'both' })
        : panel.animate([{ transform: startTransform }, { transform: 'translateY(100%)' }], { duration: D2.outMs, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'both' })
      a.onfinish = finish
    } else {
      finish()
    }
    dragDy.current = 0
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted])

  // Keyboard: Esc closes. Tab is trapped inside the dialog.
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key === 'Tab') {
        const root = dialogRef.current
        if (!root) return
        const f = Array.from(
          root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
        if (f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mounted, open, onClose])

  // ── swipe-down dismiss on the grab handle ─────────────────────────────────────────────────────
  const onHandleDown = (e: React.PointerEvent) => {
    swipeStart.current = e.clientY
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = e.clientY - swipeStart.current
    const panel = panelRef.current
    if (!panel) return
    if (dy > 0) {
      panel.getAnimations().forEach((a) => a.cancel())
      panel.style.transform = `translateY(${dy}px)`
      dragDy.current = dy
    }
  }
  const onHandleUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = e.clientY - swipeStart.current
    swipeStart.current = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    const panel = panelRef.current
    if (dy > 80) { onClose(); return }
    dragDy.current = 0
    if (panel) {
      const from = Math.max(0, dy)
      panel.style.transform = 'translateY(0%)'
      panel.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0%)' }], { duration: 200, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' })
    }
  }

  // ── drag reorder ────────────────────────────────────────────────────────────────────────────────
  const onDragStart = (_e: DragStartEvent) => setDragging(true)
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(false)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = photos.map((p) => p.id)
    const from = ids.indexOf(active.id as string)
    const to = ids.indexOf(over.id as string)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  const pickFiles = () => fileRef.current?.click()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onAddPhotos(files)
    e.target.value = ''
  }

  if (!mounted) return null

  const ids = photos.map((p) => p.id)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      {/* scrim (tpl480) — plain rgba, tap to close */}
      <div ref={scrimRef} onClick={onClose} aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(4,7,16,0.62)' }} />

      {/* panel (tpl481) — SOLID (no backdrop-filter); only transform/opacity animate */}
      <div
        ref={(el) => { panelRef.current = el; dialogRef.current = el }}
        role="dialog"
        aria-modal="true"
        aria-label="Manage photos"
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 548,
          borderRadius: '20px 20px 0px 0px',
          background: 'rgb(20,28,50)',
          boxShadow: 'rgba(0,0,0,0.5) 0px -18px 44px',
          display: 'flex',
          flexDirection: 'column',
          padding: '10px 24px 40px',
          outline: 'none',
          transform: 'translateY(100%)',
        }}
      >
        <GrabHandle onDown={onHandleDown} onMove={onHandleMove} onUp={onHandleUp} />

        {/* header row (tpl483) — "Photos" + "Done" */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 19, letterSpacing: '-0.4px', color: 'rgb(255,255,255)' }}>Photos</span>
          <button
            type="button"
            onClick={onClose}
            style={{ minHeight: 44, padding: '0 4px', margin: '0 -4px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 15, color: 'rgb(255,255,255)' }}
          >
            Done
          </button>
        </div>

        {/* tiles (tpl486) — 2-col whole-photo masonry via CSS columns; scrolls if photos overflow */}
        <div
          role="group"
          aria-label="Photos — drag to reorder, first is the cover"
          style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', columns: 2, columnGap: 10 }}
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(false)}>
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              {photos.map((p, i) => (
                <Tile
                  key={p.id}
                  photo={p}
                  index={i}
                  total={photos.length}
                  isCover={i === 0}
                  aspect={aspects[p.id] ?? 1}
                  onRemove={onRemove}
                  onAspect={setAspect}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* "+" add tile (tpl505) — reuses the existing add path. Not sortable. */}
          <button
            type="button"
            onClick={pickFiles}
            aria-label="Add photos"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              // a whole-photo tile averages ~1:1; the add tile shares that footprint so it sits in a column.
              aspectRatio: '1 / 1',
              marginBottom: 10,
              breakInside: 'avoid',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%), rgb(20,28,50)',
              boxShadow: 'rgb(42,52,80) 0px 0px 0px 1px inset',
              cursor: 'pointer',
              // hidden while a tile is dragging so it can't become a stray drop target visually.
              opacity: dragging ? 0.5 : 1,
            }}
          >
            <PlusGlyph />
          </button>
        </div>

        {/* ⊟ row (tpl508) — 2+ photos only. INERT stub → chunk 8's sort-bins flow. */}
        {photos.length >= 2 && (
          <button
            type="button"
            onClick={() => onSortIntoStations?.()}
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              minHeight: 44,
              marginTop: 18,
              padding: '18px 0 0',
              border: 'none',
              borderTop: '1px solid rgb(27,37,64)',
              background: 'transparent',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 13.5, color: 'rgb(205,216,234)' }}>⊟ Sort into separate stations</span>
            <RowChevron />
          </button>
        )}
      </div>
    </div>
  )
}
