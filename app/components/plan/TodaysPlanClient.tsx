'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import type { ComponentRow, ComponentType, PlanItem, PlanRow } from '@/app/lib/database.types'
import { addPlanToCalendar, updatePlanById, fetchDatesWithPlans, fetchPlansForDate, deletePlanById, movePlanToDate } from '@/app/lib/planQueries'
import { randomId } from '@/app/lib/uuid'
import ComponentPickerModal from './ComponentPickerModal'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import BottomSheet from '@/app/components/ui/BottomSheet'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'
import { useToast } from '@/app/components/ui/Toast'
import { LONG_PRESS_STYLE } from '@/app/hooks/useLongPress'
import { useSwipeReveal, REVEAL_WIDTH_DEFAULT } from '@/app/hooks/useSwipeReveal'
import { PlanItemSheet } from './PlanItemSheet'
import { PlanCalendarSheet } from './PlanCalendarSheet'
import SavedPlanRow from './SavedPlanRow'

// ── Constants ─────────────────────────────────────────────────────────────────

// sessionStorage key: silently persists an in-progress new plan across page
// refreshes within the same tab. Invisible to the coach — pure protection.
const SESSION_KEY = 'ninja-plan-session'

// ── Helpers ───────────────────────────────────────────────────────────────────

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Week strip helpers ────────────────────────────────────────────────────────

