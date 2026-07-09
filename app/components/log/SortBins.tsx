// @design-locked — built from design-export/capture/frames/8j-sort-into-stations.html (the pixel
// truth). Every color/size/radius/padding here is copied from that frame: the title block, the 64px
// r12 source tiles, the two "Station N" bins (min-height 296, r16, bg rgb(20,28,50), border
// rgb(42,52,80), 2-col 64px grid), and the orange "Next: describe each" CTA.
//
// INTERACTION MODEL (the frame authors a drag from a source row into labelled bins; a snapshot shows
// one tile mid-drag). Chosen model, documented for River:
//   • SOURCE PALETTE is persistent — every photo stays in the top row (it is not consumed on assign).
//     This is what makes MULTI-MEMBERSHIP possible with no invented chrome: the SAME source tile can be
//     dragged into BOTH bins (a wide photo that spans two stations). Assigned tiles dim to 0.4 so the
//     coach sees what is still un-sorted; a dimmed tile is still draggable (drag it again → 2nd bin).
//   • Drag a source tile onto a bin → adds membership (idempotent). Each in-bin tile has a ✕ that
//     removes it from THAT bin only (not from the palette / the other bin).
//   • BIN COUNT is fixed at 2 — the frame authors exactly two side-by-side bins and no add-station
//     control (the 2-col 64px grid does not fit a third of the row's width). ⚠ FLAG for River: a 3+
//     station sort needs an authored layout (a vertical bin stack or a horizontal bin scroll); the
//     downstream stepper is already N-generic, so only this screen changes when that lands.
//   • EMPTY BINS / unassigned photos: the CTA ("Next: describe each") is enabled ONLY when every photo
//     is in ≥1 bin AND both bins are non-empty (a real 2-way split). So no empty station is ever
//     started and no photo is silently dropped. Documented.
//
// FREEZE LAW: the panel/bins are SOLID navy; only the dnd DragOverlay tile transforms (rotate/scale)
// — no backdrop-filter is animated anywhere. A11y: source tiles + bins are labelled and announce their
// contents; dnd-kit's KeyboardSensor gives a keyboard drag path (best-effort drop onto a bin). 44px
// targets on the ✕ and CTA. Reduced motion = the overlay simply appears (no spring).
// polish-audit: flag a11y / tap-targets / state / bugs — not the design values.
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Photo } from './Capture'

const INTER = 'var(--font-inter), sans-serif'

interface Bin {
  label: string
  photoIds: string[]
}

export interface SortBinsProps {
  /** The full set of captured photos (the source palette). */
  photos: Photo[]
  /** Confirm ("Next: describe each") → the per-bin photo-id lists (both non-empty), in bin order. */
  onConfirm: (bins: string[][]) => void
  /** Back ‹ → cancel sorting, return to the normal capture (no run started). */
  onBack: () => void
}

function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// A 64px photo tile face (shared by the source row, the bin grid, and the drag overlay).
function TileImg({ url }: { url: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" draggable={false} style={{ display: 'block', width: 64, height: 64, objectFit: 'cover', pointerEvents: 'none' }} />
  )
}

// ── source palette tile (draggable, persistent, dims when assigned) ────────────────────────────────
function SourceTile({ photo, index, total, assigned }: { photo: Photo; index: number; total: number; assigned: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: photo.id })
  return (
    <div
      ref={setNodeRef}
      aria-label={`Photo ${index + 1} of ${total}${assigned ? ', assigned — drag again to add to the other station' : ', unassigned — drag into a station'}`}
      {...attributes}
      {...listeners}
      style={{
        flex: '0 0 auto',
        width: 64,
        height: 64,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'rgba(255,255,255,0.1) 0px 0px 0px 1px inset',
        cursor: 'grab',
        touchAction: 'manipulation',
        // keep the UA focus-visible ring — this div is a keyboard-draggable (dnd-kit tabIndex/role),
        // so a keyboard user must see which tile is selected before Space picks it up (WCAG 2.4.7).
        // the original tile fades while its overlay is lifted; assigned tiles rest dimmer.
        opacity: isDragging ? 0.3 : assigned ? 0.4 : 1,
      }}
    >
      <TileImg url={photo.url} />
    </div>
  )
}

