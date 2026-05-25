'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
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
  count,
  dimmed,
}: {
  label: string
  count: number
  dimmed: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
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
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontFamily: LF.body, fontSize: 11, color: LF.muted, flexShrink: 0 }}>
        {count}
      </span>
    </div>
  )
}

// ─── Mic icon ─────────────────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 14" fill="none" aria-hidden="true">
      <rect x="3" y="0" width="4" height="7" rx="2" fill={ACCENT} opacity="0.85" />
      <path
        d="M1 6.5a4 4 0 0 0 8 0"
        stroke={ACCENT}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="5" y1="10.5" x2="5" y2="13" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

// ─── Pin icon ─────────────────────────────────────────────────────────────────
function PinIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a6 6 0 0 1 6 6c0 5-6 13-6 13S6 13 6 8a6 6 0 0 1 6-6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8" r="2" stroke={color} strokeWidth="2" fill="none" />
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

  // ── Drag mode ────────────────────────────────────────────────────────────
  const [dragMode, setDragMode] = useState<DragMode | null>(null)
  const [dragTarget, setDragTarget] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ── AI split ─────────────────────────────────────────────────────────────
  const [splittingIndex, setSplittingIndex] = useState<number | null>(null)
  const [splitUndo, setSplitUndo] = useState<{ original: string; part1: string; part2: string } | null>(null)
  const splitUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  // ── Refs ─────────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const pointerMoved = useRef(false)
  const stepRowRefs = useRef<(HTMLDivElement | null)[]>([])
  const tipRowRefs = useRef<(HTMLDivElement | null)[]>([])

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

  // Cleanup split undo timer on unmount
  useEffect(() => {
    return () => {
      if (splitUndoTimer.current) clearTimeout(splitUndoTimer.current)
    }
  }, [])

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

  const deleteEditing = () => {
    if (editingSection === null || editingIndex === null) return
    const setter = editingSection === 'steps' ? setSteps : setTips
    setter((prev) => prev.filter((_, i) => i !== editingIndex))
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
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setActionSheetItem({ section, index })
    }, 500)
  }

  const onItemPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode !== null) return
    const dx = Math.abs(e.clientX - pointerDownPos.current.x)
    const dy = Math.abs(e.clientY - pointerDownPos.current.y)
    if (dx > 12 || dy > 12) {
      pointerMoved.current = true
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
        setDragTarget(null)
      }
      return
    }

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

  const computeTarget = (clientY: number, section: EditSection): number => {
    const refs = section === 'steps' ? stepRowRefs.current : tipRowRefs.current
    for (let i = 0; i < refs.length; i++) {
      const rect = refs[i]?.getBoundingClientRect()
      if (!rect) continue
      const midY = rect.top + rect.height / 2
      if (clientY < midY) return i
    }
    return refs.length
  }

  const enterDragMode = (section: EditSection, index: number) => {
    setActionSheetItem(null)
    setDragMode({ section, index })
    setDragTarget(index)
  }

  const onGripPointerDown = (e: React.PointerEvent<HTMLDivElement>, _index: number) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setIsDragging(true)
  }

  const onGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode || !isDragging) return
    const target = computeTarget(e.clientY, dragMode.section)
    setDragTarget(target)
  }

  const onGripPointerUp = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode) {
      setIsDragging(false)
      return
    }
    const fromIndex = dragMode.index
    const toIndex = dragTarget ?? fromIndex
    if (fromIndex !== toIndex) {
      const setter = dragMode.section === 'steps' ? setSteps : setTips
      setter((prev) => {
        const a = [...prev]
        const [removed] = a.splice(fromIndex, 1)
        a.splice(toIndex, 0, removed)
        return a
      })
    }
    setIsDragging(false)
    setDragMode(null)
    setDragTarget(null)
  }

  const exitDragMode = () => {
    setDragMode(null)
    setDragTarget(null)
    setIsDragging(false)
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
      if (splitUndoTimer.current) clearTimeout(splitUndoTimer.current)
      setSplitUndo({ original, part1, part2 })
      splitUndoTimer.current = setTimeout(() => setSplitUndo(null), 5000)
    } catch {
      toast.error('AI split failed — edit the step manually', 3500)
    } finally {
      setSplittingIndex(null)
    }
  }

  const undoSplit = () => {
    if (!splitUndo) return
    setSteps((prev) => {
      const a = [...prev]
      // Find part1 by value — immune to array shifts from concurrent moves/deletes
      const idx = a.indexOf(splitUndo.part1)
      if (idx !== -1 && a[idx + 1] === splitUndo.part2) {
        a.splice(idx, 2, splitUndo.original)
      }
      return a
    })
    if (splitUndoTimer.current) clearTimeout(splitUndoTimer.current)
    setSplitUndo(null)
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
  const subtitle = [curriculum, title].filter(Boolean).join(' · ')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      onPointerCancel={() => { if (isDragMode || isDragging) exitDragMode() }}
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

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 62,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 3,
          padding: '0 18px',
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

      {/* ── Back button ─────────────────────────────────────────────────── */}
      {onBack && (
        <button
          onClick={() => onBack?.({ steps, tips })}
          aria-label="Back"
          className="active:opacity-60 transition-opacity"
          style={{
            position: 'absolute',
            top: 70,
            left: 18,
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9,
          }}
        >
          <BackChevronIcon />
        </button>
      )}

      {/* ── Close button ────────────────────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="active:opacity-60 transition-opacity"
          style={{
            position: 'absolute',
            top: 70,
            right: 18,
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9,
          }}
        >
          <CloseXIcon />
        </button>
      )}

      {/* ── Fixed header ────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 72,
          left: 0,
          right: 0,
          padding: '0 20px',
          paddingLeft: onBack ? 56 : 20,
          paddingRight: onClose ? 56 : 20,
        }}
      >
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
        <div
          style={{
            fontFamily: LF.body,
            fontSize: 13,
            color: LF.muted,
            marginTop: 3,
            lineHeight: 1,
          }}
        >
          {isDragMode
            ? `${dragMode!.section === 'steps' ? 'Step' : 'Tip'} ${dragMode!.index + 1} — drag grip handle to move`
            : subtitle || ' '}
        </div>
        {!isDragMode && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 7,
            }}
          >
            <MicIcon />
            <span style={{ fontFamily: LF.body, fontSize: 12, color: LF.muted, lineHeight: 1 }}>
              Parsed from voice note
            </span>
          </div>
        )}
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
            count={validSteps.length}
            dimmed={isEditing && editingSection === 'tips'}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((step, index) => {
              const isThisEditing = editingSection === 'steps' && editingIndex === index
              const isThisDragSelected =
                isDragMode && dragMode!.section === 'steps' && dragMode!.index === index
              const showInsertAbove =
                isDragging &&
                dragTarget === index &&
                dragMode?.section === 'steps' &&
                dragTarget !== dragMode.index
              const isDimmed =
                (isEditing && editingSection === 'steps' && !isThisEditing) ||
                (isEditing && editingSection === 'tips')

              return (
                <Fragment key={index}>
                  {/* Insertion indicator line above this row */}
                  {showInsertAbove && (
                    <div style={{ height: 2, background: ACCENT, borderRadius: 1, margin: '0 12px' }} />
                  )}
                  <div
                    ref={(el) => {
                      stepRowRefs.current[index] = el
                    }}
                    onPointerDown={
                      isThisEditing ? undefined : (e) => onItemPointerDown(e, 'steps', index)
                    }
                    onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                    onPointerUp={
                      isThisEditing ? undefined : (e) => onItemPointerUp(e, 'steps', index)
                    }
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      ...LONG_PRESS_STYLE,
                      background: isThisEditing
                        ? 'rgba(255,90,31,0.08)'
                        : isThisDragSelected && isDragging
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
                      transform: isThisDragSelected && isDragging ? 'scale(1.015)' : 'none',
                      boxShadow: isThisDragSelected && isDragging ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                      position: 'relative',
                      zIndex: isThisDragSelected && isDragging ? 1 : 'auto',
                      transition: 'opacity 180ms, border-color 180ms, background 180ms',
                      cursor: isThisEditing
                        ? 'text'
                        : isDragMode && dragMode!.section === 'steps'
                        ? 'default'
                        : 'pointer',
                    }}
                  >
                    {/* Grip handle — only visible in drag mode for steps section */}
                    {isDragMode && dragMode!.section === 'steps' && (
                      <div
                        onPointerDown={(e) => onGripPointerDown(e, index)}
                        onPointerMove={onGripPointerMove}
                        onPointerUp={onGripPointerUp}
                        onPointerCancel={onGripPointerUp}
                        aria-label="Drag to reorder"
                        style={{
                          width: 28,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          flexShrink: 0,
                          touchAction: 'none',
                          opacity: isThisDragSelected ? 1 : 0.45,
                        }}
                      >
                        <GripIcon />
                      </div>
                    )}

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
                  </div>
                </Fragment>
              )
            })}
            {/* Insertion indicator at end of list */}
            {isDragging && dragMode?.section === 'steps' && dragTarget === steps.length && (
              <div style={{ height: 2, background: ACCENT, borderRadius: 1, margin: '0 12px' }} />
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
            count={validTips.length}
            dimmed={isEditing && editingSection === 'steps'}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tips.map((tip, index) => {
              const isThisEditing = editingSection === 'tips' && editingIndex === index
              const isThisDragSelected =
                isDragMode && dragMode!.section === 'tips' && dragMode!.index === index
              const showInsertAbove =
                isDragging &&
                dragTarget === index &&
                dragMode?.section === 'tips' &&
                dragTarget !== dragMode.index
              const isDimmed =
                (isEditing && editingSection === 'tips' && !isThisEditing) ||
                (isEditing && editingSection === 'steps')

              return (
                <Fragment key={index}>
                  {/* Insertion indicator line above this row */}
                  {showInsertAbove && (
                    <div style={{ height: 2, background: ACCENT, borderRadius: 1, margin: '0 12px' }} />
                  )}
                  <div
                    ref={(el) => {
                      tipRowRefs.current[index] = el
                    }}
                    onPointerDown={
                      isThisEditing ? undefined : (e) => onItemPointerDown(e, 'tips', index)
                    }
                    onPointerMove={isThisEditing ? undefined : onItemPointerMove}
                    onPointerUp={
                      isThisEditing ? undefined : (e) => onItemPointerUp(e, 'tips', index)
                    }
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      ...LONG_PRESS_STYLE,
                      background: isThisEditing
                        ? 'rgba(255,90,31,0.06)'
                        : isThisDragSelected && isDragging
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
                      transform: isThisDragSelected && isDragging ? 'scale(1.015)' : 'none',
                      boxShadow: isThisDragSelected && isDragging ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                      position: 'relative',
                      zIndex: isThisDragSelected && isDragging ? 1 : 'auto',
                      transition: 'opacity 180ms, border-color 180ms, background 180ms',
                      cursor: isThisEditing
                        ? 'text'
                        : isDragMode && dragMode!.section === 'tips'
                        ? 'default'
                        : 'pointer',
                    }}
                  >
                    {/* Grip handle — only visible in drag mode for tips section */}
                    {isDragMode && dragMode!.section === 'tips' && (
                      <div
                        onPointerDown={(e) => onGripPointerDown(e, index)}
                        onPointerMove={onGripPointerMove}
                        onPointerUp={onGripPointerUp}
                        onPointerCancel={onGripPointerUp}
                        aria-label="Drag to reorder"
                        style={{
                          width: 28,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'grab',
                          flexShrink: 0,
                          touchAction: 'none',
                          opacity: isThisDragSelected ? 1 : 0.45,
                        }}
                      >
                        <GripIcon />
                      </div>
                    )}

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
                      <PinIcon color={ACCENT} />
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
                  </div>
                </Fragment>
              )
            })}
            {/* Insertion indicator at end of list */}
            {isDragging && dragMode?.section === 'tips' && dragTarget === tips.length && (
              <div style={{ height: 2, background: ACCENT, borderRadius: 1, margin: '0 12px' }} />
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
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              fontFamily: LF.body,
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
            }}
          >
            Done moving
          </button>
        ) : isEditing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={cancelEdit}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                fontFamily: LF.body,
                fontSize: 15,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={deleteEditing}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 12,
                background: 'rgba(240,64,64,0.15)',
                border: '1px solid rgba(240,64,64,0.25)',
                fontFamily: LF.body,
                fontSize: 15,
                fontWeight: 600,
                color: '#f04040',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={commitEdit}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 12,
                background: ACCENT,
                border: 'none',
                fontFamily: LF.display,
                fontSize: 15,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                color: LF.bg,
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

      {/* ── Split undo toast (interactive — can't use useToast which is pointer-events-none) */}
      {splitUndo && (
        <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up">
          <div className="flex items-center justify-between gap-3 bg-bg-card border border-bg-border rounded-xl px-4 py-3 shadow-card">
            <span className="text-sm text-text-primary leading-snug">Split! Review the two steps.</span>
            <button
              onClick={undoSplit}
              className="text-sm font-bold text-accent-fire flex-shrink-0 active:opacity-60 transition-opacity"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* ── Action sheet ─────────────────────────────────────────────────── */}
      {actionSheetItem !== null && (() => {
        const { section, index } = actionSheetItem
        const items = section === 'steps' ? steps : tips
        const itemLabel = section === 'steps' ? 'Step' : 'Tip'

        const menuItems: MenuItem[] = [
          {
            icon: <span aria-hidden="true">⠿</span>,
            label: 'Move',
            onClick: () => enterDragMode(section, index),
            disabled: items.length <= 1,
          },
          ...(section === 'steps' ? [
            {
              icon: <span aria-hidden="true">⤧</span>,
              label: 'Split into two steps',
              onClick: () => doAiSplit(index),
              disabled: !steps[index]?.trim(),
            },
            {
              icon: <span aria-hidden="true">↕</span>,
              label: 'Merge with next',
              onClick: () => doMerge(index),
              disabled: index >= steps.length - 1,
            },
          ] : []),
          {
            icon: <span aria-hidden="true">✕</span>,
            label: `Delete ${itemLabel.toLowerCase()}`,
            onClick: () => doDelete(section, index),
            destructive: true,
          },
        ]

        return (
          <BottomSheet
            visible
            onClose={() => setActionSheetItem(null)}
          >
            <div className="px-5 pb-3 pt-1 border-b border-bg-border">
              <p
                className="text-xs text-text-dim leading-relaxed"
                style={{ fontStyle: section === 'tips' ? 'italic' : 'normal' }}
              >
                {itemLabel} {index + 1}:{' '}
                {items[index] || `Empty ${itemLabel.toLowerCase()}`}
              </p>
            </div>
            <MenuList items={menuItems} ariaLabel={`${itemLabel} actions`} />
          </BottomSheet>
        )
      })()}
    </div>
  )
}
