'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ComponentRow, ComponentType, PlanItem } from '@/app/lib/database.types'
import { createPlan, fetchLatestPlan, updatePlanItems } from '@/app/lib/planQueries'
import ComponentPickerModal from './ComponentPickerModal'

const PREFILL_KEY = 'ninja-heros-plan-prefill'
const HOURS_48 = 48 * 60 * 60 * 1000

const TYPE_META: Record<ComponentType, { label: string; border: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', border: 'border-l-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', border: 'border-l-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', placeholderBg: 'bg-accent-green/20' },
}

/* ── Sortable plan item ── */
function SortablePlanItem({
  item,
  onRemove,
  onDurationChange,
}: {
  item: PlanItem
  onRemove: (localId: string) => void
  onDurationChange: (localId: string, value: string) => void
}) {
  const meta = TYPE_META[item.component.type]
  const firstPhoto = item.component.photos?.[0] ?? null
  const subMeta = [meta.label, item.component.curriculum].filter(Boolean).join(' · ')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center gap-3 px-3 py-3 border-b border-bg-border/50 last:border-b-0 border-l-4',
        meta.border,
      ].join(' ')}
    >
      {/* Drag handle */}
      <span
        className="text-text-dim/60 text-base leading-none select-none flex-shrink-0 cursor-grab active:cursor-grabbing p-1"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
        {firstPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstPhoto} alt={item.component.title} className="w-full h-full object-cover" />
        ) : (
          <div className={['w-full h-full', meta.placeholderBg].join(' ')} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-[15px] text-text-primary leading-snug truncate">
          {item.component.title}
        </p>
        {subMeta && (
          <p className="text-xs text-text-dim mt-0.5 truncate">{subMeta}</p>
        )}
      </div>

      {/* Duration input */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="number"
          min={1}
          max={120}
          value={item.durationMinutes ?? ''}
          onChange={(e) => onDurationChange(item.localId, e.target.value)}
          placeholder="—"
          className="w-14 bg-transparent text-text-muted text-sm text-right focus:outline-none focus:text-text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-text-dim text-xs">m</span>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(item.localId)}
        className="text-text-dim/40 hover:text-text-muted transition-colors flex-shrink-0 p-1 -mr-1"
        aria-label="Remove"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

/* ── Main component ── */
export default function TodaysPlanClient() {
  const router = useRouter()
  const [planId, setPlanId] = useState<string | null>(null)
  const [items, setItems] = useState<PlanItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // @dnd-kit sensors (same pattern as BlockBuilder)
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Debounce save ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])

  // Load latest plan from Supabase on mount
  useEffect(() => {
    setMounted(true)
    fetchLatestPlan()
      .then((plan) => {
        if (plan) {
          const age = Date.now() - new Date(plan.updated_at).getTime()
          if (age < HOURS_48) {
            setPlanId(plan.id)
            setItems(plan.items ?? [])
          }
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [])

  // Debounced save to Supabase
  const debouncedSave = useCallback((currentItems: PlanItem[], currentPlanId: string | null) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        if (currentPlanId) {
          await updatePlanItems(currentPlanId, currentItems)
        } else if (currentItems.length > 0) {
          const plan = await createPlan(currentItems)
          setPlanId(plan.id)
        }
      } catch (err) {
        console.error('Failed to save plan:', err)
      }
    }, 500)
  }, [])

  // Save whenever items change (after mount + initial load)
  useEffect(() => {
    if (!mounted || loading) return
    debouncedSave(items, planId)
  }, [items, mounted, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(component: ComponentRow) {
    setItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        component,
        durationMinutes: component.duration_minutes ?? null,
      },
    ])
  }

  function handleRemove(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId))
  }

  function handleDurationChange(localId: string, value: string) {
    const num = value === '' ? null : parseInt(value, 10)
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, durationMinutes: isNaN(num as number) ? null : num } : i))
    )
  }

  function handleClearPlan() {
    setItems([])
    setPlanId(null)
  }

  // @dnd-kit reorder
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const fromIndex = prev.findIndex((i) => i.localId === active.id)
      const toIndex = prev.findIndex((i) => i.localId === over.id)
      if (fromIndex === -1 || toIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  async function handleShare() {
    if (!planId) return
    const url = `${window.location.origin}/plan/${planId}`
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Today\'s Plan', text, url })
        return
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch { /* ignore */ }
  }

  function buildShareText() {
    const lines = ['Today\'s Plan']
    items.forEach((item, idx) => {
      const dur = item.durationMinutes ? ` — ${item.durationMinutes} min` : ''
      lines.push(`${idx + 1}. ${item.component.title}${dur}`)
    })
    return lines.join('\n')
  }

  function handleSaveToLibrary() {
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify(items))
    } catch { /* ignore */ }
    router.push('/library/new')
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen pb-24">
      {/* Page header */}
      <div className="relative flex items-center justify-between px-4 pt-4 pb-3">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">Today&apos;s Plan</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 border border-bg-border text-text-muted font-heading text-sm px-3 py-2 rounded-xl active:scale-95 transition-all hover:bg-white/5 min-h-[40px]"
            >
              {copyFeedback ? (
                <>
                  <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Send to Coaches — prominent share button */}
      {items.length > 0 && planId && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={handleShare}
            className="w-full inline-flex items-center justify-center gap-2 border border-accent-fire/40 text-accent-fire font-heading text-sm px-4 py-3 rounded-xl active:scale-95 transition-all hover:bg-accent-fire/5 min-h-[48px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Send to Coaches
          </button>
        </div>
      )}

      {/* Action buttons row */}
      <div className="px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[52px]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add to Plan
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="inline-flex items-center gap-1.5 border border-bg-border text-text-muted font-heading text-sm px-4 py-3.5 rounded-xl active:scale-95 transition-all hover:bg-white/5 min-h-[52px]"
          >
            Save
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="text-center py-16 px-4">
          <p className="font-heading text-text-muted text-lg">No plan yet</p>
          <p className="text-text-dim text-sm mt-2">Tap + Add to Plan to start building your day</p>
          <Link href="/library" className="text-text-dim text-xs mt-3 inline-block underline underline-offset-2 hover:text-text-muted transition-colors">
            Add components from the Library tab first
          </Link>
        </div>
      )}

      {/* Plan items — @dnd-kit sortable */}
      {!loading && items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.localId)} strategy={verticalListSortingStrategy}>
            <ul className="mx-4 bg-bg-card rounded-2xl overflow-hidden border border-bg-border">
              {items.map((item) => (
                <SortablePlanItem
                  key={item.localId}
                  item={item}
                  onRemove={handleRemove}
                  onDurationChange={handleDurationChange}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Clear plan */}
      {!loading && items.length > 0 && (
        <div className="px-4 pt-3 flex justify-center">
          <button
            type="button"
            onClick={handleClearPlan}
            className="text-sm text-text-dim/50 hover:text-text-dim transition-colors"
          >
            Clear plan
          </button>
        </div>
      )}

      {/* Component picker modal */}
      {showPicker && (
        <ComponentPickerModal
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
          existingIds={new Set(items.map((i) => i.component.id))}
        />
      )}
    </div>
  )
}
