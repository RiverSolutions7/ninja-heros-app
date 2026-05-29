'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ACCENT, LF } from './atoms'
import BottomSheet from '@/app/components/ui/BottomSheet'
import MenuList, { type MenuItem } from '@/app/components/ui/MenuList'
import { useToast } from '@/app/components/ui/Toast'
import { LONG_PRESS_STYLE } from '@/app/hooks/useLongPress'

// ─── Animations ──────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes crSpin {
  to { transform: rotate(360deg); }
}
`

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  label,
  dimmed,
}: {
  label: string
  dimmed: boolean
}) {
  return (
    <div
      style={{
        padding: '0 2px',
        marginBottom: 8,
        opacity: dimmed ? 0.45 : 1,
        transition: 'opacity 180ms',
      }}
    >
      <span
        style={{
          fontFamily: LF.display,
          fontSize: 11,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: ACCENT,
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Lightbulb icon ───────────────────────────────────────────────────────────
function LightbulbIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 17h6M10 20h4M12 3a6 6 0 0 1 6 6c0 2.5-1.4 4.7-3.5 5.9V16H9.5v-1.1C7.4 13.7 6 11.5 6 9a6 6 0 0 1 6-6z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Back chevron icon ────────────────────────────────────────────────────────
function BackChevronIcon() {
  return (
    <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
      <path
        d="M7.5 1.5L1.5 8L7.5 14.5"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Close × icon ─────────────────────────────────────────────────────────────
function CloseXIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M1 1L13 13M13 1L1 13"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Grip icon ────────────────────────────────────────────────────────────────
function GripIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <rect y="0" width="16" height="2" rx="1" fill={ACCENT} opacity="0.7" />
      <rect y="5" width="16" height="2" rx="1" fill={ACCENT} opacity="0.7" />
      <rect y="10" width="16" height="2" rx="1" fill={ACCENT} opacity="0.7" />
    </svg>
  )
}

// ─── Inline spinner ───────────────────────────────────────────────────────────
function InlineSpinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: `2px solid rgba(255,90,31,0.20)`,
        borderTopColor: ACCENT,
        borderRadius: '50%',
        animation: 'crSpin 0.75s linear infinite',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  )
}

// ─── Sortable item wrapper ────────────────────────────────────────────────────
type UseSortableReturn = ReturnType<typeof useSortable>

function SortableItem({
  id,
  children,
}: {
  id: string
  children: (
    props: Pick<UseSortableReturn, 'setNodeRef' | 'listeners' | 'transform' | 'transition' | 'isDragging'>,
  ) => React.ReactNode
}) {
  const sortable = useSortable({ id })
  return <>{children(sortable)}</>
}

// ─── Types ────────────────────────────────────────────────────────────────────
type EditSection = 'steps' | 'tips'

interface ActionSheetItem {
  section: EditSection
  index: number
}

interface DragMode {
  section: EditSection
  index: number
}

interface CardReviewProps {
  initialSteps: string[]
  initialTips: string[]
  /** Component title shown in subtitle, e.g. "Obstacle Course" */
  title: string
  /** Curriculum name shown in subtitle, e.g. "Mini Ninjas" */
  curriculum: string
  onApprove: (data: { steps: string[]; tips: string[] }) => void
  onBack?: (state: { steps: string[]; tips: string[] }) => void
  onClose?: () => void
  /** 0-based card index. Default 1 (second of 2 cards). */
  cardIndex?: number
  /** Total cards in the deck. Default 2. */
  totalCards?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CardReview({
  initialSteps,
  initialTips,
  title,
  curriculum,
  onApprove,
  onBack,
  onClose,
  cardIndex = 1,
  totalCards = 2,
}: CardReviewProps) {
  // ── Content ──────────────────────────────────────────────────────────────
  const [steps, setSteps] = useState<string[]>(initialSteps)
  const [tips, setTips] = useState<string[]>(initialTips)

  // ── Inline edit ──────────────────────────────────────────────────────────
  const [editingSection, setEditingSection] = useState<EditSection | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  // ── Action sheet ─────────────────────────────────────────────────────────
  const [actionSheetItem, setActionSheetItem] = useState<ActionSheetItem | null>(null)
  const [pressedItem, setPressedItem] = useState<ActionSheetItem | null>(null)

  // ── Drag mode ────────────────────────────────────────────────────────────
  const [dragMode, setDragMode] = useState<DragMode | null>(null)

  // ── AI split ─────────────────────────────────────────────────────────────
  const [splittingIndex, setSplittingIndex] = useState<number | null>(null)
  const splitDataRef = useRef<{ original: string; part1: string; part2: string } | null>(null)
  const toast = useToast()

  // ── Refs ─────────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const pointerMoved = useRef(false)

  // ── dnd-kit sensors ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  // ── Effects ──────────────────────────────────────────────────────────────

  // Auto-focus input when edit mode starts
  useEffect(() => {
    if (editingIndex !== null) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [editingIndex, editingSection])

  // Auto-resize textarea height as edit text changes
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editingText])

  // ── Edit helpers ─────────────────────────────────────────────────────────

  const startEdit = (section: EditSection, index: number) => {
    setActionSheetItem(null)
    const items = section === 'steps' ? steps : tips
    setEditingSection(section)
    setEditingIndex(index)
    setEditingText(items[index] ?? '')
  }

  const commitEdit = () => {
    if (editingSection === null || editingIndex === null) return
    const trimmed = editingText.trim()
    const setter = editingSection === 'steps' ? setSteps : setTips
    if (trimmed) {
      setter((prev) => prev.map((v, i) => (i === editingIndex ? trimmed : v)))
    } else {
      setter((prev) => prev.filter((_, i) => i !== editingIndex))
    }
    setEditingSection(null)
    setEditingIndex(null)
    setEditingText('')
  }

  const cancelEdit = () => {
    // Remove blank items that were never filled in
    if (editingSection !== null && editingIndex !== null) {
      const items = editingSection === 'steps' ? steps : tips
      if (items[editingIndex] === '') {
        const setter = editingSection === 'steps' ? setSteps : setTips
        setter((prev) => prev.filter((_, i) => i !== editingIndex))
      }
    }
    setEditingSection(null)
    setEditingIndex(null)
    setEditingText('')
  }

  const addItem = (section: EditSection) => {
    const items = section === 'steps' ? steps : tips
    const newIndex = items.length
    const setter = section === 'steps' ? setSteps : setTips
    setter((prev) => [...prev, ''])
    setEditingSection(section)
    setEditingIndex(newIndex)
    setEditingText('')
  }

  // ── Long-press / tap detection ────────────────────────────────────────────

  const onItemPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    section: EditSection,
    index: number,
  ) => {
    // In drag mode: tapping the highlighted row will cancel it on pointer up
    if (dragMode !== null) return

    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    pointerMoved.current = false
    setPressedItem({ section, index })
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setPressedItem(null)
      setActionSheetItem({ section, index })
    }, 500)
  }

  const onItemPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode !== null) return
    const dx = Math.abs(e.clientX - pointerDownPos.current.x)
    const dy = Math.abs(e.clientY - pointerDownPos.current.y)
    if (dx > 12 || dy > 12) {
      pointerMoved.current = true
      setPressedItem(null)
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }

  const onItemPointerUp = (
    _e: React.PointerEvent<HTMLDivElement>,
    section: EditSection,
    index: number,
  ) => {
    // Drag mode: tap on the highlighted row → cancel drag mode without moving
    if (dragMode !== null) {
      if (dragMode.section === section && dragMode.index === index) {
        setDragMode(null)
      }
      return
    }

    setPressedItem(null)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      if (!pointerMoved.current) {
        startEdit(section, index)
      }
    }
    pointerMoved.current = false
  }

  // ── Drag helpers ──────────────────────────────────────────────────────────

  const enterDragMode = (section: EditSection, index: number) => {
    setActionSheetItem(null)
    setDragMode({ section, index })
  }

  const exitDragMode = () => {
    setDragMode(null)
  }

  const handleDragEnd = (section: EditSection) => ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const getIdx = (id: string) => parseInt(id.toString().split('-')[1])
      const setter = section === 'steps' ? setSteps : setTips
      setter((prev) =>
        arrayMove(prev, getIdx(active.id.toString()), getIdx(over.id.toString())),
      )
    }
    exitDragMode()
  }

  // ── Action sheet operations ───────────────────────────────────────────────

  const doAiSplit = async (index: number) => {
    setActionSheetItem(null)
    setSplittingIndex(index)
    try {
      const res = await fetch('/api/split-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: steps[index] }),
      })
      if (!res.ok) throw new Error(`api ${res.status}`)
      const { part1, part2 } = (await res.json()) as { part1: string; part2: string }
      const original = steps[index]
      setSteps((prev) => {
        const a = [...prev]
        a.splice(index, 1, part1, part2)
        return a
      })
      splitDataRef.current = { original, part1, part2 }
      toast.show('Split! Review the two steps.', 'info', 3000, {
        label: 'Undo',
        onClick: () => {
          const data = splitDataRef.current
          if (!data) return
          setSteps((prev) => {
            const a = [...prev]
            const idx = a.indexOf(data.part1)
            if (idx !== -1 && a[idx + 1] === data.part2) {
              a.splice(idx, 2, data.original)
            }
            return a
          })
          splitDataRef.current = null
        },
      })
    } catch {
      toast.error('AI split failed — edit the step manually', 3500)
    } finally {
      setSplittingIndex(null)
    }
  }

  const doMerge = (index: number) => {
    setSteps((prev) => {
      const a = [...prev]
      const merged = `${a[index]} ${a[index + 1]}`
      a.splice(index, 2, merged)
      return a
    })
    setActionSheetItem(null)
  }

  const doDelete = (section: EditSection, index: number) => {
    const setter = section === 'steps' ? setSteps : setTips
    setter((prev) => prev.filter((_, i) => i !== index))
    setActionSheetItem(null)
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isEditing = editingSection !== null && editingIndex !== null
  const isDragMode = dragMode !== null
  const validSteps = steps.filter((s) => s.trim())
  const validTips = tips.filter((t) => t.trim())
  const accentFaded = 'rgba(255,90,31,0.40)'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      onPointerCancel={() => { if (isDragMode) exitDragMode() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: LF.bg,
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <style>{ANIM_CSS}</style>

      {/* ── Header block ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9,
          background: LF.bg,
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            display: 'flex',
            gap: 3,
            padding: '0 18px',
            paddingTop: 60,
            marginBottom: 6,
          }}
        >
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i === cardIndex ? ACCENT : i < cardIndex ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.14)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Nav row + title inline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 18px 16px',
            gap: 12,
          }}
        >
          {/* Back button */}
          {onBack ? (
            <button
              onClick={() => onBack?.({ steps, tips })}
              aria-label="Back"
              className="active:opacity-70 transition-opacity"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BackChevronIcon />
            </button>
          ) : <div style={{ width: 44, height: 44, flexShrink: 0 }} />}

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: LF.body,
                fontSize: 22,
                fontWeight: 500,
                color: '#fff',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              {isDragMode ? 'Drag to reorder' : 'Review'}
            </div>
          </div>

          {/* Close button */}
          {onClose ? (
            <button
              onClick={onClose}
              aria-label="Close"
              className="active:opacity-70 transition-opacity"
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CloseXIcon />
            </button>
          ) : <div style={{ width: 44, height: 44, flexShrink: 0 }} />}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 0,
          right: 0,
          bottom: 90,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 18px 0',
          ...(isDragMode && { touchAction: 'none' }),
        }}
      >
        {/* ── SEQUENCE section ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <SectionHeader
            label="Sequence"
            dimmed={isEditing && editingSection === 'tips'}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isDragMode && dragMode!.section === 'steps' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd('steps')}
              >
                <SortableContext
                  items={steps.map((_, i) => `step-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {steps.map((step, index) => {
                    const isThisEditing = editingSection === 'steps' && editingIndex === index
                    const isThisDragSelected = dragMode!.index === index
                    const isDimmed =
                      (isEditing && editingSection === 'steps' && !isThisEditing) ||
                      (isEditing && editingSection === 'tips')

                    return (
                      <SortableItem key={`step-${index}`} id={`step-${index}`}>
                        {({ setNodeRef, listeners: dndListeners, transform, transition: dndTransition, isDragging: isActiveDragging }) => {
                          const dndTransformStr = CSS.Transform.toString(transform)
                          const scaleStr = isActiveDragging
                            ? 'scale(1.015)'
                            : pressedItem?.section === 'steps' && pressedItem?.index === index
                            ? 'scale(0.97)'
                            : null
                          const composedTransform = [dndTransformStr, scaleStr].filter(Boolean).join(' ') || undefined

                          return (
                            <div
                              ref={setNodeRef}
                              onPointerDown={isThisEditing ? undefined : (e) => onItemPointerDown(e, 'steps', index)}
                              onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                              onPointerUp={isThisEditing ? undefined : (e) => onItemPointerUp(e, 'steps', index)}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{
                                ...LONG_PRESS_STYLE,
                                background: isThisEditing
                                  ? 'rgba(255,90,31,0.08)'
                                  : isActiveDragging
                                  ? 'rgba(255,90,31,0.14)'
                                  : isThisDragSelected
                                  ? 'rgba(255,90,31,0.06)'
                                  : 'rgba(255,255,255,0.04)',
                                borderRadius: 14,
                                padding: '15px 16px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                border: isThisEditing ? `1px solid ${ACCENT}` : '1px solid transparent',
                                opacity: isDimmed ? 0.45 : 1,
                                transform: composedTransform,
                                boxShadow: isActiveDragging ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                                position: 'relative',
                                zIndex: isActiveDragging ? 100 : 'auto',
                                transition: dndTransition
                                  ? `${dndTransition}, opacity 180ms, border-color 180ms, background 180ms`
                                  : 'opacity 180ms, border-color 180ms, background 180ms, transform 150ms ease-out',
                                cursor: isThisEditing ? 'text' : 'default',
                              }}
                            >
                              {/* Grip handle */}
                              <div
                                {...dndListeners}
                                aria-label="Drag to reorder"
                                style={{
                                  width: 28,
                                  height: 30,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: isActiveDragging ? 'grabbing' : 'grab',
                                  flexShrink: 0,
                                  touchAction: 'none',
                                  opacity: isThisDragSelected ? 1 : 0.45,
                                }}
                              >
                                <GripIcon />
                              </div>

                              {/* Step badge — orange pill */}
                              <div
                                style={{
                                  width: 20,
                                  height: 22,
                                  borderRadius: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontFamily: LF.display,
                                  fontSize: 12,
                                  fontWeight: 900,
                                  flexShrink: 0,
                                  background: isThisEditing ? ACCENT : 'rgba(255,90,31,0.90)',
                                  color: '#fff',
                                }}
                              >
                                {index + 1}
                              </div>

                              {/* Text / spinner / textarea */}
                              {splittingIndex === index ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flex: 1,
                                    paddingTop: 5,
                                    fontFamily: LF.body,
                                    fontSize: 14,
                                    color: LF.muted,
                                    fontStyle: 'italic',
                                  }}
                                >
                                  <InlineSpinner />
                                  Splitting…
                                </div>
                              ) : isThisEditing ? (
                                <textarea
                                  ref={inputRef}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  placeholder="Describe this step…"
                                  rows={1}
                                  style={{
                                    fontFamily: LF.body,
                                    fontSize: 15,
                                    fontWeight: 500,
                                    color: '#fff',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    flex: 1,
                                    paddingTop: 3,
                                    lineHeight: 1.45,
                                    resize: 'none',
                                    overflow: 'hidden',
                                    minHeight: 24,
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontFamily: LF.body,
                                    fontSize: 15,
                                    fontWeight: 500,
                                    color: step.trim() ? 'rgba(255,255,255,0.92)' : LF.muted,
                                    fontStyle: step.trim() ? 'normal' : 'italic',
                                    flex: 1,
                                    paddingTop: 3,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {step || 'Empty step'}
                                </span>
                              )}
                              {isThisEditing && (
                                <button
                                  aria-label="Step actions"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); setActionSheetItem({ section: 'steps', index }) }}
                                  className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center bg-transparent text-accent-fire text-base leading-none border-0 cursor-pointer active:opacity-70 transition-opacity"
                                >
                                  ⋯
                                </button>
                              )}
                            </div>
                          )
                        }}
                      </SortableItem>
                    )
                  })}
                </SortableContext>
              </DndContext>
            ) : (
              steps.map((step, index) => {
                const isThisEditing = editingSection === 'steps' && editingIndex === index
                const isDimmed =
                  (isEditing && editingSection === 'steps' && !isThisEditing) ||
                  (isEditing && editingSection === 'tips')

                return (
                  <div
                    key={index}
                    onPointerDown={isThisEditing ? undefined : (e) => onItemPointerDown(e, 'steps', index)}
                    onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                    onPointerUp={isThisEditing ? undefined : (e) => onItemPointerUp(e, 'steps', index)}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      ...LONG_PRESS_STYLE,
                      background: isThisEditing ? 'rgba(255,90,31,0.08)' : 'rgba(255,255,255,0.04)',
                      borderRadius: 14,
                      padding: '15px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      border: isThisEditing ? `1px solid ${ACCENT}` : '1px solid transparent',
                      opacity: isDimmed ? 0.45 : 1,
                      transform: pressedItem?.section === 'steps' && pressedItem?.index === index
                        ? 'scale(0.97)'
                        : 'scale(1)',
                      boxShadow: 'none',
                      position: 'relative',
                      transition: 'opacity 180ms, border-color 180ms, background 180ms, transform 150ms ease-out',
                      cursor: isThisEditing ? 'text' : 'pointer',
                    }}
                  >
                    {/* Step badge — orange pill */}
                    <div
                      style={{
                        width: 20,
                        height: 22,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: LF.display,
                        fontSize: 12,
                        fontWeight: 900,
                        flexShrink: 0,
                        background: isThisEditing ? ACCENT : 'rgba(255,90,31,0.90)',
                        color: '#fff',
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Text / spinner / textarea */}
                    {splittingIndex === index ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flex: 1,
                          paddingTop: 5,
                          fontFamily: LF.body,
                          fontSize: 14,
                          color: LF.muted,
                          fontStyle: 'italic',
                        }}
                      >
                        <InlineSpinner />
                        Splitting…
                      </div>
                    ) : isThisEditing ? (
                      <textarea
                        ref={inputRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        placeholder="Describe this step…"
                        rows={1}
                        style={{
                          fontFamily: LF.body,
                          fontSize: 15,
                          fontWeight: 500,
                          color: '#fff',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          paddingTop: 3,
                          lineHeight: 1.45,
                          resize: 'none',
                          overflow: 'hidden',
                          minHeight: 24,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: LF.body,
                          fontSize: 15,
                          fontWeight: 500,
                          color: step.trim() ? 'rgba(255,255,255,0.92)' : LF.muted,
                          fontStyle: step.trim() ? 'normal' : 'italic',
                          flex: 1,
                          paddingTop: 3,
                          lineHeight: 1.45,
                        }}
                      >
                        {step || 'Empty step'}
                      </span>
                    )}
                    {isThisEditing && (
                      <button
                        aria-label="Step actions"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setActionSheetItem({ section: 'steps', index }) }}
                        className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center bg-transparent text-accent-fire text-base leading-none border-0 cursor-pointer active:opacity-70 transition-opacity"
                      >
                        ⋯
                      </button>
                    )}
                  </div>
                )
              })
            )}

            {/* ADD STEP button — hidden during edit or drag */}
            {!isEditing && !isDragMode && (
              <button
                onClick={() => addItem('steps')}
                style={{
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: `1.5px dashed ${accentFaded}`,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    color: ACCENT,
                    fontSize: 18,
                    lineHeight: 1,
                    fontFamily: 'system-ui',
                    fontWeight: 400,
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    fontFamily: LF.display,
                    fontSize: 13,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: ACCENT,
                  }}
                >
                  ADD STEP
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── COACH TIPS section ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <SectionHeader
            label="Coach Tips"
            dimmed={isEditing && editingSection === 'steps'}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isDragMode && dragMode!.section === 'tips' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd('tips')}
              >
                <SortableContext
                  items={tips.map((_, i) => `tip-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {tips.map((tip, index) => {
                    const isThisEditing = editingSection === 'tips' && editingIndex === index
                    const isThisDragSelected = dragMode!.index === index
                    const isDimmed =
                      (isEditing && editingSection === 'tips' && !isThisEditing) ||
                      (isEditing && editingSection === 'steps')

                    return (
                      <SortableItem key={`tip-${index}`} id={`tip-${index}`}>
                        {({ setNodeRef, listeners: dndListeners, transform, transition: dndTransition, isDragging: isActiveDragging }) => {
                          const dndTransformStr = CSS.Transform.toString(transform)
                          const scaleStr = isActiveDragging
                            ? 'scale(1.015)'
                            : pressedItem?.section === 'tips' && pressedItem?.index === index
                            ? 'scale(0.97)'
                            : null
                          const composedTransform = [dndTransformStr, scaleStr].filter(Boolean).join(' ') || undefined

                          return (
                            <div
                              ref={setNodeRef}
                              onPointerDown={isThisEditing ? undefined : (e) => onItemPointerDown(e, 'tips', index)}
                              onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                              onPointerUp={isThisEditing ? undefined : (e) => onItemPointerUp(e, 'tips', index)}
                              onContextMenu={(e) => e.preventDefault()}
                              style={{
                                ...LONG_PRESS_STYLE,
                                background: isThisEditing
                                  ? 'rgba(255,90,31,0.06)'
                                  : isActiveDragging
                                  ? 'rgba(255,90,31,0.14)'
                                  : isThisDragSelected
                                  ? 'rgba(255,90,31,0.06)'
                                  : 'rgba(255,255,255,0.025)',
                                borderRadius: 14,
                                padding: 16,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                border: isThisEditing ? `1px solid ${ACCENT}` : '1px solid transparent',
                                opacity: isDimmed ? 0.45 : 1,
                                transform: composedTransform,
                                boxShadow: isActiveDragging ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                                position: 'relative',
                                zIndex: isActiveDragging ? 100 : 'auto',
                                transition: dndTransition
                                  ? `${dndTransition}, opacity 180ms, border-color 180ms, background 180ms`
                                  : 'opacity 180ms, border-color 180ms, background 180ms, transform 150ms ease-out',
                                cursor: isThisEditing ? 'text' : 'default',
                              }}
                            >
                              {/* Grip handle */}
                              <div
                                {...dndListeners}
                                aria-label="Drag to reorder"
                                style={{
                                  width: 28,
                                  height: 30,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: isActiveDragging ? 'grabbing' : 'grab',
                                  flexShrink: 0,
                                  touchAction: 'none',
                                  opacity: isThisDragSelected ? 1 : 0.45,
                                }}
                              >
                                <GripIcon />
                              </div>

                              {/* Pin icon container */}
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  background: isThisEditing
                                    ? 'rgba(255,90,31,0.20)'
                                    : 'rgba(255,90,31,0.12)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <LightbulbIcon color={ACCENT} />
                              </div>

                              {/* Text / textarea */}
                              {isThisEditing ? (
                                <textarea
                                  ref={inputRef}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  placeholder="Coach tip…"
                                  rows={1}
                                  style={{
                                    fontFamily: LF.body,
                                    fontSize: 15,
                                    fontWeight: 400,
                                    fontStyle: 'italic',
                                    color: '#fff',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    flex: 1,
                                    paddingTop: 3,
                                    lineHeight: 1.45,
                                    resize: 'none',
                                    overflow: 'hidden',
                                    minHeight: 24,
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontFamily: LF.body,
                                    fontSize: 15,
                                    fontWeight: 400,
                                    fontStyle: 'italic',
                                    color: tip.trim() ? '#d6dbe6' : LF.muted,
                                    flex: 1,
                                    paddingTop: 3,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {tip || 'Empty tip'}
                                </span>
                              )}
                              {isThisEditing && (
                                <button
                                  aria-label="Tip actions"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); setActionSheetItem({ section: 'tips', index }) }}
                                  className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center bg-transparent text-accent-fire text-base leading-none border-0 cursor-pointer active:opacity-70 transition-opacity"
                                >
                                  ⋯
                                </button>
                              )}
                            </div>
                          )
                        }}
                      </SortableItem>
                    )
                  })}
                </SortableContext>
              </DndContext>
            ) : (
              tips.map((tip, index) => {
                const isThisEditing = editingSection === 'tips' && editingIndex === index
                const isDimmed =
                  (isEditing && editingSection === 'tips' && !isThisEditing) ||
                  (isEditing && editingSection === 'steps')

                return (
                  <div
                    key={index}
                    onPointerDown={isThisEditing ? undefined : (e) => onItemPointerDown(e, 'tips', index)}
                    onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                    onPointerUp={isThisEditing ? undefined : (e) => onItemPointerUp(e, 'tips', index)}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      ...LONG_PRESS_STYLE,
                      background: isThisEditing
                        ? 'rgba(255,90,31,0.06)'
                        : 'rgba(255,255,255,0.025)',
                      borderRadius: 14,
                      padding: 16,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      border: isThisEditing ? `1px solid ${ACCENT}` : '1px solid transparent',
                      opacity: isDimmed ? 0.45 : 1,
                      transform: pressedItem?.section === 'tips' && pressedItem?.index === index
                        ? 'scale(0.97)'
                        : 'scale(1)',
                      boxShadow: 'none',
                      position: 'relative',
                      transition: 'opacity 180ms, border-color 180ms, background 180ms, transform 150ms ease-out',
                      cursor: isThisEditing ? 'text' : 'pointer',
                    }}
                  >
                    {/* Pin icon container */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: isThisEditing
                          ? 'rgba(255,90,31,0.20)'
                          : 'rgba(255,90,31,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <LightbulbIcon color={ACCENT} />
                    </div>

                    {/* Text / textarea */}
                    {isThisEditing ? (
                      <textarea
                        ref={inputRef}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        placeholder="Coach tip…"
                        rows={1}
                        style={{
                          fontFamily: LF.body,
                          fontSize: 15,
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: '#fff',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          paddingTop: 3,
                          lineHeight: 1.45,
                          resize: 'none',
                          overflow: 'hidden',
                          minHeight: 24,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: LF.body,
                          fontSize: 15,
                          fontWeight: 400,
                          fontStyle: 'italic',
                          color: tip.trim() ? '#d6dbe6' : LF.muted,
                          flex: 1,
                          paddingTop: 3,
                          lineHeight: 1.45,
                        }}
                      >
                        {tip || 'Empty tip'}
                      </span>
                    )}
                    {isThisEditing && (
                      <button
                        aria-label="Tip actions"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setActionSheetItem({ section: 'tips', index }) }}
                        className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center bg-transparent text-accent-fire text-base leading-none border-0 cursor-pointer active:opacity-70 transition-opacity"
                      >
                        ⋯
                      </button>
                    )}
                  </div>
                )
              })
            )}

            {/* ADD TIP button — hidden during edit or drag */}
            {!isEditing && !isDragMode && (
              <button
                onClick={() => addItem('tips')}
                style={{
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: `1.5px dashed ${accentFaded}`,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    color: ACCENT,
                    fontSize: 18,
                    lineHeight: 1,
                    fontFamily: 'system-ui',
                    fontWeight: 400,
                  }}
                >
                  +
                </span>
                <span
                  style={{
                    fontFamily: LF.display,
                    fontSize: 13,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: ACCENT,
                  }}
                >
                  ADD TIP
                </span>
              </button>
            )}
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 18px max(12px, env(safe-area-inset-bottom))',
          background: `linear-gradient(180deg, rgba(8,12,26,0) 0%, ${LF.bg} 32%)`,
          zIndex: 8,
        }}
      >
        {isDragMode ? (
          <button
            onClick={exitDragMode}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 14,
              background: 'transparent',
              border: '1.5px solid rgba(255,90,31,0.60)',
              fontFamily: LF.body,
              fontSize: 16,
              fontWeight: 600,
              color: ACCENT,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        ) : isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={cancelEdit}
              style={{
                flexShrink: 0,
                width: 90,
                height: 54,
                background: 'none',
                border: 'none',
                fontFamily: LF.body,
                fontSize: 16,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={commitEdit}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                background: ACCENT,
                border: 'none',
                fontFamily: LF.body,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(255,90,31,0.35)',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <button
            onClick={() => onApprove({ steps: validSteps, tips: validTips })}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 12,
              background: ACCENT,
              border: 'none',
              fontFamily: LF.display,
              fontSize: 16,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: LF.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              paddingTop: 2,
            }}
          >
            APPROVE & SAVE
            <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <path
                d="M2 9h18M14 2l7 7-7 7"
                stroke={LF.bg}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Action sheet ─────────────────────────────────────────────────── */}
      {actionSheetItem !== null && (() => {
        const { section, index } = actionSheetItem
        const items = section === 'steps' ? steps : tips
        const itemLabel = section === 'steps' ? 'Step' : 'Tip'

        const menuItems: MenuItem[] = [
          {
            icon: (
              <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20" aria-hidden="true">
                <circle cx="5.5" cy="3.5" r="1.5"/><circle cx="10.5" cy="3.5" r="1.5"/>
                <circle cx="5.5" cy="8" r="1.5"/><circle cx="10.5" cy="8" r="1.5"/>
                <circle cx="5.5" cy="12.5" r="1.5"/><circle cx="10.5" cy="12.5" r="1.5"/>
              </svg>
            ),
            label: 'Move',
            onClick: () => enterDragMode(section, index),
            disabled: items.length <= 1,
          },
          ...(section === 'steps' ? [
            {
              icon: (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
                  <circle cx="4" cy="4" r="2"/><circle cx="4" cy="12" r="2"/>
                  <line x1="5.8" y1="4.8" x2="14" y2="12"/><line x1="14" y1="4" x2="9" y2="8.5"/>
                </svg>
              ),
              label: 'Split into two steps',
              onClick: () => doAiSplit(index),
              disabled: !steps[index]?.trim(),
            },
            {
              icon: (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
                  <path d="M3 2L8 8L13 2"/><line x1="8" y1="8" x2="8" y2="14"/>
                </svg>
              ),
              label: 'Merge with next',
              onClick: () => doMerge(index),
              disabled: index >= steps.length - 1,
            },
          ] : []),
          {
            icon: (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
                <path d="M2 4h12"/><path d="M5 4V2.5h6V4"/><path d="M3 4l1 9.5h8L13 4"/>
                <line x1="6.5" y1="7" x2="6.5" y2="11"/><line x1="9.5" y1="7" x2="9.5" y2="11"/>
              </svg>
            ),
            label: `Delete ${itemLabel.toLowerCase()}`,
            onClick: () => doDelete(section, index),
            destructive: true,
            dividerAbove: true,
          },
        ]

        return (
          <BottomSheet
            visible
            onClose={() => setActionSheetItem(null)}
          >
            <MenuList items={menuItems} ariaLabel={`${itemLabel} actions`} />
            <div className="px-4 pt-2 pb-6">
              <button
                type="button"
                onClick={() => setActionSheetItem(null)}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-text-primary active:opacity-70 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                Cancel
              </button>
            </div>
          </BottomSheet>
        )
      })()}
    </div>
  )
}
