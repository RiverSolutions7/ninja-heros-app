'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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
import { fetchPlanForDate, upsertPlanForDate, fetchDatesWithPlans } from '@/app/lib/planQueries'
import ComponentPickerModal from './ComponentPickerModal'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import { WeekStrip } from './WeekStrip'
import { PlanItemSheet } from './PlanItemSheet'

const TYPE_META: Record<ComponentType, { label: string; border: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', border: 'border-l-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', border: 'border-l-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', placeholderBg: 'bg-accent-green/20' },
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ── Sortable plan item ── */
function SortablePlanItem({
  item,
  onRemove,
  onPhotoTap,
  onRowTap,
}: {
  item: PlanItem
  onRemove: (localId: string) => void
  onPhotoTap: (photos: string[]) => void
  onRowTap: (item: PlanItem) => void
}) {
  const meta = TYPE_META[item.component.type]
  const photos = (item.component.photos ?? []).filter(Boolean)
  const firstPhoto = photos[0] ?? null
  const extraCount = photos.length - 1
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
        'flex items-center gap-3 px-4 py-3.5 border-b border-bg-border/50 last:border-b-0 border-l-4',
        meta.border,
      ].join(' ')}
    >
      {/* Drag handle */}
      <span
        className="text-text-dim/40 text-base leading-none select-none flex-shrink-0 cursor-grab active:cursor-grabbing p-1"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>

      {/* Thumbnail — tappable if photo exists */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => photos.length > 0 && onPhotoTap(photos)}
          className={[
            'w-14 h-14 rounded-xl overflow-hidden block',
            firstPhoto ? 'cursor-pointer active:opacity-80 transition-opacity' : 'cursor-default',
          ].join(' ')}
          tabIndex={firstPhoto ? 0 : -1}
          aria-label={firstPhoto ? `View photos of ${item.component.title}` : undefined}
        >
          {firstPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={firstPhoto} alt={item.component.title} className="w-full h-full object-cover" />
          ) : (
            <div className={['w-full h-full', meta.placeholderBg].join(' ')} />
          )}
        </button>
        {extraCount > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
            +{extraCount}
          </span>
        )}
      </div>

      {/* Content — tappable to open sheet */}
      <button
        type="button"
        onClick={() => onRowTap(item)}
        className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="font-heading text-[15px] text-text-primary leading-snug truncate">
              {item.component.title}
            </p>
            {item.coachNote ? (
              <p className="text-[11px] text-accent-fire/70 mt-0.5 truncate">
                {item.coachNote.split('\n')[0]}
              </p>
            ) : subMeta ? (
              <p className="text-xs text-text-dim mt-0.5 truncate">{subMeta}</p>
            ) : null}
          </div>
          {/* Duration badge — shown only if set */}
          {item.durationMinutes ? (
            <span className="text-[11px] text-text-dim font-heading flex-shrink-0">
              {item.durationMinutes}m
            </span>
          ) : null}
          {/* Mic affordance icon */}
          <svg
            className={['w-3.5 h-3.5 flex-shrink-0', item.coachNote ? 'text-accent-fire' : 'text-text-dim/25'].join(' ')}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v6a2 2 0 004 0V5a2 2 0 00-2-2zM8 11a4 4 0 008 0h2a6 6 0 01-5 5.91V19h3v2H8v-2h3v-2.09A6 6 0 016 11h2z" />
          </svg>
        </div>
      </button>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(item.localId)}
        className="text-text-dim/30 hover:text-text-muted transition-colors flex-shrink-0 p-1 -mr-1"
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
  const todayIso = new Date().toLocaleDateString('en-CA')
  const [selectedDate, setSelectedDate] = useState<string>(todayIso)
  const [datesWithPlans, setDatesWithPlans] = useState<Set<string>>(new Set())
  const [planId, setPlanId] = useState<string | null>(null)
  const [items, setItems] = useState<PlanItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ photos: string[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState<PlanItem | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [saveButtonState, setSaveButtonState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [classLength, setClassLength] = useState<number | null>(null)
  const [showLengthPicker, setShowLengthPicker] = useState(false)

  // Load class length from localStorage after mount
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem('ninja-class-length') || '', 10)
      if (stored > 0) setClassLength(stored)
    } catch { /* ignore */ }
  }, [])

  // Persist class length to localStorage
  useEffect(() => {
    try {
      if (classLength) localStorage.setItem('ninja-class-length', String(classLength))
      else localStorage.removeItem('ninja-class-length')
    } catch { /* ignore */ }
  }, [classLength])

  const totalMinutes = items.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)

  // @dnd-kit sensors
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Debounce save ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef(items)
  useEffect(() => { itemsRef.current = items }, [items])
  const selectedDateRef = useRef(selectedDate)
  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])

  // Load plan for selected date
  useEffect(() => {
    setMounted(true)
    setSaveStatus('idle')
    setLoading(true)
    setItems([])
    setPlanId(null)

    const from = offsetDate(selectedDate, -14)
    const to = offsetDate(selectedDate, 14)

    Promise.all([
      fetchPlanForDate(selectedDate),
      fetchDatesWithPlans(from, to),
    ])
      .then(([plan, dates]) => {
        if (plan) {
          setPlanId(plan.id)
          setItems(plan.items ?? [])
        }
        setDatesWithPlans(new Set(dates))
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save to Supabase
  const debouncedSave = useCallback((currentItems: PlanItem[], date: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const plan = await upsertPlanForDate(date, currentItems)
        setPlanId(plan.id)
        const from = offsetDate(date, -14)
        const to = offsetDate(date, 14)
        const dates = await fetchDatesWithPlans(from, to)
        setDatesWithPlans(new Set(dates))
        setSaveStatus('saved')
        // No fade-out — stays visible until next save cycle
      } catch (err) {
        setSaveStatus('idle')
        console.error('Failed to save plan:', err)
      }
    }, 500)
  }, [])

  // Save whenever items change (after mount + initial load)
  // Skip when items is empty with no existing plan — nothing to write
  useEffect(() => {
    if (!mounted || loading) return
    if (items.length === 0 && !planId) return
    debouncedSave(items, selectedDate)
  }, [items, mounted, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(component: ComponentRow) {
    setItems((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        component,
        durationMinutes: component.duration_minutes ?? null,
        coachNote: null,
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

  function handleNoteChange(localId: string, note: string) {
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, coachNote: note || null } : i))
    )
  }

  function handleClearPlan() {
    setItems([])
    setPlanId(null)
    setSaveStatus('idle')
    setSaveButtonState('idle')
  }

  async function handleExplicitSave() {
    if (items.length === 0) return
    // Cancel any pending auto-save — we're saving right now
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveButtonState('saving')
    setSaveStatus('saving')
    try {
      const plan = await upsertPlanForDate(selectedDate, items)
      setPlanId(plan.id)
      const from = offsetDate(selectedDate, -14)
      const to = offsetDate(selectedDate, 14)
      const dates = await fetchDatesWithPlans(from, to)
      setDatesWithPlans(new Set(dates))
      setSaveButtonState('saved')
      setSaveStatus('saved')
      setTimeout(() => setSaveButtonState('idle'), 2500)
    } catch (err) {
      console.error('Failed to save plan:', err)
      setSaveButtonState('idle')
      setSaveStatus('idle')
    }
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
        await navigator.share({ title: "Today's Plan", text, url })
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
    const dateLabel = selectedDate === todayIso ? "Today's Plan" : formatDisplayDate(selectedDate)
    const lines = [dateLabel]
    items.forEach((item, idx) => {
      const dur = item.durationMinutes ? ` — ${item.durationMinutes} min` : ''
      lines.push(`${idx + 1}. ${item.component.title}${dur}`)
    })
    return lines.join('\n')
  }

  const headerTitle = selectedDate === todayIso ? "Today's Plan" : formatDisplayDate(selectedDate)
  const isOverBudget = !!(classLength && totalMinutes > classLength)

  if (!mounted) return null

  return (
    <div className="min-h-screen pb-24">
      {/* Page header */}
      <div className="relative flex items-center justify-between px-4 pt-4 pb-3">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">{headerTitle}</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
          {saveStatus !== 'idle' && (
            <p className={['text-[11px] mt-1', saveStatus === 'saved' ? 'text-accent-green' : 'text-text-dim'].join(' ')}>
              {saveStatus === 'saving' ? 'Saving…' : `✓ Saved · ${formatDisplayDate(selectedDate)}`}
            </p>
          )}
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

      {/* Week strip calendar */}
      <WeekStrip
        selectedDate={selectedDate}
        todayIso={todayIso}
        datesWithPlans={datesWithPlans}
        onSelectDate={setSelectedDate}
      />

      {/* Optional time budget row — only visible when at least one duration is set OR class length is configured */}
      {(totalMinutes > 0 || classLength) && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-text-dim flex-shrink-0"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={['text-xs font-heading', isOverBudget ? 'text-accent-fire' : 'text-text-muted'].join(' ')}>
              {classLength ? `${totalMinutes} / ${classLength} min` : `${totalMinutes} min`}
            </span>
            {classLength && (
              <div className="flex-1 h-1 bg-bg-border rounded-full overflow-hidden">
                <div
                  className={['h-full rounded-full transition-all', isOverBudget ? 'bg-accent-fire' : 'bg-accent-green'].join(' ')}
                  style={{ width: `${Math.min(100, (totalMinutes / classLength) * 100)}%` }}
                />
              </div>
            )}
            {classLength ? (
              <button
                type="button"
                onClick={() => { setClassLength(null); setShowLengthPicker(false) }}
                className="text-text-dim/40 hover:text-text-dim transition-colors flex-shrink-0"
                aria-label="Clear class length"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLengthPicker((v) => !v)}
                className="text-[11px] text-text-dim/50 hover:text-text-dim transition-colors flex-shrink-0 underline underline-offset-2"
              >
                Set length
              </button>
            )}
          </div>
          {/* Inline length picker chips */}
          {showLengthPicker && (
            <div className="flex gap-2 mt-2">
              {[30, 45, 60, 90].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => { setClassLength(min); setShowLengthPicker(false) }}
                  className="px-3 py-1.5 rounded-lg border border-bg-border text-xs font-heading text-text-muted hover:border-accent-fire/40 hover:text-accent-fire active:scale-95 transition-all"
                >
                  {min} min
                </button>
              ))}
            </div>
          )}
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
          <p className="text-text-dim text-sm mt-2">
            {selectedDate === todayIso
              ? 'Tap + Add to Plan to start building your day'
              : `No plan saved for ${formatDisplayDate(selectedDate)}`}
          </p>
          {selectedDate === todayIso && (
            <>
              <Link href="/library" className="text-text-dim text-xs mt-3 inline-block underline underline-offset-2 hover:text-text-muted transition-colors">
                Add components from the Library tab first
              </Link>
              <p className="text-text-dim/50 text-xs mt-3">
                Swipe the dates above to view plans saved for other days
              </p>
            </>
          )}
        </div>
      )}

      {/* Plan items — @dnd-kit sortable */}
      {!loading && items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.localId)} strategy={verticalListSortingStrategy}>
            <ul className="mx-4">
              {items.map((item) => (
                <SortablePlanItem
                  key={item.localId}
                  item={item}
                  onRemove={handleRemove}
                  onPhotoTap={(photos) => setLightbox({ photos })}
                  onRowTap={(i) => setActiveSheet(i)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Save to Calendar — explicit save action */}
      {!loading && items.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={handleExplicitSave}
            disabled={saveButtonState === 'saving'}
            className={[
              'w-full font-heading text-base py-4 rounded-xl transition-all min-h-[56px] flex items-center justify-center gap-2',
              saveButtonState === 'saved'
                ? 'bg-accent-green/20 border border-accent-green/40 text-accent-green'
                : saveButtonState === 'saving'
                ? 'bg-accent-fire/60 text-white cursor-not-allowed'
                : 'bg-accent-fire text-white shadow-glow-fire active:scale-[0.98]',
            ].join(' ')}
          >
            {saveButtonState === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : saveButtonState === 'saved' ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved to {selectedDate === todayIso ? 'Today' : formatDisplayDate(selectedDate)}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Save to {selectedDate === todayIso ? 'Today' : formatDisplayDate(selectedDate)}
              </>
            )}
          </button>
        </div>
      )}

      {/* Clear plan */}
      {!loading && items.length > 0 && (
        <div className="px-4 pb-3 flex justify-center gap-4">
          <button
            type="button"
            onClick={handleClearPlan}
            className="text-sm text-text-dim/50 hover:text-text-dim transition-colors"
          >
            Clear plan
          </button>
          {planId && (
            <button
              type="button"
              onClick={handleShare}
              className="text-sm text-text-dim/50 hover:text-text-dim transition-colors"
            >
              Share link
            </button>
          )}
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

      {/* Photo lightbox */}
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Plan item detail / coach note sheet */}
      {activeSheet && (
        <PlanItemSheet
          item={activeSheet}
          planDate={selectedDate}
          onSaveNote={(localId, note) => {
            handleNoteChange(localId, note)
            setActiveSheet((prev) => prev ? { ...prev, coachNote: note || null } : null)
          }}
          onDurationChange={(localId, value) => {
            handleDurationChange(localId, value)
            const num = value === '' ? null : parseInt(value, 10)
            setActiveSheet((prev) => prev ? { ...prev, durationMinutes: isNaN(num as number) ? null : num } : null)
          }}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </div>
  )
}