// ── one photo inside a bin (with a ✕ to unassign from THIS bin) ─────────────────────────────────────
function BinPhoto({ photo, binLabel, onRemove }: { photo: Photo; binLabel: string; onRemove: () => void }) {
  return (
    <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 12, overflow: 'hidden', boxShadow: 'rgba(255,255,255,0.1) 0px 0px 0px 1px inset' }}>
      <TileImg url={photo.url} />
      <button
        type="button"
        aria-label={`Remove this photo from ${binLabel}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{ position: 'absolute', top: 2, right: 2, width: 44, height: 44, margin: -13, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(4,7,16,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseGlyph />
        </span>
      </button>
    </div>
  )
}

export default function SortBins({ photos, onConfirm, onBack }: SortBinsProps) {
  const [bins, setBins] = useState<Bin[]>([
    { label: 'Station 1', photoIds: [] },
    { label: 'Station 2', photoIds: [] },
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [announce, setAnnounce] = useState('')

  // Move focus into the new screen + announce arrival (mirrors Celebrate's mount pattern) so a coach
  // arriving from the PhotoSheet ⊟ row lands here, not on the now-hidden capture chrome behind it.
  useEffect(() => {
    rootRef.current?.focus()
    const id = window.setTimeout(() => setAnnounce('Sort your photos into stations. Drag each photo into a station.'), 60)
    return () => window.clearTimeout(id)
  }, [])

  const photosById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos])

  // Custom dnd announcements — speak the STATION label, not the raw droppable id (bin-0/bin-1).
  const binLabelFor = (overId: string | null | undefined) => {
    const i = overId ? Number(String(overId).replace('bin-', '')) : NaN
    return Number.isNaN(i) ? null : bins[i]?.label ?? null
  }
  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: () => 'Picked up photo. Move it over a station.',
      onDragOver: ({ over }) => {
        const label = binLabelFor(over?.id != null ? String(over.id) : null)
        return label ? `Over ${label}.` : 'Not over a station.'
      },
      onDragEnd: ({ over }) => {
        const label = binLabelFor(over?.id != null ? String(over.id) : null)
        return label ? `Added photo to ${label}.` : 'Photo not added.'
      },
      onDragCancel: () => 'Cancelled — photo not added.',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bins],
  )

  // MouseSensor + TouchSensor(long-press) + KeyboardSensor — the same no-cross-input-race pattern the
  // PhotoSheet learned (a PointerSensor would hijack a scroll-intent touch before the long-press).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const assignedIds = useMemo(() => new Set(bins.flatMap((b) => b.photoIds)), [bins])
  const allAssigned = photos.length > 0 && photos.every((p) => assignedIds.has(p.id))
  const bothNonEmpty = bins.every((b) => b.photoIds.length > 0)
  const canConfirm = allAssigned && bothNonEmpty

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const binIndex = Number(String(over.id).replace('bin-', ''))
    if (Number.isNaN(binIndex)) return
    const id = String(active.id)
    setBins((prev) => prev.map((b, i) => (i === binIndex && !b.photoIds.includes(id) ? { ...b, photoIds: [...b.photoIds, id] } : b)))
  }
  const removeFromBin = useCallback((binIndex: number, id: string) => {
    setBins((prev) => prev.map((b, i) => (i === binIndex ? { ...b, photoIds: b.photoIds.filter((x) => x !== id) } : b)))
  }, [])

  const activePhoto = activeId ? photosById.get(activeId) : null

  return (
    <div ref={rootRef} tabIndex={-1} role="group" aria-label="Sort photos into stations" style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgb(8,12,26)', overflow: 'hidden', outline: 'none', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* polite arrival announcement */}
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {announce}
      </div>

      {/* back ‹ — UNAUTHORED (8j has no header); needed to cancel out of sorting. Flagged for River. */}
      <div style={{ position: 'absolute', top: 46, left: 0, right: 0, height: 40, display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 2 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back — cancel sorting"
          style={{ minHeight: 44, padding: '14px 18px', margin: '-14px -18px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <BackChevron />
        </button>
      </div>

      {/* title block (tpl518) */}
      <div style={{ position: 'absolute', top: 110, left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 27, letterSpacing: '-0.8px', lineHeight: 1.15, color: 'rgb(255,255,255)' }}>Sort into stations</span>
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)' }}>Drag each photo into its station.</span>
      </div>

      <DndContext sensors={sensors} accessibility={{ announcements }} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        {/* source palette (tpl526) — horizontal; scrolls if photos overflow the row (frame is a 5-tile
            snapshot). */}
        <div
          role="group"
          aria-label="Photos to sort — drag each into a station"
          style={{ position: 'absolute', top: 206, left: 16, right: 16, display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
        >
          {photos.map((p, i) => (
            <SourceTile key={p.id} photo={p} index={i} total={photos.length} assigned={assignedIds.has(p.id)} />
          ))}
        </div>

        {/* bins (tpl537) */}
        <div style={{ position: 'absolute', top: 314, left: 16, right: 16, display: 'flex', gap: 12 }}>
          {bins.map((bin, i) => (
            <DroppableBin key={i} index={i} bin={bin} photosById={photosById} onRemove={removeFromBin} />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePhoto ? (
            <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', transform: 'scale(1.14) rotate(-6deg)', boxShadow: 'rgba(0,0,0,0.55) 0px 16px 30px, rgba(255,255,255,0.2) 0px 0px 0px 1px inset' }}>
              <TileImg url={activePhoto.url} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* CTA (tpl554) — orange; enabled only on a complete 2-way split */}
      <button
        type="button"
        onClick={() => { if (canConfirm) onConfirm(bins.map((b) => b.photoIds)) }}
        aria-disabled={!canConfirm}
        aria-label={canConfirm ? 'Next: describe each station' : 'Sort every photo into a station to continue'}
        className="transition-transform active:scale-[0.98]"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          borderRadius: 26,
          border: 'none',
          background: 'rgb(255,90,31)',
          cursor: canConfirm ? 'pointer' : 'default',
          opacity: canConfirm ? 1 : 0.4,
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 14.5,
          color: 'rgb(255,255,255)',
        }}
      >
        Next: describe each
      </button>
    </div>
  )
}

// Bin column extracted so it can call useDroppable (a hook). Highlights its border to the accent while
// a tile hovers (UNAUTHORED feedback — subtle, documented). The bin announces its contents count.
function DroppableBin({ index, bin, photosById, onRemove }: { index: number; bin: Bin; photosById: Map<string, Photo>; onRemove: (binIndex: number, id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `bin-${index}` })
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={`${bin.label} — ${bin.photoIds.length} ${bin.photoIds.length === 1 ? 'photo' : 'photos'}`}
      style={{
        flex: '1 1 0%',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 296,
        padding: 16,
        borderRadius: 16,
        background: 'rgb(20,28,50)',
        border: `1px solid ${isOver ? 'rgb(255,90,31)' : 'rgb(42,52,80)'}`,
      }}
    >
      <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgb(159,176,200)' }}>{bin.label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 64px)', gap: 10 }}>
        {bin.photoIds.map((id) => {
          const p = photosById.get(id)
          return p ? <BinPhoto key={id} photo={p} binLabel={bin.label} onRemove={() => onRemove(index, id)} /> : null
        })}
      </div>
    </div>
  )
}
