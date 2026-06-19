// @design-locked-ish — the reorder tray from the Capture.html export (swipe-up sheet, photo
// tiles, a "Cover" tag on the front photo, ✕ per tile, "+" to add, Done top-right, drag to
// reorder). Reuses the BottomSheet shell + @dnd-kit/sortable for the drag (instead of the
// export's hand-rolled press-hold gesture). The export's photo-whole 2-col masonry is
// approximated with a 2-col grid of tiles; refine to true masonry later.
// polish-audit: flag only a11y / tap-targets / state / gesture / bugs.
'use client'

import BottomSheet from '@/app/components/ui/BottomSheet'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ReorderTrayProps {
  visible: boolean
  previewUrls: string[]
  onClose: () => void
  onReorderIndices: (order: number[]) => void
  onRemove: (index: number) => void
  onAdd: () => void
}

function Tile({ url, index, isCover, onRemove }: { url: string; index: number; isCover: boolean; onRemove: (i: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        aspectRatio: '4 / 5',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#16203a',
        boxShadow: isDragging ? '0 14px 30px rgba(0,0,0,0.55)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 5 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
    >
      <img src={url} alt={`Photo ${index + 1}`} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
      {isCover && (
        <span style={{ position: 'absolute', left: 8, bottom: 8, padding: '3px 9px', borderRadius: 999, background: 'rgba(8,12,26,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontSize: 11, fontWeight: 700, letterSpacing: '0.3px', color: '#fff' }}>
          Cover
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove photo ${index + 1}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(index)}
        style={{ position: 'absolute', top: 0, right: 0, padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
      >
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </span>
      </button>
    </div>
  )
}

export default function ReorderTray({ visible, previewUrls, onClose, onReorderIndices, onRemove, onAdd }: ReorderTrayProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = previewUrls.indexOf(active.id as string)
    const to = previewUrls.indexOf(over.id as string)
    if (from < 0 || to < 0) return
    const order = arrayMove(
      previewUrls.map((_, i) => i),
      from,
      to,
    )
    onReorderIndices(order)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="78vh" disableSwipeDismiss>
      <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-russo), sans-serif', fontSize: 15, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Reorder</span>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-nunito), sans-serif', fontSize: 15, fontWeight: 800, color: '#f97316' }}>
          Done
        </button>
      </div>

      <div style={{ padding: '4px 18px 24px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={previewUrls} strategy={rectSortingStrategy}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {previewUrls.map((url, i) => (
                <Tile key={url} url={url} index={i} isCover={i === 0} onRemove={onRemove} />
              ))}

              <button
                type="button"
                aria-label="Add a photo"
                onClick={onAdd}
                style={{ aspectRatio: '4 / 5', borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </BottomSheet>
  )
}
