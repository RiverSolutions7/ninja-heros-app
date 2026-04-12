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
import { PlanItemSheet } from './PlanItemSheet'
import { PlanCalendarSheet } from './PlanCalendarSheet'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Draft {
  id: string
  items: PlanItem[]
  createdAt: string
}

const DRAFTS_KEY = 'ninja-plan-drafts'
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

// ── Sortable plan item ────────────────────────────────────────────────────────

const TYPE_META: Record<ComponentType, { label: string; border: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', border: 'border-l-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', border: 'border-l-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', placeholderBg: 'bg-accent-green/20' },
}

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

      {/* Thumbnail */}
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
          {item.durationMinutes ? (
            <span className="text-[11px] text-text-dim font-heading flex-shrink-0">
              {item.durationMinutes}m
            </span>
          ) : null}
          {/* Mic affordance */}
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
  const preview = draft.items.slice(0, 3)
  const extra = draft.items.length - preview.length

  return (
    <div className="bg-bg-card rounded-2xl border border-bg-border p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent-fire/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent-fire" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <p className="font-heading text-sm text-text-primary leading-snug">
              Draft Plan
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

      {/* Component preview thumbnails */}
      <div className="flex items-center gap-2 mb-4">
        {preview.map((item) => {
          const meta = TYPE_META[item.component.type]
          const photo = item.component.photos?.[0] ?? null
          return (
            <div key={item.localId} className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={item.component.title} className="w-full h-full object-cover" />
                ) : (
                  <div className={['w-full h-full', meta.placeholderBg].join(' ')} />
                )}
              </div>
              <p className="text-[11px] text-text-dim truncate max-w-[80px]">{item.component.title}</p>
            </div>
          )
        })}
        {extra > 0 && (
          <p className="text-[11px] text-text-dim/60">+{extra} more</p>
        )}
      </div>

      {/* Continue button */}
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

  // Plan state
  const [planId, setPlanId] = useState<string | null>(null)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [items, setItems] = useState<PlanItem[]>([])
  const [datesWithPlans, setDatesWithPlans] = useState<Set<string>>(new Set())

  // Draft state
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [expandedEditing, setExpandedEditing] = useState(false)
  const activeDraftIdRef = useRef<string | null>(null)

  // UI state
  const [showPicker, setShowPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ photos: string[] } | null>(null)
  const [activeSheet, setActiveSheet] = useState<PlanItem | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [classLength, setClassLength] = useState<number | null>(null)
  const [showLengthPicker, setShowLengthPicker] = useState(false)

  // Derived
  const isEditing = expandedEditing || planDate !== null
  const totalMinutes = items.reduce((s, i) => s + (i.durationMinutes ?? 0), 0)
  const isOverBudget = !!(classLength && totalMinutes > classLength)
  const headerTitle = planDate && planDate !== todayIso ? formatDisplayDate(planDate) : "Today's Plan"

  // @dnd-kit
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Auto-save ref
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Mount: load localStorage drafts + today's Supabase plan
  useEffect(() => {
    setMounted(true)

    // Load drafts
    try {
      const raw = localStorage.getItem(DRAFTS_KEY)
      if (raw) setDrafts(JSON.parse(raw) as Draft[])
    } catch { /* ignore */ }

    // Load class length
    try {
      const stored = parseInt(localStorage.getItem('ninja-class-length') || '', 10)
      if (stored > 0) setClassLength(stored)
    } catch { /* ignore */ }

    // Load today's plan + calendar dots
    setLoading(true)
    const from = offsetDate(todayIso, -180)
    const to = offsetDate(todayIso, 180)
    Promise.all([fetchPlanForDate(todayIso), fetchDatesWithPlans(from, to)])
      .then(([plan, dates]) => {
        if (plan) {
          setPlanId(plan.id)
          setPlanDate(todayIso)
          setItems(plan.items ?? [])
          setExpandedEditing(true)
        }
        setDatesWithPlans(new Set(dates))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [todayIso])

  // Persist class length
  useEffect(() => {
    try {
      if (classLength) localStorage.setItem('ninja-class-length', String(classLength))
      else localStorage.removeItem('ninja-class-length')
    } catch { /* ignore */ }
  }, [classLength])

  // Auto-save to Supabase (when plan has a date)
  const debouncedSave = useCallback((currentItems: PlanItem[], date: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const plan = await upsertPlanForDate(date, currentItems)
        setPlanId(plan.id)
        const from = offsetDate(date, -180)
        const to = offsetDate(date, 180)
        const dates = await fetchDatesWithPlans(from, to)
        setDatesWithPlans(new Set(dates))
        setSaveStatus('saved')
      } catch (err) {
        setSaveStatus('idle')
        console.error('Auto-save failed:', err)
      }
    }, 500)
  }, [])

  useEffect(() => {
    if (!mounted || loading) return
    if (!planDate) return
    if (items.length === 0 && !planId) return
    debouncedSave(items, planDate)
  }, [items, mounted, loading, planDate, debouncedSave]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage (when no calendar date set)
  useEffect(() => {
    if (!mounted || !expandedEditing) return
    if (planDate !== null) return

    const id = activeDraftIdRef.current
    if (items.length === 0) {
      // Remove draft if items cleared
      if (id) {
        setDrafts(prev => {
          const next = prev.filter(d => d.id !== id)
          saveDraftsToStorage(next)
          return next
        })
        activeDraftIdRef.current = null
      }
      return
    }

    // Upsert this session's draft
    const finalId = id ?? crypto.randomUUID()
    activeDraftIdRef.current = finalId
    setDrafts(prev => {
      const without = prev.filter(d => d.id !== finalId)
      const updated = [
        { id: finalId, items, createdAt: new Date().toISOString() },
        ...without,
      ].slice(0, MAX_DRAFTS)
      saveDraftsToStorage(updated)
      return updated
    })
  }, [items, mounted, expandedEditing, planDate])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSelect(component: ComponentRow) {
    setItems(prev => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        component,
        durationMinutes: component.duration_minutes ?? null,
        coachNote: null,
      },
    ])
    setExpandedEditing(true)
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

  async function handleSaveToDate(date: string) {
    if (items.length === 0) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    try {
      const plan = await upsertPlanForDate(date, items)
      setPlanId(plan.id)
      setPlanDate(date)
      // Remove draft since it's now saved
      const id = activeDraftIdRef.current
      if (id) {
        setDrafts(prev => {
          const next = prev.filter(d => d.id !== id)
          saveDraftsToStorage(next)
          return next
        })
        activeDraftIdRef.current = null
      }
      // Refresh calendar dots
      const from = offsetDate(date, -180)
      const to = offsetDate(date, 180)
      const dates = await fetchDatesWithPlans(from, to)
      setDatesWithPlans(new Set(dates))
      setSaveStatus('saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('idle')
    }
  }

  async function handleLoadDate(date: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setShowCalendar(false)
    setLoading(true)
    setSaveStatus('idle')
    activeDraftIdRef.current = null
    try {
      const plan = await fetchPlanForDate(date)
      setPlanId(plan?.id ?? null)
      setPlanDate(date)
      setItems(plan?.items ?? [])
      setExpandedEditing(true)
    } finally {
      setLoading(false)
    }
  }

  function handleContinueDraft(draft: Draft) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    activeDraftIdRef.current = draft.id
    setItems(draft.items)
    setPlanId(null)
    setPlanDate(null)
    setSaveStatus('idle')
    setExpandedEditing(true)
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
      setPlanId(null)
      setPlanDate(null)
      setSaveStatus('idle')
      activeDraftIdRef.current = null
      setExpandedEditing(false)
    }
  }

  function handleStartNewPlan() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    activeDraftIdRef.current = null
    setItems([])
    setPlanId(null)
    setPlanDate(null)
    setSaveStatus('idle')
    setExpandedEditing(true)
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
    setPlanId(null)
    setPlanDate(null)
    setSaveStatus('idle')
    activeDraftIdRef.current = null
    setExpandedEditing(false)
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

  async function handleShare() {
    if (!planId) return
    const url = `${window.location.origin}/plan/${planId}`
    const lines = [planDate ? formatDisplayDate(planDate) : "Today's Plan"]
    items.forEach((item, idx) => {
      const dur = item.durationMinutes ? ` — ${item.durationMinutes} min` : ''
      lines.push(`${idx + 1}. ${item.component.title}${dur}`)
    })
    const text = lines.join('\n')
    if (navigator.share) {
      try { await navigator.share({ title: "Today's Plan", text, url }); return }
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
              {saveStatus === 'saving' ? 'Saving…' : `✓ Saved · ${formatDisplayDate(planDate!)}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View Calendar */}
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
          {/* Share — only when saved to Supabase */}
          {planId && items.length > 0 && (
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

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Draft cards (shown when not in editing mode and drafts exist) ── */}
          {!isEditing && drafts.length > 0 && (
            <div className="px-4 pt-2 space-y-3">
              <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim px-0.5">
                Saved Drafts
              </p>
              {drafts.map(draft => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onContinue={() => handleContinueDraft(draft)}
                  onDiscard={() => handleDiscardDraft(draft.id)}
                />
              ))}
            </div>
          )}

          {/* ── Time budget (only if durations set or class length configured) ── */}
          {isEditing && (totalMinutes > 0 || classLength) && (
            <div className="px-4 pt-3 pb-1">
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

          {/* ── Add to Plan button ── */}
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[52px]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add to Plan
            </button>
          </div>

          {/* ── Empty state ── */}
          {isEditing && items.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="font-heading text-text-muted text-lg">No components yet</p>
              <p className="text-text-dim text-sm mt-2">Tap + Add to Plan to start building your class</p>
              <Link href="/library" className="text-text-dim text-xs mt-3 inline-block underline underline-offset-2 hover:text-text-muted transition-colors">
                Build your component library first
              </Link>
            </div>
          )}

          {/* ── No drafts empty state ── */}
          {!isEditing && drafts.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="font-heading text-text-muted text-lg">No plan yet</p>
              <p className="text-text-dim text-sm mt-2">Tap + Add to Plan to start building your class</p>
              <Link href="/library" className="text-text-dim text-xs mt-3 inline-block underline underline-offset-2 hover:text-text-muted transition-colors">
                Add components from the Library tab first
              </Link>
            </div>
          )}

          {/* ── Plan items (sortable) ── */}
          {isEditing && items.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i => i.localId)} strategy={verticalListSortingStrategy}>
                <ul className="mx-4 bg-bg-card rounded-2xl overflow-hidden border border-bg-border">
                  {items.map(item => (
                    <SortablePlanItem
                      key={item.localId}
                      item={item}
                      onRemove={handleRemove}
                      onPhotoTap={photos => setLightbox({ photos })}
                      onRowTap={i => setActiveSheet(i)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* ── Save to Calendar button ── */}
          {isEditing && items.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={[
                  'w-full font-heading text-base py-4 rounded-xl min-h-[56px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
                  planDate
                    ? 'bg-bg-card border border-bg-border text-text-muted hover:border-accent-fire/40'
                    : 'bg-accent-fire text-white shadow-glow-fire',
                ].join(' ')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {planDate
                  ? `Saved · ${formatDisplayDate(planDate)} · Change Date`
                  : 'Save to Calendar'}
              </button>
            </div>
          )}

          {/* ── Start New Plan (shown below drafts when not editing) ── */}
          {!isEditing && drafts.length > 0 && (
            <div className="px-4 pt-2">
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-bg-border" />
                <span className="text-[11px] text-text-dim/50 font-heading uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-bg-border" />
              </div>
            </div>
          )}

          {/* ── Clear / Share links ── */}
          {isEditing && items.length > 0 && (
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
          planDate={planDate ?? todayIso}
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

      {/* Save to Calendar picker */}
      {showDatePicker && (
        <PlanCalendarSheet
          mode="save"
          todayIso={todayIso}
          currentPlanDate={planDate}
          datesWithPlans={datesWithPlans}
          onConfirmDate={async (date) => {
            setShowDatePicker(false)
            await handleSaveToDate(date)
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* View Calendar browser */}
      {showCalendar && (
        <PlanCalendarSheet
          mode="browse"
          todayIso={todayIso}
          currentPlanDate={planDate}
          datesWithPlans={datesWithPlans}
          onConfirmDate={(date) => handleLoadDate(date)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  )
}
