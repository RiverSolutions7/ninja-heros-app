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
import type { ComponentRow, ComponentType, PlanItem, PlanRow } from '@/app/lib/database.types'
import { addPlanToCalendar, updatePlanById, fetchDatesWithPlans, fetchPlansForDate } from '@/app/lib/planQueries'
import ComponentPickerModal from './ComponentPickerModal'
import { PhotoLightbox } from '@/app/components/ui/PhotoLightbox'
import { PlanItemSheet } from './PlanItemSheet'
import { PlanCalendarSheet } from './PlanCalendarSheet'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Draft {
  id: string
  name?: string
  items: PlanItem[]
  createdAt: string
}

const DRAFTS_KEY = 'ninja-plan-drafts'
const SESSION_KEY = 'ninja-plan-session'
const MAX_DRAFTS = 5

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

function formatDraftTime(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return isToday
    ? `Today · ${time}`
    : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${time}`
}

function saveDraftsToStorage(drafts: Draft[]) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)) } catch { /* ignore */ }
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

/** Auto-label a plan from component types when no title is set */
function autoLabel(plan: PlanRow): string {
  if (plan.title) return plan.title
  const its = plan.items ?? []
  const w = its.filter(i => i.component.type === 'warmup').length
  const s = its.filter(i => i.component.type === 'station').length
  const g = its.filter(i => i.component.type === 'game').length
  const parts = [
    w > 0 && `${w} warmup${w > 1 ? 's' : ''}`,
    s > 0 && `${s} station${s > 1 ? 's' : ''}`,
    g > 0 && `${g} game${g > 1 ? 's' : ''}`,
  ].filter(Boolean) as string[]
  return parts.length ? parts.join(' · ') : 'Class Plan'
}

const WEEK_DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// ── Type icons + placeholder ──────────────────────────────────────────────────

const TYPE_META: Record<ComponentType, { label: string; border: string; textColor: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', border: 'border-l-accent-gold', textColor: 'text-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', border: 'border-l-accent-blue', textColor: 'text-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', textColor: 'text-accent-green', placeholderBg: 'bg-accent-green/20' },
}

const TYPE_ICONS: Record<ComponentType, React.ReactNode> = {
  warmup: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
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

function TypePlaceholder({ type, className }: { type: ComponentType; className?: string }) {
  const meta = TYPE_META[type]
  return (
    <div className={['flex items-center justify-center', meta.placeholderBg, className].join(' ')}>
      <span className={meta.textColor}>{TYPE_ICONS[type]}</span>
    </div>
  )
}

// ── Sortable plan item ────────────────────────────────────────────────────────

function SortablePlanItem({
  item,
  index,
  onRemove,
  onPhotoTap,
  onRowTap,
}: {
  item: PlanItem
  index: number
  onRemove: (localId: string) => void
  onPhotoTap: (photos: string[]) => void
  onRowTap: (item: PlanItem) => void
}) {
  const meta = TYPE_META[item.component.type]
  const photos = (item.component.photos ?? []).filter(Boolean)
  const firstPhoto = photos[0] ?? null
  const extraCount = photos.length - 1

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
      <span className="text-[11px] font-heading text-text-dim/40 w-4 text-right flex-shrink-0 tabular-nums">
        {index + 1}
      </span>
      <span
        className="text-text-dim/40 text-base leading-none select-none flex-shrink-0 cursor-grab active:cursor-grabbing p-1"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
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
            <TypePlaceholder type={item.component.type} className="w-full h-full rounded-xl" />
          )}
        </button>
        {extraCount > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-heading px-1 py-0.5 rounded leading-none pointer-events-none">
            +{extraCount}
          </span>
        )}
      </div>
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
            <div className="flex items-center gap-1 mt-0.5">
              <span className={['text-[10px] font-heading uppercase tracking-wide flex-shrink-0', meta.textColor].join(' ')}>
                {meta.label}
              </span>
              {item.component.curriculum && (
                <>
                  <span className="text-text-dim/30 text-[10px] flex-shrink-0">·</span>
                  <span className="text-[10px] text-text-dim truncate">{item.component.curriculum}</span>
                </>
              )}
            </div>
            {item.coachNote && (
              <p className="text-[11px] text-accent-fire/70 mt-0.5 truncate">
                {item.coachNote.split('\n')[0]}
              </p>
            )}
          </div>
          {item.durationMinutes ? (
            <span className="text-[11px] text-text-dim font-heading flex-shrink-0">
              {item.durationMinutes}m
            </span>
          ) : null}
          {!item.coachNote && (
            <span className="text-[10px] text-text-dim/30 flex-shrink-0 font-heading">note</span>
          )}
        </div>
      </button>
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

// ── Draft card ────────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onContinue,
  onDiscard,
}: {
  draft: Draft
  onContinue: () => void
  onDiscard: () => void
}) {
  const preview = draft.items.slice(0, 5)
  const extra = draft.items.length - preview.length

  return (
    <div className="bg-bg-card rounded-2xl border border-bg-border p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-fire/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-sm text-text-primary leading-snug">
              {draft.name || 'Draft Plan'}
            </p>
            <p className="text-[11px] text-text-dim mt-0.5">
              {draft.items.length} component{draft.items.length !== 1 ? 's' : ''} · {formatDraftTime(draft.createdAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          className="text-text-dim/40 hover:text-text-muted transition-colors flex-shrink-0 p-1 -mr-1 -mt-1"
          aria-label="Discard draft"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {preview.map((item) => {
          const meta = TYPE_META[item.component.type]
          const photo = item.component.photos?.[0] ?? null
          return (
            <div key={item.localId} className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={item.component.title} className="w-full h-full object-cover" />
              ) : (
                <div className={['w-full h-full flex items-center justify-center', meta.placeholderBg].join(' ')}>
                  <span className={['w-3.5 h-3.5', meta.textColor].join(' ')}>
                    {TYPE_ICONS[item.component.type]}
                  </span>
                </div>
              )}
            </div>
          )
        })}
        {extra > 0 && (
          <span className="text-[11px] text-text-dim/60 ml-0.5">+{extra}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="w-full bg-accent-fire/10 border border-accent-fire/30 text-accent-fire font-heading text-sm py-2.5 rounded-xl active:scale-[0.98] transition-all"
      >
        Continue Editing
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TodaysPlanClient() {
  const [todayIso] = useState(() => new Date().toLocaleDateString('en-CA'))

  const todayLabel = (() => {
    const d = new Date(todayIso + 'T00:00:00')
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })()

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

  // ── Drafts ───────────────────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState<Draft[]>([])
  const activeDraftIdRef = useRef<string | null>(null)
  const [showDraftNameInput, setShowDraftNameInput] = useState(false)
  const [draftNameValue, setDraftNameValue] = useState('')
  const [draftSavedFeedback, setDraftSavedFeedback] = useState(false)

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [datesWithPlans, setDatesWithPlans] = useState<Set<string>>(new Set())
  const [calendarAddedTo, setCalendarAddedTo] = useState<string | null>(null)

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [showPicker, setShowPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ photos: string[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState<PlanItem | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle')
  const [classLength, setClassLength] = useState<number | null>(null)
  const [showLengthPicker, setShowLengthPicker] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalMinutes = items.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)
  const isOverBudget = !!(classLength && totalMinutes > classLength)
  const warmupCount = items.filter(i => i.component.type === 'warmup').length
  const stationCount = items.filter(i => i.component.type === 'station').length
  const gameCount = items.filter(i => i.component.type === 'game').length
  const typeSummary = [
    warmupCount > 0 && `${warmupCount} warmup${warmupCount > 1 ? 's' : ''}`,
    stationCount > 0 && `${stationCount} station${stationCount > 1 ? 's' : ''}`,
    gameCount > 0 && `${gameCount} game${gameCount > 1 ? 's' : ''}`,
  ].filter(Boolean).join(' · ')

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

  // Mount: session recovery → drafts → calendar data
  useEffect(() => {
    setMounted(true)

    // Session recovery
    try {
      const session = sessionStorage.getItem(SESSION_KEY)
      if (session) {
        const recovered = JSON.parse(session) as PlanItem[]
        if (recovered.length > 0) {
          setItems(recovered)
          setViewMode('editing') // restore editing view
        }
      }
    } catch { /* ignore */ }

    // Drafts
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      if (raw) setDrafts(JSON.parse(raw) as Draft[])
    } catch { /* ignore */ }

    // Class length
    try {
      const stored = parseInt(localStorage.getItem('ninja-class-length') || '', 10)
      if (stored > 0) setClassLength(stored)
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

  // Persist class length
  useEffect(() => {
    try {
      if (classLength) localStorage.setItem('ninja-class-length', String(classLength))
      else localStorage.removeItem('ninja-class-length')
    } catch { /* ignore */ }
  }, [classLength])

  // Auto-save to Supabase when editing a calendar plan
  const debouncedSave = useCallback((currentItems: PlanItem[], planId: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await updatePlanById(planId, currentItems)
        setSaveStatus('idle')
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

  // Auto-save active draft to localStorage
  useEffect(() => {
    if (!mounted) return
    if (editingPlanId !== null) return
    const id = activeDraftIdRef.current
    if (!id) return
    if (items.length === 0) {
      setDrafts(prev => {
        const next = prev.filter(d => d.id !== id)
        saveDraftsToStorage(next)
        return next
      })
      activeDraftIdRef.current = null
      return
    }
    setDrafts(prev => {
      const existing = prev.find(d => d.id === id)
      const without = prev.filter(d => d.id !== id)
      const updated = [
        { id, name: existing?.name, items, createdAt: new Date().toISOString() },
        ...without,
      ].slice(0, MAX_DRAFTS)
      saveDraftsToStorage(updated)
      return updated
    })
  }, [items, mounted, editingPlanId])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleSelect(component: ComponentRow) {
    setItems(prev => [
      ...prev,
      { localId: crypto.randomUUID(), component, durationMinutes: component.duration_minutes ?? null, coachNote: null },
    ])
  }

  function handleRemove(localId: string) {
    setItems(prev => prev.filter(i => i.localId !== localId))
  }

  function handleDurationChange(localId: string, value: string) {
    const num = value === '' ? null : parseInt(value, 10)
    setItems(prev =>
      prev.map(i => i.localId === localId ? { ...i, durationMinutes: isNaN(num as number) ? null : num } : i)
    )
  }

  function handleNoteChange(localId: string, note: string) {
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

  function handleBackToDashboard() {
    setViewMode('dashboard')
    // Items stay in state / session storage — not cleared
  }

  // ── Draft handlers ────────────────────────────────────────────────────────────

  function handleSaveDraftTap() {
    if (items.length === 0) return
    if (!showDraftNameInput) { setShowDraftNameInput(true); return }
    confirmSaveDraft()
  }

  function confirmSaveDraft() {
    if (items.length === 0) return
    const id = activeDraftIdRef.current ?? crypto.randomUUID()
    activeDraftIdRef.current = id
    const name = draftNameValue.trim() || undefined
    setDrafts(prev => {
      const without = prev.filter(d => d.id !== id)
      const updated = [{ id, name, items, createdAt: new Date().toISOString() }, ...without].slice(0, MAX_DRAFTS)
      saveDraftsToStorage(updated)
      return updated
    })
    setDraftNameValue('')
    setShowDraftNameInput(false)
    setDraftSavedFeedback(true)
    setTimeout(() => setDraftSavedFeedback(false), 1500)
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }

  async function handleAddToCalendar(date: string, title: string) {
    if (items.length === 0) return
    setSaveStatus('saving')
    try {
      const plan = await addPlanToCalendar(date, items, title || undefined)
      setLastAddedPlanId(plan.id)
      const from = offsetDate(todayIso, -180)
      const to = offsetDate(todayIso, 180)
      const dates = await fetchDatesWithPlans(from, to)
      setDatesWithPlans(new Set(dates))
      setSaveStatus('idle')
      setCalendarAddedTo(formatDisplayDate(date))
      setTimeout(() => setCalendarAddedTo(null), 3000)
      try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    } catch (err) {
      console.error('Add to calendar failed:', err)
      setSaveStatus('idle')
    }
  }

  function handleLoadPlan(plan: PlanRow) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    activeDraftIdRef.current = null
    setEditingPlanId(plan.id)
    const titlePart = plan.title ? plan.title : null
    const datePart = plan.plan_date ? formatDisplayDate(plan.plan_date) : null
    setEditingPlanLabel([titlePart, datePart].filter(Boolean).join(' · '))
    setItems(plan.items ?? [])
    setSaveStatus('idle')
    setCalendarAddedTo(null)
    setLastAddedPlanId(null)
    setShowDraftNameInput(false)
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setViewMode('editing')
  }

  function handleContinueDraft(draft: Draft) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    activeDraftIdRef.current = draft.id
    setItems(draft.items)
    setEditingPlanId(null)
    setEditingPlanLabel(null)
    setLastAddedPlanId(null)
    setSaveStatus('idle')
    setShowDraftNameInput(false)
    setViewMode('editing')
  }

  function handleDiscardDraft(draftId: string) {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== draftId)
      saveDraftsToStorage(next)
      return next
    })
    if (activeDraftIdRef.current === draftId) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      setItems([])
      setEditingPlanId(null)
      setEditingPlanLabel(null)
      setSaveStatus('idle')
      activeDraftIdRef.current = null
      setShowDraftNameInput(false)
    }
  }

  function handleClearPlan() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const id = activeDraftIdRef.current
    if (id) {
      setDrafts(prev => {
        const next = prev.filter(d => d.id !== id)
        saveDraftsToStorage(next)
        return next
      })
    }
    setItems([])
    setEditingPlanId(null)
    setEditingPlanLabel(null)
    setLastAddedPlanId(null)
    setSaveStatus('idle')
    setCalendarAddedTo(null)
    setShowDraftNameInput(false)
    setDraftNameValue('')
    activeDraftIdRef.current = null
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setViewMode('dashboard')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
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

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl text-text-primary leading-none">{"Today's Plan"}</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            {viewMode === 'editing' && editingPlanLabel ? `Editing: ${editingPlanLabel}` : todayLabel}
          </p>
          {viewMode === 'editing' && saveStatus === 'saving' && (
            <p className="text-[11px] mt-1 text-text-dim">Saving…</p>
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
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim">Planned</p>
              <span className="text-[11px] text-text-dim/50">{formatShortDay(selectedDayIso)}</span>
              {selectedDayPlans.length > 0 && (
                <span className="ml-auto text-[11px] text-text-dim/50">{selectedDayPlans.length}</span>
              )}
            </div>

            {selectedDayLoading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!selectedDayLoading && selectedDayPlans.length > 0 && (
              <div className="space-y-2">
                {selectedDayPlans.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleLoadPlan(plan)}
                    className="w-full text-left bg-accent-fire/10 border border-accent-fire/25 rounded-2xl px-4 py-3.5 active:bg-accent-fire/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading text-sm text-text-primary leading-snug truncate flex-1">
                        {autoLabel(plan)}
                      </p>
                      <svg className="w-4 h-4 text-accent-fire flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <p className="text-[11px] text-text-dim mt-0.5">
                      {(plan.items ?? []).length} component{(plan.items ?? []).length !== 1 ? 's' : ''}
                      {plan.updated_at && (
                        <span className="text-text-dim/50"> · saved {formatSavedAt(plan.updated_at)}</span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {!selectedDayLoading && selectedDayPlans.length === 0 && (() => {
              const isPast = selectedDayIso < todayIso
              const isToday = selectedDayIso === todayIso
              if (isPast) return (
                <p className="text-xs text-text-dim/50 text-center py-8">Nothing was logged for this day</p>
              )
              return (
                <div className="text-center py-8">
                  <p className="text-xs text-text-dim/50 mb-3">
                    {isToday ? 'No class today' : 'Nothing scheduled yet'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewMode('editing')}
                    className="inline-flex items-center gap-1.5 text-sm font-heading text-accent-fire border border-accent-fire/30 rounded-xl px-4 py-2.5 hover:bg-accent-fire/10 transition-colors active:scale-[0.97]"
                  >
                    + Plan {isToday ? 'today' : formatShortDay(selectedDayIso)}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )
            })()}
          </div>

          {/* ── Drafts ── */}
          {drafts.length > 0 && (
            <>
              <div className="mx-4 mt-5 border-t border-bg-border/40" />
              <div className="px-4 mt-5">
                <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim mb-3">Drafts</p>
                <div className="space-y-3">
                  {drafts.map(draft => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onContinue={() => handleContinueDraft(draft)}
                      onDiscard={() => handleDiscardDraft(draft.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Start New Plan CTA ── */}
          <div className="px-4 mt-5 pb-2">
            <button
              type="button"
              onClick={() => { setViewMode('editing'); setShowPicker(true) }}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base py-4 rounded-2xl shadow-glow-fire active:scale-[0.98] transition-all min-h-[56px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Start New Plan
            </button>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* EDITING VIEW                                */}
      {/* ════════════════════════════════════════════ */}
      {!loading && viewMode === 'editing' && (
        <>
          {/* ── Add Component button ── */}
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[52px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {items.length === 0 ? 'Add Component' : 'Add Component'}
            </button>
          </div>

          {/* ── Empty state for new plan ── */}
          {items.length === 0 && (
            <div className="text-center py-10 px-6">
              <p className="font-heading text-text-muted text-lg">Build today's class</p>
              <p className="text-text-dim text-sm mt-2 leading-relaxed">
                Pick warmups, stations, and games from your library. Drag to reorder, tap any row to add a coach note.
              </p>
              <Link href="/library" className="text-text-dim text-xs mt-3 inline-block underline underline-offset-2 hover:text-text-muted transition-colors">
                Build your component library first
              </Link>
            </div>
          )}

          {/* ── Time budget ── */}
          {items.length > 0 && (totalMinutes > 0 || classLength) && (
            <div className="px-4 pt-1 pb-1">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    onClick={() => setShowLengthPicker(v => !v)}
                    className="text-[11px] text-text-dim/50 hover:text-text-dim transition-colors flex-shrink-0 underline underline-offset-2"
                  >
                    Set length
                  </button>
                )}
              </div>
              {showLengthPicker && (
                <div className="flex gap-2 mt-2">
                  {[30, 45, 60, 90].map(min => (
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

          {/* ── Plan items (sortable) ── */}
          {items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.localId)} strategy={verticalListSortingStrategy}>
                <ul className="mx-4 bg-bg-card rounded-2xl overflow-hidden border border-bg-border">
                  {items.map((item, idx) => (
                    <SortablePlanItem
                      key={item.localId}
                      item={item}
                      index={idx}
                      onRemove={handleRemove}
                      onPhotoTap={photos => setLightbox({ photos })}
                      onRowTap={i => setActiveSheet(i)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* ── Type summary ── */}
          {items.length > 0 && typeSummary && (
            <p className="text-center text-[11px] text-text-dim/50 px-4 pt-2">
              {typeSummary}
            </p>
          )}

          {/* ── Draft name input ── */}
          {items.length > 0 && showDraftNameInput && (
            <div className="px-4 pt-4 pb-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draftNameValue}
                  onChange={e => setDraftNameValue(e.target.value)}
                  placeholder="Name this draft (optional) — e.g. Coach Mike"
                  maxLength={50}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && confirmSaveDraft()}
                  className="flex-1 bg-bg-input border border-bg-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => { setShowDraftNameInput(false); setDraftNameValue('') }}
                  className="text-text-dim/40 hover:text-text-muted transition-colors px-2"
                  aria-label="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Two-button action row ── */}
          {items.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex gap-2">
              <button
                type="button"
                onClick={showDraftNameInput ? confirmSaveDraft : handleSaveDraftTap}
                className="flex-1 py-3.5 rounded-xl border border-bg-border font-heading text-sm text-text-muted hover:border-accent-fire/30 active:scale-[0.98] transition-all min-h-[52px]"
              >
                {draftSavedFeedback ? '✓ Draft Saved' : showDraftNameInput ? 'Confirm Save' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="flex-1 py-3.5 rounded-xl bg-accent-fire text-white font-heading text-sm shadow-glow-fire active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 min-h-[52px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </button>
            </div>
          )}

          {/* ── Transient confirmation ── */}
          {calendarAddedTo && (
            <p className="text-center text-xs text-accent-green px-4 pb-2">
              ✓ Added to {calendarAddedTo}
            </p>
          )}

          {/* ── Editing indicator ── */}
          {editingPlanId && (
            <p className="text-center text-[11px] text-text-dim/50 px-4 pb-1">
              Editing saved plan · changes auto-save
            </p>
          )}

          {/* ── Clear & back to dashboard ── */}
          {items.length > 0 && (
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

      {/* ── Modals / portals ── */}

      {showPicker && (
        <ComponentPickerModal
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
          existingIds={new Set(items.map(i => i.component.id))}
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
          planDate={todayIso}
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

    </div>
  )
}