function getWeekStart(iso: string): Date {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function formatShortDay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatSavedAt(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatSelectedDayLabel(selectedIso: string, todayIso: string): string {
  const d = new Date(selectedIso + 'T00:00:00')
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (selectedIso === todayIso) return `Today · ${weekday}, ${monthDay}`
  return `${weekday} · ${monthDay}`
}

/** Auto-label a plan from component types when no title is set */
function autoLabel(plan: PlanRow): string {
  if (plan.title) return plan.title
  const its = plan.items ?? []
  const s = its.filter(i => i.component.type === 'station' && !i.isAdHoc).length
  const g = its.filter(i => i.component.type === 'game' && !i.isAdHoc).length
  const c = its.filter(i => i.isAdHoc).length
  const parts = [
    s > 0 && `${s} station${s > 1 ? 's' : ''}`,
    g > 0 && `${g} game${g > 1 ? 's' : ''}`,
    c > 0 && `${c} custom`,
  ].filter(Boolean) as string[]
  return parts.length ? parts.join(' · ') : 'Class Plan'
}

const WEEK_DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// ── Type icons + placeholder ──────────────────────────────────────────────────

const TYPE_META: Record<ComponentType, { label: string; border: string; textColor: string; placeholderBg: string }> = {
  station: { label: 'Station', border: 'border-l-accent-blue', textColor: 'text-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', textColor: 'text-accent-green', placeholderBg: 'bg-accent-green/20' },
}

// Fallback for legacy warmup data embedded in saved plans
const LEGACY_FALLBACK_META = TYPE_META['game']

const CUSTOM_META = { label: 'Custom', border: 'border-l-accent-fire', textColor: 'text-accent-fire', placeholderBg: 'bg-accent-fire/15' }

function resolveMeta(item: { isAdHoc?: boolean; component: { type: string } }) {
  if (item.isAdHoc) return CUSTOM_META
  return TYPE_META[item.component.type as ComponentType] ?? LEGACY_FALLBACK_META
}

const TYPE_ICONS: Record<ComponentType, React.ReactNode> = {
  game: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  station: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
}

const CUSTOM_ICON = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
)

function TypePlaceholder({ type, className }: { type: ComponentType; className?: string }) {
  const meta = TYPE_META[type]
  return (
    <div className={['flex items-center justify-center', meta.placeholderBg, className].join(' ')}>
      <span className={meta.textColor}>{TYPE_ICONS[type]}</span>
    </div>
  )
}

// ── Sortable plan item (card design — matches Library Phase 2A) ─────────────

const PLAN_THUMB = 72

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
  const meta = resolveMeta(item)
  const photos = item.isAdHoc ? [] : (item.component.photos ?? []).filter(Boolean)
  const firstPhoto = photos[0] ?? null
  const extraCount = photos.length - 1

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Swipe-left → reveal red delete button (iOS table-view pattern).
  // shouldSkip lets dnd-kit's drag handle keep its own gesture.
  const swipe = useSwipeReveal({
    onDelete: () => onRemove(item.localId),
    shouldSkip: (target) => !!target.closest('[data-drag-handle]'),
  })

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-xl overflow-hidden group"
    >
      {/* ─── Delete zone (revealed behind the sliding row) ──────────── */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-xl bg-accent-fire"
        style={{ width: REVEAL_WIDTH_DEFAULT }}
      >
        <button
          type="button"
          onClick={() => onRemove(item.localId)}
          aria-label={`Remove ${item.component.title}`}
          className="flex items-center justify-center text-white active:opacity-70 transition-opacity p-4 min-w-[44px] min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* ─── Foreground row (slides left to reveal delete) ───────────── */}
      <div
        {...swipe.handlers}
        style={{ ...LONG_PRESS_STYLE, ...swipe.rowStyle }}
        className={[
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-card',
          'border-l-4',
          meta.border,
        ].join(' ')}
      >
        {/* ─── Thumbnail slot ──────────────────────────────────── */}
        <div className="relative shrink-0 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => !item.isAdHoc && photos.length > 0 && onPhotoTap(photos)}
            style={{ width: PLAN_THUMB, height: PLAN_THUMB }}
            className={firstPhoto ? 'cursor-pointer active:opacity-80 transition-opacity block' : 'cursor-default block'}
            tabIndex={firstPhoto ? 0 : -1}
            aria-label={firstPhoto ? `View photos of ${item.component.title}` : undefined}
          >
            {firstPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstPhoto}
                alt={item.component.title}
                style={{ width: PLAN_THUMB, height: PLAN_THUMB }}
                className="object-cover block"
              />
            ) : (
              <div
                style={{ width: PLAN_THUMB, height: PLAN_THUMB }}
                className={['flex items-center justify-center', meta.textColor, 'opacity-50'].join(' ')}
              >
                {item.isAdHoc ? (
                  <span className="w-7 h-7">{CUSTOM_ICON}</span>
                ) : (
                  <span className="w-7 h-7">{TYPE_ICONS[item.component.type as ComponentType]}</span>
                )}
              </div>
            )}
          </button>
          {extraCount > 0 && (
            <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
              +{extraCount}
            </span>
          )}
        </div>

        {/* ─── Info stack ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => onRowTap(item)}
          className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide">
            <span className={meta.textColor}>{meta.label}</span>
            {!item.isAdHoc && item.component.curriculum && (
              <>
                <span className="text-text-dim/40">·</span>
                <span className="text-text-dim truncate">{item.component.curriculum}</span>
              </>
            )}
            {item.durationMinutes != null && (
              <>
                <span className="text-text-dim/40">·</span>
                <span className="text-text-dim">{item.durationMinutes} min</span>
              </>
            )}
          </div>
          <p className="font-heading text-[15px] text-text-primary leading-tight truncate mt-0.5">
            {item.component.title}
          </p>
          {item.coachNote && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate">
              {item.coachNote.split('\n')[0]}
            </p>
          )}
        </button>

        {/* ─── Right-side controls ─────────────────────────────── */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 -mr-1">
          <span
            data-drag-handle
            className="text-text-dim/30 p-1 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="7" cy="5" r="1.25" />
              <circle cx="13" cy="5" r="1.25" />
              <circle cx="7" cy="10" r="1.25" />
              <circle cx="13" cy="10" r="1.25" />
              <circle cx="7" cy="15" r="1.25" />
              <circle cx="13" cy="15" r="1.25" />
            </svg>
          </span>
          {/* Remove (visible on desktop-hover only; mobile uses swipe-left) */}
          <button
            type="button"
            onClick={() => onRemove(item.localId)}
            className="text-text-dim/20 hover:text-accent-fire transition-all p-1 opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
            aria-label="Remove"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop: hover × button above handles removal.
          Mobile: swipe-left reveals the delete zone above. */}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TodaysPlanClient() {
  const [todayIso] = useState(() => new Date().toLocaleDateString('en-CA'))

  // ── View mode ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'dashboard' | 'editing'>('dashboard')

  // ── Scratchpad ───────────────────────────────────────────────────────────────
  const [items, setItems] = useState<PlanItem[]>([])
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanLabel, setEditingPlanLabel] = useState<string | null>(null)
  const [lastAddedPlanId, setLastAddedPlanId] = useState<string | null>(null)

  // ── Week strip ───────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(todayIso))
  const [selectedDayIso, setSelectedDayIso] = useState<string>(todayIso)
  const [selectedDayPlans, setSelectedDayPlans] = useState<PlanRow[]>([])
  const [selectedDayLoading, setSelectedDayLoading] = useState(false)

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [datesWithPlans, setDatesWithPlans] = useState<Set<string>>(new Set())

  // ── Toast (shared provider at app root) ─────────────────────────────────────
  const toast = useToast()

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ photos: string[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState<PlanItem | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  // Tracks whether `items` contains user-originated edits (vs items that were
  // just loaded from the DB). Gates auto-save so tapping a saved plan doesn't
  // trigger a reflexive "Saving… ✓ Saved" flash on data that wasn't edited.
  const dirtyRef = useRef(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Recently-removed plan item (for undo toast)
  const [removedItem, setRemovedItem] = useState<{ item: PlanItem; index: number } | null>(null)
  const removedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPlanOptions, setShowPlanOptions] = useState(false)
  const [showMoveCalendar, setShowMoveCalendar] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const stationCount = items.filter(i => !i.isAdHoc && i.component.type === 'station').length
  const gameCount = items.filter(i => !i.isAdHoc && i.component.type === 'game').length
  const customCount = items.filter(i => i.isAdHoc).length
  const typeSummary = [
    stationCount > 0 && `${stationCount} station${stationCount > 1 ? 's' : ''}`,
    gameCount > 0 && `${gameCount} game${gameCount > 1 ? 's' : ''}`,
    customCount > 0 && `${customCount} custom`,
  ].filter(Boolean).join(' · ')

  const siblingIndex = editingPlanId
    ? selectedDayPlans.findIndex(p => p.id === editingPlanId)
    : -1
  const hasSiblings = viewMode === 'editing' && selectedDayPlans.length > 1 && siblingIndex !== -1

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    const iso = dateToIso(d)
    return { iso, label: WEEK_DAY_LABELS[i], num: d.getDate() }
  })

  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Mount: session recovery → legacy cleanup → calendar data
  useEffect(() => {
    setMounted(true)

    // Session recovery — restore an in-progress new plan after refresh
    try {
      const session = sessionStorage.getItem(SESSION_KEY)
      if (session) {
        const recovered = JSON.parse(session) as PlanItem[]
        if (recovered.length > 0) {
          setItems(recovered)
          setViewMode('editing')
        }
      }
    } catch { /* ignore */ }

    // Legacy cleanup — remove stale localStorage keys from features we've
    // retired so devices that once had them don't carry the junk forever.
    // Safe to call unconditionally (removeItem is a no-op if the key is absent).
    try {
      localStorage.removeItem('ninja-class-length') // time-budget feature (removed 2026-04)
    } catch { /* ignore */ }

    // Calendar dots
    const from = offsetDate(todayIso, -180)
    const to = offsetDate(todayIso, 180)
    fetchDatesWithPlans(from, to)
      .then(dates => setDatesWithPlans(new Set(dates)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [todayIso])

  // Fetch plans for selected day (drives dashboard Planned section)
  useEffect(() => {
    if (!mounted) return
    if (!datesWithPlans.has(selectedDayIso)) {
      setSelectedDayPlans([])
      return
    }
    setSelectedDayLoading(true)
    setSelectedDayPlans([])
    fetchPlansForDate(selectedDayIso)
      .then(plans => {
        setSelectedDayPlans(plans)
        setSelectedDayLoading(false)
      })
      .catch(() => setSelectedDayLoading(false))
  }, [selectedDayIso, mounted, datesWithPlans])

  // Auto-save to Supabase when editing a calendar plan
  const debouncedSave = useCallback((currentItems: PlanItem[], planId: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updatePlanById(planId, currentItems)
        // Successful commit — these items are now in sync with the DB.
        dirtyRef.current = false
        // Keep the dashboard's cached plan list in sync. Without this, the
        // saved card on the dashboard still holds the pre-edit items, so
        // re-tapping it loads stale data and the coach's changes look like
        // they were lost.
        setSelectedDayPlans(prev =>
          prev.map(p => (p.id === planId ? { ...p, items: currentItems } : p))
        )
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800)
      } catch (err) {
        setSaveStatus('idle')
        console.error('Auto-save failed:', err)
      }
    }, 800)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return
    if (!editingPlanId) return
    if (items.length === 0) return
    // Skip auto-save for items that came from the DB (just-loaded plans) —
    // only write when the coach actually edits. Prevents the "✓ Saved" flash
    // on plan-tap.
    if (!dirtyRef.current) return
    debouncedSave(items, editingPlanId)
  }, [items, mounted, loading, editingPlanId, debouncedSave]) // eslint-disable-line react-hooks/exhaustive-deps

  // Write scratchpad to sessionStorage (when not editing a calendar plan)
  useEffect(() => {
    if (!mounted) return
    if (editingPlanId !== null) return
    try {
      if (items.length > 0) sessionStorage.setItem(SESSION_KEY, JSON.stringify(items))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch { /* ignore */ }
  }, [items, mounted, editingPlanId])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleSelect(component: ComponentRow) {
    dirtyRef.current = true
    setItems(prev => [
      ...prev,
      { localId: randomId(), component, durationMinutes: component.duration_minutes ?? null, coachNote: null },
    ])
  }

  function handleAdHocSelect(title: string, description?: string, durationMinutes?: number) {
    dirtyRef.current = true
    setItems(prev => [
      ...prev,
      {
        localId: randomId(),
        component: {
          id: randomId(),
          type: 'station' as ComponentType,
          title,
          curriculum: null,
          description: description ?? null,
          equipment: null,
          skills: [],
          photos: [],
          video_url: null,
          video_link: null,
          duration_minutes: durationMinutes ?? null,
          folder_id: null,
          in_handoff: false,
          created_at: new Date().toISOString(),
        },
        isAdHoc: true,
        durationMinutes: durationMinutes ?? null,
        coachNote: null,
      },
    ])
  }

  function handleRemove(localId: string) {
    const idx = items.findIndex(i => i.localId === localId)
    if (idx === -1) return
    dirtyRef.current = true
    const snapshot = items[idx]
    setItems(prev => prev.filter(i => i.localId !== localId))
    setRemovedItem({ item: snapshot, index: idx })
    if (removedTimerRef.current) clearTimeout(removedTimerRef.current)
    removedTimerRef.current = setTimeout(() => setRemovedItem(null), 4500)
  }

  function handleUndoRemove() {
    if (!removedItem) return
    dirtyRef.current = true
    const { item, index } = removedItem
    setItems(prev => {
      const next = [...prev]
      next.splice(Math.min(index, next.length), 0, item)
      return next
    })
    setRemovedItem(null)
    if (removedTimerRef.current) clearTimeout(removedTimerRef.current)
  }

  function handleDurationChange(localId: string, value: string) {
    dirtyRef.current = true
    const num = value === '' ? null : parseInt(value, 10)
    setItems(prev =>
      prev.map(i => i.localId === localId ? { ...i, durationMinutes: isNaN(num as number) ? null : num } : i)
    )
  }

  function handleNoteChange(localId: string, note: string) {
    dirtyRef.current = true
    setItems(prev =>
      prev.map(i => i.localId === localId ? { ...i, coachNote: note || null } : i)
    )
  }

  // ── Week strip handlers ───────────────────────────────────────────────────────

  function prevWeek() {
    const s = addDays(weekStart, -7)
    setWeekStart(s)
    setSelectedDayIso(dateToIso(s))
  }

  function nextWeek() {
    const s = addDays(weekStart, 7)
    setWeekStart(s)
    setSelectedDayIso(dateToIso(s))
  }

  function handleDaySelect(iso: string) {
    setSelectedDayIso(iso)
  }

  // ── View mode handlers ────────────────────────────────────────────────────────

  async function handleBackToDashboard() {
    // If a debounced save is still pending for an existing plan, flush it
    // now before navigating away so the coach can trust the back action.
    const planId = editingPlanId
    const snapshot = items
    if (saveTimer.current && planId && snapshot.length > 0) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      try {
        setSaveStatus('saving')
        await updatePlanById(planId, snapshot)
      } catch (err) {
        console.error('Flush-on-back failed:', err)
      } finally {
        setSaveStatus('idle')
      }
    }
    // Even if no flush was needed, keep the dashboard cache in sync — the
    // last committed auto-save already updated selectedDayPlans, but this is
    // a cheap guard against any skew if the in-flight state differs from what
    // was most recently saved.
    if (planId && snapshot.length > 0) {
      setSelectedDayPlans(prev =>
        prev.map(p => (p.id === planId ? { ...p, items: snapshot } : p))
      )
    }
    setViewMode('dashboard')
  }

  // ── Calendar save ─────────────────────────────────────────────────────────────

  async function handleAddToCalendar(date: string, title: string) {
    if (items.length === 0) return
    setSaveStatus('saving')
    try {
      const plan = await addPlanToCalendar(date, items, title || undefined)

      // Refresh calendar dots so the saved date lights up in the week strip
      const from = offsetDate(todayIso, -180)
      const to = offsetDate(todayIso, 180)
      const dates = await fetchDatesWithPlans(from, to)
      setDatesWithPlans(new Set(dates))

      // Clear edit state — the save is a completion, not a transition to
      // "now editing an existing plan." Coach can tap the saved card on the
      // dashboard to re-open if they want to keep working.
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
      setItems([])
      setEditingPlanId(null)
      setEditingPlanLabel(null)
      setLastAddedPlanId(plan.id)
      setSaveStatus('idle')

      // Return to dashboard with the saved date focused so the new plan card
      // appears right there under "Planned." Jump the week strip too if the
      // saved date falls outside the currently-displayed week.
      setSelectedDayIso(date)
      setWeekStart(getWeekStart(date))
      setViewMode('dashboard')

      // Floating confirmation toast (rendered by the app-root ToastProvider)
      toast.success(`Added to ${formatDisplayDate(date)}`, 3500)
    } catch (err) {
      console.error('Add to calendar failed:', err)
      setSaveStatus('idle')
    }
  }

  function handleLoadPlan(plan: PlanRow) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setEditingPlanId(plan.id)
    const titlePart = plan.title ? plan.title : null
    const datePart = plan.plan_date ? formatDisplayDate(plan.plan_date) : null
    setEditingPlanLabel([titlePart, datePart].filter(Boolean).join(' · '))
    setItems(plan.items ?? [])
    // Freshly-loaded from DB — no pending edits to save.
    dirtyRef.current = false
    setSaveStatus('idle')
    setLastAddedPlanId(null)

    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setViewMode('editing')
  }

  // ── Dashboard swipe actions ──────────────────────────────────────────────────
  // Coach swipes left on a saved-plan card → two buttons revealed:
  // [Options] opens the options sheet for that plan, and [Delete] opens the
  // confirm sheet. Both stash the plan ID on editingPlanId so the existing
  // sheet handlers (handleMovePlan / handleDeletePlan / etc.) work untouched.
  // We stay in dashboard view — the sheets overlay on top via portal.
  // optionsFromDashboardRef tracks context so we can clean up editingPlanId
  // on paths that don't naturally clear it (Cancel + Move).
  const optionsFromDashboardRef = useRef(false)

  function handleOptionsFromDashboard(plan: PlanRow) {
    setEditingPlanId(plan.id)
    setEditingPlanLabel(plan.plan_date ? formatDisplayDate(plan.plan_date) : null)
    optionsFromDashboardRef.current = true
    setShowPlanOptions(true)
  }

  // Flat action handlers used by the long-press menu on SavedPlanRow.
  // Each one stashes the plan ID + sets the right downstream sheet so the
  // existing handleMovePlan / handleAddToCalendar / handleDeletePlan
  // handlers keep working untouched.

  function handleMoveFromDashboard(plan: PlanRow) {
    setEditingPlanId(plan.id)
    setEditingPlanLabel(plan.plan_date ? formatDisplayDate(plan.plan_date) : null)
    optionsFromDashboardRef.current = true
    setShowMoveCalendar(true)
  }

  function handleDuplicateFromDashboard(plan: PlanRow) {
    setEditingPlanId(plan.id)
    setEditingPlanLabel(plan.plan_date ? formatDisplayDate(plan.plan_date) : null)
    // Seed items so the duplicate save-to-calendar picks up the plan's content.
    setItems(plan.items ?? [])
    optionsFromDashboardRef.current = true
    setShowDatePicker(true)
  }

  function handleDeleteFromDashboard(plan: PlanRow) {
    setEditingPlanId(plan.id)
    setEditingPlanLabel(plan.plan_date ? formatDisplayDate(plan.plan_date) : null)
    optionsFromDashboardRef.current = true
    setShowDeleteConfirm(true)
  }

  function handleCancelPlanOptions() {
    setShowPlanOptions(false)
    if (optionsFromDashboardRef.current) {
      setEditingPlanId(null)
      setEditingPlanLabel(null)
      optionsFromDashboardRef.current = false
    }
  }

  function handleCancelDeleteConfirm() {
    setShowDeleteConfirm(false)
    if (optionsFromDashboardRef.current) {
      setEditingPlanId(null)
      setEditingPlanLabel(null)
      optionsFromDashboardRef.current = false
    }
  }

  function handleClearPlan() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setItems([])
    setEditingPlanId(null)
    setEditingPlanLabel(null)
    setLastAddedPlanId(null)
    setSaveStatus('idle')
    dirtyRef.current = false

    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setViewMode('dashboard')
  }

  /** Start a new plan from the dashboard — clean slate, opens picker. */
  function handleStartNewPlan() {
    setItems([])
    setEditingPlanId(null)
    setEditingPlanLabel(null)
    dirtyRef.current = false
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setViewMode('editing')
    setShowPicker(true)
  }

  async function handleDeletePlan() {
    // ConfirmSheet manages its own loading state; this handler only needs to
    // perform the work and throw on failure so the sheet releases its lock.
    if (!editingPlanId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await deletePlanById(editingPlanId)
    const from = offsetDate(todayIso, -180)
    const to = offsetDate(todayIso, 180)
    const dates = await fetchDatesWithPlans(from, to)
    setDatesWithPlans(new Set(dates))
    setSelectedDayPlans(prev => prev.filter(p => p.id !== editingPlanId))
    setShowDeleteConfirm(false)
    setEditingPlanId(null)
    setEditingPlanLabel(null)
    setItems([])
    setSaveStatus('idle')
    optionsFromDashboardRef.current = false
    // If the coach was in edit view, return them to dashboard. If they
    // triggered this from the dashboard swipe, they're already there.
    if (viewMode !== 'dashboard') setViewMode('dashboard')
  }

  async function handleMovePlan(newDate: string) {
    if (!editingPlanId) return
    try {
      await movePlanToDate(editingPlanId, newDate)
      const from = offsetDate(todayIso, -180)
      const to = offsetDate(todayIso, 180)
      const dates = await fetchDatesWithPlans(from, to)
      setDatesWithPlans(new Set(dates))
      setSelectedDayPlans(prev => prev.filter(p => p.id !== editingPlanId))
      setEditingPlanLabel(formatDisplayDate(newDate))
      setSelectedDayIso(newDate)
      setShowMoveCalendar(false)
      setShowPlanOptions(false)
      // If the options sheet was opened from the dashboard, clear the
      // temporary editingPlanId so subsequent state isn't stale.
      if (optionsFromDashboardRef.current) {
        setEditingPlanId(null)
        setEditingPlanLabel(null)
        optionsFromDashboardRef.current = false
      }
    } catch (err) {
      console.error('Move failed:', err)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    dirtyRef.current = true
    setItems(prev => {
      const fromIndex = prev.findIndex(i => i.localId === active.id)
      const toIndex = prev.findIndex(i => i.localId === over.id)
      if (fromIndex === -1 || toIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const sharePlanId = editingPlanId ?? lastAddedPlanId

  async function handleShare() {
    if (!sharePlanId) return
    const url = `${window.location.origin}/plan/${sharePlanId}`
    if (navigator.share) {
      try { await navigator.share({ title: "Today's Plan", url }); return }
      catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch { /* ignore */ }
  }

  if (!mounted) return null

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ── */}
      <div className="relative flex items-center px-4 pt-4 pb-3 gap-2">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />

        {/* Back button — editing mode only */}
        {viewMode === 'editing' && (
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-bg-border text-text-muted hover:bg-white/5 active:scale-95 transition-all flex-shrink-0"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl text-text-primary leading-none truncate">
            {viewMode === 'editing' && editingPlanLabel
              ? editingPlanLabel
              : formatSelectedDayLabel(selectedDayIso, todayIso)}
          </h1>
          {/* Save indicator — only while editing an existing saved plan */}
          {viewMode === 'editing' && editingPlanId && saveStatus !== 'idle' && (
            <p className={[
              'text-[10px] font-heading uppercase tracking-wider leading-none mt-1.5 transition-opacity',
              saveStatus === 'saving' ? 'text-text-dim' : 'text-accent-green',
            ].join(' ')}>
              {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
            </p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Calendar icon — opens month browse */}
          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-bg-border text-text-muted hover:bg-white/5 active:scale-95 transition-all"
            aria-label="View calendar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Share — editing mode only */}
          {viewMode === 'editing' && sharePlanId && items.length > 0 && (
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-bg-border text-text-muted hover:bg-white/5 active:scale-95 transition-all"
              aria-label={copyFeedback ? 'Copied' : 'Share plan'}
            >
              {copyFeedback ? (
                <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Sibling plan navigator ── */}
      {hasSiblings && (
        <div className="flex items-center justify-center gap-3 px-4 pb-2 pt-0">
          <button
            type="button"
            onClick={() => handleLoadPlan(selectedDayPlans[siblingIndex - 1])}
            disabled={siblingIndex === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-bg-border text-text-muted disabled:opacity-30 disabled:cursor-default hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Previous plan"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs font-heading text-text-dim tabular-nums">
            Plan {siblingIndex + 1} of {selectedDayPlans.length}
          </span>
          <button
            type="button"
            onClick={() => handleLoadPlan(selectedDayPlans[siblingIndex + 1])}
            disabled={siblingIndex === selectedDayPlans.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-bg-border text-text-muted disabled:opacity-30 disabled:cursor-default hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Next plan"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* DASHBOARD VIEW                              */}
      {/* ════════════════════════════════════════════ */}
      {!loading && viewMode === 'dashboard' && (
        <div>

          {/* ── Week strip ── */}
          <div className="px-4 pt-1 pb-2">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={prevWeek}
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
                aria-label="Previous week"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-xs font-heading text-text-dim">{formatWeekRange(weekStart)}</p>
              <button
                type="button"
                onClick={nextWeek}
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-white/5 active:bg-white/10 transition-colors"
                aria-label="Next week"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(({ iso, label, num }) => {
                const isSelected = iso === selectedDayIso
                const isToday = iso === todayIso
                const hasPlan = datesWithPlans.has(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleDaySelect(iso)}
                    className={[
                      'flex flex-col items-center py-2.5 rounded-xl transition-all select-none',
                      isSelected
                        ? 'bg-accent-fire'
                        : isToday
                        ? 'border border-accent-fire/40'
                        : 'hover:bg-white/5 active:bg-white/10',
                    ].join(' ')}
                  >
                    <span className={[
                      'text-[10px] font-heading uppercase tracking-wide leading-none mb-1',
                      isSelected ? 'text-white/70' : 'text-text-dim',
                    ].join(' ')}>{label}</span>
                    <span className={[
                      'text-sm font-heading leading-none',
                      isSelected ? 'text-white' : isToday ? 'text-accent-fire' : 'text-text-muted',
                    ].join(' ')}>{num}</span>
                    <span className={[
                      'w-1 h-1 rounded-full mt-1.5',
                      hasPlan ? (isSelected ? 'bg-white/70' : 'bg-accent-fire/60') : 'invisible',
                    ].join(' ')} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Planned section ── */}
          <div className="px-4 mt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim">Planned</p>
              {selectedDayPlans.length > 0 && (
                <>
                  <span className="text-text-dim/40 text-[11px]">·</span>
                  <span className="text-[11px] font-heading uppercase tracking-wider text-text-dim/60">
                    {selectedDayPlans.length}
                  </span>
                </>
              )}
            </div>

            {selectedDayLoading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!selectedDayLoading && selectedDayPlans.length > 0 && (
              <div className="flex flex-col gap-2">
                {selectedDayPlans.map(plan => (
                  <SavedPlanRow
                    key={plan.id}
                    plan={plan}
                    onOpen={() => handleLoadPlan(plan)}
                    actions={{
                      onMove: () => handleMoveFromDashboard(plan),
                      onDuplicate: () => handleDuplicateFromDashboard(plan),
                      onDelete: () => handleDeleteFromDashboard(plan),
                    }}
                  />
                ))}
              </div>
            )}

            {!selectedDayLoading && selectedDayPlans.length === 0 && (
              <p className="text-xs text-text-dim/50 text-center py-8">
                No plan for this day
              </p>
            )}
          </div>

          {/* ── Start Plan CTA ──                                          */}
          {/* Demoted to outlined/secondary when the day already has saved  */}
          {/* plan(s), so the saved cards above read as the primary state.  */}
          <div className="px-4 mt-5 pb-2">
            {selectedDayPlans.length > 0 ? (
              <button
                type="button"
                onClick={handleStartNewPlan}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-transparent border border-bg-border text-text-muted hover:border-accent-fire/40 hover:text-text-primary font-heading text-sm py-3 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {selectedDayIso === todayIso
                  ? 'New plan for today'
                  : `Another plan for ${formatShortDay(selectedDayIso)}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartNewPlan}
                className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base py-4 rounded-2xl shadow-glow-fire active:scale-[0.98] transition-all min-h-[56px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {selectedDayIso === todayIso
                  ? 'Plan for today'
                  : `Plan for ${formatShortDay(selectedDayIso)}`}
              </button>
            )}
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* EDITING VIEW                                */}
      {/* ════════════════════════════════════════════ */}
      {!loading && viewMode === 'editing' && (
        <>
          {/* Add Component button moved below items list */}

          {/* ── Empty state for new plan ── */}
          {items.length === 0 && (
            <div className="px-4 pt-10 pb-4">
              <p className="font-heading text-text-primary text-lg leading-snug text-center">
                Start building
              </p>
              <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-xs mx-auto text-center">
                Pick stations and games from your library, or create a custom activity.
              </p>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="mt-5 w-full flex items-center justify-center gap-1.5 bg-transparent border border-dashed border-bg-border text-text-dim hover:text-text-primary hover:border-text-muted font-heading text-sm px-4 py-3 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add component
              </button>
            </div>
          )}

          {/* ── Plan items ── */}
          {items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.localId)} strategy={verticalListSortingStrategy}>
                <div className="mx-4 flex flex-col gap-2">
                  {items.map((item) => (
                    <SortablePlanItem
                      key={item.localId}
                      item={item}
                      onRemove={handleRemove}
                      onPhotoTap={photos => setLightbox({ photos })}
                      onRowTap={i => setActiveSheet(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* ── Add component (dashed, below items) ── */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-center gap-1.5 bg-transparent border border-dashed border-bg-border text-text-dim hover:text-text-primary hover:border-text-muted font-heading text-sm px-4 py-3 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add component
            </button>
          )}

          {/* ── Bottom action area ── */}
          {items.length > 0 && (
            <div className="px-4 pt-5 pb-2">
              {editingPlanId ? (
                /* Saved plan: subtle bordered pill — findable without being loud */
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowPlanOptions(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bg-border font-heading text-xs uppercase tracking-wider text-text-muted hover:bg-white/5 hover:border-text-dim active:scale-95 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                    </svg>
                    Plan options
                  </button>
                </div>
              ) : (
                /* New plan: single primary CTA */
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full font-heading text-base px-4 py-3.5 rounded-xl bg-accent-fire text-white active:scale-[0.98] transition-all min-h-[52px]"
                >
                  Save to calendar
                </button>
              )}
            </div>
          )}

          {/* ── Clear & start over (new plan only) ── */}
          {items.length > 0 && !editingPlanId && (
            <div className="px-4 pb-4 flex justify-center gap-4">
              <button
                type="button"
                onClick={handleClearPlan}
                className="text-sm text-text-dim/50 hover:text-text-dim transition-colors"
              >
                Clear & start over
              </button>
            </div>
          )}
        </>
      )}

      {/* Save-to-calendar confirmation toast lives in the app-root ToastProvider */}

      {/* ── Undo toast (recently-removed plan item) ── */}
      {removedItem && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 bg-bg-card border border-bg-border shadow-card rounded-xl pl-4 pr-2 py-2">
            <span className="text-sm text-text-muted">
              Removed <span className="text-text-primary font-heading">{removedItem.item.component.title}</span>
            </span>
            <button
              type="button"
              onClick={handleUndoRemove}
              className="px-3 py-1.5 rounded-lg bg-accent-fire/15 text-accent-fire font-heading text-xs uppercase tracking-wider hover:bg-accent-fire/25 active:scale-95 transition-all"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* ── Modals / portals ── */}

      {showPicker && (
        <ComponentPickerModal
          onSelect={handleSelect}
          onAdHocSelect={handleAdHocSelect}
          onClose={() => setShowPicker(false)}
          existingIds={new Set(items.filter(i => !i.isAdHoc).map(i => i.component.id))}
        />
      )}

      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          onClose={() => setLightbox(null)}
        />
      )}

      {activeSheet && (
        <PlanItemSheet
          item={activeSheet}
          onSaveNote={(localId, note) => {
            handleNoteChange(localId, note)
            setActiveSheet(prev => prev ? { ...prev, coachNote: note || null } : null)
          }}
          onDurationChange={(localId, value) => {
            handleDurationChange(localId, value)
            const num = value === '' ? null : parseInt(value, 10)
            setActiveSheet(prev => prev ? { ...prev, durationMinutes: isNaN(num as number) ? null : num } : null)
          }}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {showDatePicker && (
        <PlanCalendarSheet
          mode="save"
          todayIso={todayIso}
          datesWithPlans={datesWithPlans}
          /* Pre-select the day the coach started planning for — one-tap save */
          initialSelectedDate={selectedDayIso}
          onSaveToCal={async (date, title) => {
            setShowDatePicker(false)
            await handleAddToCalendar(date, title)
          }}
          onLoadPlan={() => {}}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {showCalendar && (
        <PlanCalendarSheet
          mode="browse"
          todayIso={todayIso}
          datesWithPlans={datesWithPlans}
          defaultView="month"
          onSaveToCal={() => {}}
          onLoadPlan={(plan) => {
            setShowCalendar(false)
            handleLoadPlan(plan)
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* ── Move plan to a different date ── */}
      {showMoveCalendar && (
        <PlanCalendarSheet
          mode="save"
          todayIso={todayIso}
          datesWithPlans={datesWithPlans}
          onSaveToCal={async (date) => {
            setShowMoveCalendar(false)
            await handleMovePlan(date)
          }}
          onLoadPlan={() => {}}
          onClose={() => setShowMoveCalendar(false)}
        />
      )}

      {/* ── Plan Options sheet ── */}
      <BottomSheet visible={showPlanOptions} onClose={handleCancelPlanOptions} title="Plan Options">
        <div className="px-6 pb-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { setShowPlanOptions(false); setShowMoveCalendar(true) }}
            className="w-full py-3.5 rounded-xl border border-bg-border font-heading text-sm text-text-muted hover:bg-white/5 active:scale-[0.98] transition-all text-left px-4 min-h-[52px]"
          >
            Move to a different date
          </button>
          <button
            type="button"
            onClick={() => { setShowPlanOptions(false); setShowDatePicker(true) }}
            className="w-full py-3.5 rounded-xl border border-bg-border font-heading text-sm text-text-muted hover:bg-white/5 active:scale-[0.98] transition-all text-left px-4 min-h-[52px]"
          >
            Duplicate to another date
          </button>
          <button
            type="button"
            onClick={() => { setShowPlanOptions(false); setShowDeleteConfirm(true) }}
            className="w-full py-3.5 rounded-xl border border-red-500/30 font-heading text-sm text-red-400 hover:bg-red-500/10 active:scale-[0.98] transition-all text-left px-4 min-h-[52px]"
          >
            Delete this plan
          </button>
          <button
            type="button"
            onClick={handleCancelPlanOptions}
            className="w-full py-3.5 rounded-xl border border-bg-border font-heading text-sm text-text-dim hover:bg-white/5 active:scale-[0.98] transition-all min-h-[48px] mt-1"
          >
            Cancel
          </button>
        </div>
      </BottomSheet>

      {/* ── Delete confirmation — shared ConfirmSheet primitive ── */}
      <ConfirmSheet
        visible={showDeleteConfirm}
        title="Delete this plan?"
        body="This can't be undone. All components and coach notes will be removed."
        confirmLabel="Delete plan"
        workingLabel="Deleting…"
        destructive
        onConfirm={handleDeletePlan}
        onClose={handleCancelDeleteConfirm}
      />

    </div>
  )
}
