// @design-locked — built from design-export/capture/frames/8e-notes-expanded.html (reading) and
// 8e-edit-notes-editing.html (editing + the frosted anchored menu). The full expanded editorial
// notes screen: a DELIBERATELY-cropped 236px photo band (the expanded state's job is READING — all
// steps + cues stay above the fold), eyebrow, title, editorial step rows (hairline Inter-200 numerals
// in a 32px left column), the warm "Coach's cues" callout, and the skills micro-pill footer. Every
// color/size/radius/opacity/spacing here is copied from those frames.
//
// FREEZE LAW (build-token amendment): the per-row ⋯ menu is the ONLY frosted surface here. Its blur is
// STATIC — the menu container animates transform+opacity ONLY (scale-in ~150ms, whisper of overshoot);
// its backdrop-filter is never in a keyframe. Nothing else animates over a backdrop-filter.
//
// ARRIVAL MOTION IS UNAUTHORED: motion-dc.js ships no glimpse→expand rig. This uses a quick
// fade + body slide-up (settle language borrowed from the develop cascade) → FLAGGED for River.
// The bottom dock is SOLID lit-navy (not the frame's frosted glass) — the same deliberate divergence
// as Capture's DevelopDock (it is the same animatable dock; chunk 5's save morph fades it).
//
// Edits mutate the developed result in flow state (via onChange) — the single source chunk 5 saves.
// polish-audit: flag only a11y / tap-targets / state / motion / bugs — not the design values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DevelopResult } from './DevelopedCard'

const INTER = 'var(--font-inter), sans-serif'
const ACCENT = 'rgb(255,90,31)'
const TEXT = 'rgb(231,238,250)'
const NUMERAL = 'rgb(91,107,134)'
const CARET = 'rgb(42,107,219)'

export interface NotesDocProps {
  photoUrl: string
  /** Type + ages eyebrow (uppercased). NEVER duration. Static until the type/age sheet (chunk 6). */
  eyebrow: string
  data: DevelopResult
  /** Every edit emits the full mutated result up to flow state (chunk 5 saves it). */
  onChange: (next: DevelopResult) => void
  /** Back to the developed glimpse (edits already live in flow state — nothing is lost). */
  onBack: () => void
  /** "↺ try again" — re-record the voice note (returns to capture). */
  onTryAgain: () => void
  /** "Save to library" — launches the save morph (chunk 5 stub for now). */
  onSave: () => void
  /** Header chip tap → open the TypeAgeSheet (chunk 6). */
  onEditTypeAge?: () => void
}

interface StepItem {
  id: string
  text: string
}

function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// CHUNK 11 ②+④ (River, 2026-07-11): inline editors auto-grow to show the WHOLE text — no clip, no
// inner scroll. Reset to auto first (so it can SHRINK when text is deleted), then lock to scrollHeight.
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// ── glyphs ───────────────────────────────────────────────────────────────────────────────────────
function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TypeChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 8 5" fill="none" aria-hidden="true">
      <path d="M1 1l3 3 3-3" stroke="#9fb0c8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Custom line glyphs for the menu rows (per the chunk-4 menu spec: trailing merge symbol · trash,
// trash red like its label). Not authored in the sliced frame — see report note.
function MergeGlyph({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2.5v2.2c0 1.6 1.5 2.3 4 4.1M12 2.5v2.2c0 1.6-1.5 2.3-4 4.1" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8.8v4.7M6 11.6 8 13.6l2-2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashGlyph({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.3h10M6.3 4.3V3.2c0-.5.4-.9.9-.9h1.6c.5 0 .9.4.9.9v1.1M4.4 4.3l.6 8.1c0 .6.5 1.1 1.1 1.1h3.8c.6 0 1.1-.5 1.1-1.1l.6-8.1M6.7 6.7v4.4M9.3 6.7v4.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── anchored M3 menu (frosted, STATIC blur; scales in from the ⋯) ──────────────────────────────────
function StepRowMenu({
  stepIndex,
  isLast,
  triggerRef,
  onMerge,
  onDelete,
  onClose,
}: {
  stepIndex: number
  isLast: boolean
  /** The invoking ⋯ button — excluded from outside-close (so a second tap toggles it shut via the
   *  button's own handler, not a reopen race) and refocused when the menu closes. */
  triggerRef: RefObject<HTMLButtonElement>
  onMerge: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const firstItemRef = useRef<HTMLButtonElement | null>(null)
  const MENU_W = 180

  // CHUNK 10 gate-B (item ⑥): position FIXED from the trigger's viewport rect, not absolute inside the
  // row. The doc body now scrolls (overflowY:auto), and an absolute menu would be clipped by that scroll
  // box near the bottom; fixed escapes it. Scroll is locked while the menu is open (the row can't move),
  // so a single measurement stays valid. Right-aligned to the ⋯ button's right edge (mirrors the old
  // `right:0`); opens downward 6px below it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    setPos({ top: Math.round(r.bottom + 6), left: Math.round(r.right - MENU_W) })
  }, [triggerRef])

  // Scale-in from the ⋯ (transform-origin: right top): ~150ms with a whisper of overshoot. Reduced
  // motion → a plain crossfade. Backdrop-filter is NEVER animated — only transform/opacity.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease', fill: 'backwards' })
    } else {
      el.animate(
        [
          { opacity: 0, transform: 'scale(0.82)' },
          { opacity: 1, transform: 'scale(1.02)', offset: 0.7 },
          { opacity: 1, transform: 'scale(1)' },
        ],
        { duration: 150, easing: 'cubic-bezier(0.34,1.5,0.64,1)', fill: 'backwards' },
      )
    }
  }, [])

  // Focus into the menu; Escape closes; ArrowUp/Down + Tab stay trapped between the two items;
  // outside pointer closes. The invoking ⋯ is EXCLUDED from the outside-check so a second tap on it
  // toggles the menu shut via the button's own handler (no close→reopen race). Focus returns to the
  // ⋯ on any close.
  useEffect(() => {
    const menuNode = ref.current
    firstItemRef.current?.focus()
    const items = () => (menuNode ? (Array.from(menuNode.querySelectorAll('[role="menuitem"]')) as HTMLElement[]) : [])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab') {
        const list = items()
        if (!list.length) return
        e.preventDefault()
        const cur = list.indexOf(document.activeElement as HTMLElement)
        const dir = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1
        const nextIdx = (cur + dir + list.length) % list.length
        list[nextIdx].focus()
      }
    }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current && ref.current.contains(t)) return
      if (triggerRef.current && triggerRef.current.contains(t)) return
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onPointer, true)
      // Restore focus to the invoking ⋯ only if focus is still inside the menu (keyboard/Escape close)
      // or nowhere — never yank it back if the user tapped another control (e.g. started an edit).
      const active = document.activeElement
      if (triggerRef.current && (active === document.body || active === null || (menuNode && menuNode.contains(active)))) {
        triggerRef.current.focus()
      }
    }
  }, [onClose, triggerRef])

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    height: 44,
    padding: '0px 16px',
    width: '100%',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: INTER,
    fontWeight: 600,
    fontSize: 14,
  }

  // PORTALED to document.body (chunk 10 item ⑥): the doc body is now a SCROLL container and its
  // (unauthored) arrival animation briefly holds a transform — either would hijack a nested menu
  // (overflow clips it; a transformed ancestor rebases position:fixed). From the body it anchors to
  // the trigger's true viewport rect always. Scroll is LOCKED while open, so one measurement holds.
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Step ${stepIndex + 1} options`}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? 'visible' : 'hidden',
        width: MENU_W,
        borderRadius: 13,
        background: 'rgba(26,34,56,0.72)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: 'rgba(0,0,0,0.5) 0px 12px 32px',
        overflow: 'hidden',
        transformOrigin: 'right top',
        zIndex: 400,
      }}
    >
      <button
        ref={firstItemRef}
        type="button"
        role="menuitem"
        aria-disabled={isLast}
        onClick={() => { if (!isLast) onMerge() }}
        style={{ ...rowStyle, color: isLast ? 'rgba(242,245,251,0.35)' : 'rgb(242,245,251)', cursor: isLast ? 'default' : 'pointer' }}
      >
        <span>Merge with next</span>
        <MergeGlyph color={isLast ? 'rgba(159,176,200,0.35)' : 'rgb(159,176,200)'} />
      </button>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        style={{ ...rowStyle, color: 'rgb(255,107,106)' }}
      >
        <span>Delete</span>
        <TrashGlyph color="rgb(255,107,106)" />
      </button>
    </div>,
    document.body,
  )
}

// ── one editorial step row (sortable; tap-to-edit; per-row ⋯) ──────────────────────────────────────
function StepRow({
  item,
  index,
  isLast,
  editing,
  menuOpen,
  menuActive,
  dimmed,
  onStartEdit,
  onCommit,
  onOpenMenu,
  onCloseMenu,
  onMerge,
  onDelete,
}: {
  item: StepItem
  index: number
  isLast: boolean
  editing: boolean
  menuOpen: boolean
  /** True while ANY row's menu is open — bystander rows go inert (no drag, no tap-through). */
  menuActive: boolean
  dimmed: boolean
  onStartEdit: () => void
  onCommit: (text: string) => void
  onOpenMenu: () => void
  onCloseMenu: () => void
  onMerge: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    // Disable the drag sensor while this row is edited, OR while any menu is open anywhere (so a
    // dimmed bystander row can't be dragged out from under an open menu).
    disabled: editing || menuActive,
  })
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const optionsRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current
      autoGrow(el) // size to the full text before focusing so nothing is clipped on entry
      el.focus()
      // caret to end (frame shows the caret after the text, not a select-all)
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [editing])

  const commit = (raw: string) => {
    const t = raw.trim()
    // empty commit = unchanged (deleting a step is the menu's job, not an empty field)
    onCommit(t.length ? t : item.text)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        alignItems: 'center',
        fontFamily: INTER,
        fontWeight: 400,
        fontSize: 14.5,
        lineHeight: 1.4,
        color: menuOpen ? 'rgb(255,255,255)' : TEXT,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: dimmed ? 0.5 : 1,
        zIndex: isDragging ? 40 : menuOpen ? 20 : 1,
        boxShadow: isDragging ? 'rgba(0,0,0,0.55) 0px 14px 30px' : 'none',
        background: isDragging ? 'rgb(17,26,48)' : 'transparent',
        borderRadius: isDragging ? 10 : 0,
        // Only lock touch-action once the reorder is actually active — at rest the row must let the doc
        // scroll (item ⑥). TouchSensor's long-press owns the reorder gesture; preventDefault stops any
        // residual scroll during the drag.
        touchAction: isDragging ? 'none' : undefined,
        // iOS long-press hygiene (chunk 10 polish): the 220ms drag hold must not start a text
        // selection / callout — either would hijack the reorder mid-hold. (Editing uses a real
        // <input>, which keeps its own selection behavior.)
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // Bystander rows (a menu is open on a DIFFERENT row) are dimmed AND inert — no tap-through to
        // their edit/⋯; the invoked row and any editing row stay live.
        pointerEvents: dimmed ? 'none' : undefined,
      }}
      {...attributes}
      {...(editing || menuActive ? {} : listeners)}
    >
      <span aria-hidden="true" style={{ fontWeight: 200, fontSize: 22, lineHeight: 1, color: NUMERAL }}>{index + 1}</span>

      {editing ? (
        // CHUNK 11 ②+④: a full-width AUTO-GROWING textarea (was a fit-content <input> that clipped long
        // steps). It shows the ENTIRE sentence, grows the row as it wraps, and never inner-scrolls. The
        // authored hairline-underline inline-quiet look is kept. Enter commits; Shift+Enter inserts a
        // newline (the sensible iOS choice — a hardware/BT keyboard can still force a line break, and the
        // on-screen return key commits, which is what a coach expects from a single instruction field).
        <textarea
          ref={inputRef}
          defaultValue={item.text}
          rows={1}
          aria-label={`Edit step ${index + 1}`}
          onInput={(e) => autoGrow(e.currentTarget)}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
            else if (e.key === 'Escape') { e.preventDefault(); onCommit(item.text) }
          }}
          style={{
            width: '100%',
            display: 'block',
            resize: 'none',
            overflow: 'hidden',
            border: 'none',
            borderBottom: '1px solid rgb(58,77,119)',
            paddingBottom: 3,
            background: 'transparent',
            outline: 'none',
            fontFamily: INTER,
            fontWeight: 400,
            fontSize: 14.5,
            lineHeight: 1.4,
            color: 'rgb(255,255,255)',
            caretColor: CARET,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          style={{
            justifySelf: 'start',
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            // Invisible hit-slop → ≥44px tap height (content ~20px + 12px×2). Negative margin cancels
            // the padding so the visible text keeps the frame's row rhythm — not a design value.
            padding: '12px 0',
            margin: '-12px 0',
            cursor: 'text',
            fontFamily: INTER,
            fontWeight: 400,
            fontSize: 14.5,
            lineHeight: 1.4,
            color: 'inherit',
            // CHUNK 11 ②+④: preserve any Shift+Enter newline the coach typed (default CSS would collapse
            // it to a space the moment editing ends). Normal single-line steps are visually unchanged.
            whiteSpace: 'pre-wrap',
          }}
        >
          {item.text}
        </button>
      )}

      <button
        ref={optionsRef}
        type="button"
        aria-label={`Step ${index + 1} options`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); menuOpen ? onCloseMenu() : onOpenMenu() }}
        style={{
          justifySelf: 'end',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
          margin: '-11px -6px -11px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 17,
          lineHeight: 1,
          letterSpacing: '1px',
          color: menuOpen ? TEXT : 'rgb(143,160,189)',
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {menuOpen && (
        <StepRowMenu
          stepIndex={index}
          isLast={isLast}
          triggerRef={optionsRef}
          onMerge={onMerge}
          onDelete={onDelete}
          onClose={onCloseMenu}
        />
      )}
    </div>
  )
}

// ── the develop-state dock (solid lit-navy divergence — see header note) ───────────────────────────
function Dock({ onTryAgain, onSave }: { onTryAgain: () => void; onSave: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 46,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        height: 52,
        padding: '0px 6px 0px 18px',
        borderRadius: 26,
        background: 'rgb(12,19,34)',
        boxShadow: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
        zIndex: 5,
      }}
    >
      <button
        type="button"
        onClick={onTryAgain}
        aria-label="Try again — re-record the voice note"
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, border: 'none', background: 'transparent', padding: '0 6px', margin: '0 -6px', cursor: 'pointer', fontFamily: INTER, fontWeight: 500, fontSize: 13, color: 'rgb(159,176,200)' }}
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>↺</span>
        <span>try again</span>
      </button>
      <button
        type="button"
        onClick={onSave}
        aria-label="Save to library"
        className="transition-transform active:scale-[0.96]"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, padding: '0px 20px', borderRadius: 20, background: 'rgb(42,107,219)', fontFamily: INTER, fontWeight: 700, fontSize: 13.5, color: 'rgb(255,255,255)' }}>
          Save to library
        </span>
      </button>
    </div>
  )
}

let notesSeq = 0
const nextStepId = () => `st${(notesSeq++).toString(36)}`

export default function NotesDoc({ photoUrl, eyebrow, data, onChange, onBack, onTryAgain, onSave, onEditTypeAge }: NotesDocProps) {
  // NotesDoc owns step IDENTITY while mounted (dnd-kit needs stable ids across reorders). It re-inits
  // from flow state on mount (Capture unmounts it on collapse), and every mutation is pushed straight
  // up via emit() so flow state stays the single source of truth for chunk 5's save.
  const [items, setItems] = useState<StepItem[]>(() => data.setup_steps.map((text) => ({ id: nextStepId(), text })))
  const [cues, setCues] = useState(data.cues)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCues, setEditingCues] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  const bodyRef = useRef<HTMLDivElement | null>(null)
  const cuesInputRef = useRef<HTMLTextAreaElement | null>(null)

  const emit = useCallback(
    (nextItems: StepItem[], nextCues: string) => {
      onChange({ ...data, setup_steps: nextItems.map((i) => i.text), cues: nextCues })
    },
    [onChange, data],
  )

  // Arrival motion (UNAUTHORED — flagged): quick fade + body slide-up in the develop-cascade's
  // settle language; reduced motion degrades to a plain crossfade.
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    if (prefersReduced()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease', fill: 'backwards' })
    } else {
      el.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ],
        { duration: 240, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'backwards' },
      )
    }
  }, [])

  useEffect(() => {
    if (editingCues && cuesInputRef.current) {
      const el = cuesInputRef.current
      autoGrow(el) // full-text height before focus (chunk 11 ②) — a long cue never clips/inner-scrolls
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [editingCues])

  // CHUNK 10 gate-B (item ⑥): MouseSensor + TouchSensor(long-press) — NOT PointerSensor. The old
  // PointerSensor paired with `touchAction:'none'` on every row, which told the browser "no scrolling
  // starts here" — so a finger-drag over the steps did nothing (the second half of the dead-scroll bug,
  // alongside the body's overflow:hidden). TouchSensor's 220ms long-press distinguishes a reorder from
  // a scroll WITHOUT killing touch-action, so a quick swipe scrolls and a held press reorders (the same
  // no-cross-input-race pattern PhotoSheet uses). A quick tap still edits.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // NOTE: these mutators compute the next array from the current `items` closure (fresh at event
  // time) then setItems + emit OUTSIDE any updater. Calling emit()/onChange (a parent setState) from
  // inside a setItems updater would be a "setState while rendering the child" violation.
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    if (from < 0 || to < 0) return
    const next = arrayMove(items, from, to)
    setItems(next)
    emit(next, cues)
  }

  const commitStep = (id: string, text: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, text } : i))
    setItems(next)
    emit(next, cues)
    setEditingId(null)
  }

  const mergeStep = (id: string) => {
    const i = items.findIndex((s) => s.id === id)
    if (i < 0 || i >= items.length - 1) return
    const joined = `${items[i].text} ${items[i + 1].text}`.trim()
    const next = items.map((s, idx) => (idx === i ? { ...s, text: joined } : s)).filter((_, idx) => idx !== i + 1)
    setItems(next)
    emit(next, cues)
    setMenuId(null)
  }

  const deleteStep = (id: string) => {
    const next = items.filter((s) => s.id !== id)
    setItems(next)
    emit(next, cues)
    setMenuId(null)
    if (editingId === id) setEditingId(null)
  }

  const commitCues = (raw: string) => {
    const t = raw.trim()
    const nextCues = t.length ? t : cues // empty commit = unchanged
    setCues(nextCues)
    emit(items, nextCues)
    setEditingCues(false)
  }

  const menuActive = menuId !== null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgb(8,12,26)',
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        zIndex: 40,
      }}
    >
      {/* photo band — DELIBERATE 236px crop (reading state prioritizes the text below). Base fill
          rgb(20,28,50) covers the voice-only (no-photo) develop edge case, mirroring DevelopedCard. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 236, overflow: 'hidden', background: 'rgb(20,28,50)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Obstacle course station"
            style={{ display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: 236, objectFit: 'cover' }}
          />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110, background: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.9) 100%)', pointerEvents: 'none' }} />
      </div>

      {/* header — back · type/age chip (no Save; the dock owns the finish) */}
      <div style={{ position: 'absolute', top: 46, left: 0, right: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0px 20px', height: 40, zIndex: 3 }}>
        <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
          <button type="button" onClick={onBack} aria-label="Back to the card" style={{ minHeight: 44, minWidth: 44, margin: '-12px -14px', padding: '12px 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <BackChevron />
          </button>
        </div>
        <div style={{ justifySelf: 'center', display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onEditTypeAge}
            aria-haspopup="dialog"
            aria-label={`${eyebrow}. Change type and ages`}
            style={{ minHeight: 44, margin: '-12px -14px', padding: '12px 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: INTER, fontWeight: 600, fontSize: 15, letterSpacing: '-0.1px', color: TEXT }}>{eyebrow}</span>
            <TypeChevron />
          </button>
        </div>
        <div />
      </div>

      {/* doc body — inset 236 / 118, gap 18. CHUNK 10 gate-B (item ⑥): was `overflow:hidden` (the
          reading state assumed everything fit above the fold), which on a real device CLIPPED long docs
          and killed scrolling entirely. Now `overflowY:auto` so all steps + cues + skills scroll; while
          a row menu is open scroll LOCKS (overflowY:hidden preserves the scroll position — no jump on
          open/close) and the menu positions FIXED so it isn't clipped by the scroll box. paddingBottom
          gives the last row breathing room above the dock. */}
      <div
        ref={bodyRef}
        style={{ position: 'absolute', inset: '236px 0px 118px', display: 'flex', flexDirection: 'column', gap: 18, padding: '26px 24px 24px', overflowX: 'hidden', overflowY: menuActive ? 'hidden' : 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {/* eyebrow + title (title is read-only — 8e-edit does not author title editing; see report).
            role="heading"/aria-level give SR users a landmark to jump to — pure semantics, no visual delta. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: menuActive ? 0.5 : 1, transition: 'opacity 150ms ease' }}>
          <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 10, letterSpacing: '2.2px', textTransform: 'uppercase', color: ACCENT }}>{eyebrow}</div>
          <div role="heading" aria-level={1} style={{ fontFamily: INTER, fontWeight: 800, fontSize: 21, letterSpacing: '-0.5px', color: 'rgb(255,255,255)' }}>{data.title}</div>
        </div>

        {/* editorial step rows — sortable (long-press), tap-to-edit, per-row ⋯ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <StepRow
                  key={item.id}
                  item={item}
                  index={index}
                  isLast={index === items.length - 1}
                  editing={editingId === item.id}
                  menuOpen={menuId === item.id}
                  menuActive={menuActive}
                  dimmed={menuActive && menuId !== item.id}
                  onStartEdit={() => { setMenuId(null); setEditingId(item.id) }}
                  onCommit={(text) => commitStep(item.id, text)}
                  onOpenMenu={() => { setEditingId(null); setMenuId(item.id) }}
                  onCloseMenu={() => setMenuId(null)}
                  onMerge={() => mergeStep(item.id)}
                  onDelete={() => deleteStep(item.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Coach's cues — warm callout, editable inline the same way */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 14, background: 'rgb(20,28,50)', border: '1px solid rgb(42,52,80)', opacity: menuActive ? 0.5 : 1, transition: 'opacity 150ms ease' }}>
            <div role="heading" aria-level={2} style={{ fontFamily: INTER, fontWeight: 700, fontSize: 10, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgb(255,171,125)' }}>Coach&rsquo;s cues</div>
          {editingCues ? (
            <textarea
              ref={cuesInputRef}
              defaultValue={cues}
              aria-label="Edit coach's cues"
              rows={2}
              onInput={(e) => autoGrow(e.currentTarget)}
              onBlur={(e) => commitCues(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur() }
                else if (e.key === 'Escape') { e.preventDefault(); commitCues(cues) }
              }}
              style={{
                width: '100%',
                resize: 'none',
                overflow: 'hidden',
                border: 'none',
                borderBottom: '1px solid rgb(58,77,119)',
                paddingBottom: 2,
                background: 'transparent',
                outline: 'none',
                fontFamily: INTER,
                fontWeight: 400,
                fontStyle: 'italic',
                fontSize: 13.5,
                lineHeight: 1.5,
                color: TEXT,
                caretColor: CARET,
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => { setMenuId(null); setEditingCues(true) }}
              // Invisible hit-slop → ≥44px tap height even for one-line cues; negative margin cancels
              // the padding so the callout keeps its authored layout — not a design value.
              style={{ textAlign: 'left', border: 'none', background: 'transparent', padding: '12px 0', margin: '-12px 0', cursor: 'text', fontFamily: INTER, fontWeight: 400, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5, color: TEXT, whiteSpace: 'pre-wrap' }}
            >
              {cues || 'Add a coaching cue…'}
            </button>
          )}
        </div>

        {/* skills micro-pill footer */}
        {data.skills.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', opacity: menuActive ? 0.5 : 1, transition: 'opacity 150ms ease' }}>
            {data.skills.map((s) => (
              <span key={s} style={{ fontFamily: INTER, fontWeight: 600, fontSize: 10, color: 'rgb(159,176,200)', padding: '4px 8px', border: '1px solid rgb(42,52,80)', borderRadius: 9 }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <Dock onTryAgain={onTryAgain} onSave={onSave} />
    </div>
  )
}
