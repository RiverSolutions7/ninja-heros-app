'use client'

import { useEffect, useRef, useState } from 'react'
import { ACCENT, LF } from './atoms'

// ─── Animations ──────────────────────────────────────────────────────────────
const ANIM_CSS = `
@keyframes sheetSlideIn {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
`

// ─── Types ────────────────────────────────────────────────────────────────────
interface Card2SequenceProps {
  initialSteps: string[]
  onApprove: (steps: string[]) => void
  onClose?: () => void
  /** 0-based index in the swipe deck. Default 1. */
  cardIndex?: number
  /** Total cards in the deck. Default 3. */
  totalCards?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Card2Sequence({
  initialSteps,
  onApprove,
  onClose,
  cardIndex = 1,
  totalCards = 3,
}: Card2SequenceProps) {
  const [steps, setSteps] = useState<string[]>(
    initialSteps.length > 0 ? initialSteps : []
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [actionSheetIndex, setActionSheetIndex] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const pointerMoved = useRef(false)

  // Focus the editing input whenever editingIndex changes
  useEffect(() => {
    if (editingIndex !== null) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [editingIndex])

  // ── Edit helpers ─────────────────────────────────────────────────────────

  const startEdit = (index: number) => {
    setActionSheetIndex(null)
    setEditingIndex(index)
    setEditingText(steps[index] ?? '')
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingText.trim()
    if (trimmed) {
      setSteps((s) => s.map((v, i) => (i === editingIndex ? trimmed : v)))
    } else {
      // Delete empty step
      setSteps((s) => s.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setEditingText('')
  }

  const cancelEdit = () => {
    // If it was a newly added blank step, remove it
    if (editingIndex !== null && steps[editingIndex] === '') {
      setSteps((s) => s.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setEditingText('')
  }

  const addStep = () => {
    const newIndex = steps.length
    setSteps((s) => [...s, ''])
    setEditingIndex(newIndex)
    setEditingText('')
  }

  // ── Long-press / tap detection ────────────────────────────────────────────

  const onStepPointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if ((e.target as HTMLElement).closest('[data-grip]')) return
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    pointerMoved.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setActionSheetIndex(index)
    }, 500)
  }

  const onStepPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = Math.abs(e.clientX - pointerDownPos.current.x)
    const dy = Math.abs(e.clientY - pointerDownPos.current.y)
    if (dx > 6 || dy > 6) {
      pointerMoved.current = true
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }

  const onStepPointerUp = (_e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      if (!pointerMoved.current) {
        startEdit(index)
      }
    }
    pointerMoved.current = false
  }

  // ── Drag-to-reorder (grip handle) ─────────────────────────────────────────

  const onGripPointerDown = (e: React.PointerEvent<SVGSVGElement>, index: number) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
    setDraggingIndex(index)
    setDragOverIndex(index)
  }

  const onGripPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingIndex === null) return
    let newTarget = steps.length - 1
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (e.clientY < rect.top + rect.height / 2) {
        newTarget = i
        break
      }
    }
    setDragOverIndex(newTarget)
  }

  const onGripPointerUp = () => {
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      setSteps((prev) => {
        const arr = [...prev]
        const [item] = arr.splice(draggingIndex, 1)
        arr.splice(dragOverIndex, 0, item)
        return arr
      })
    }
    setDraggingIndex(null)
    setDragOverIndex(null)
  }

  // ── Action sheet operations ───────────────────────────────────────────────

  const doMoveUp = (i: number) => {
    if (i > 0)
      setSteps((s) => { const a = [...s]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })
    setActionSheetIndex(null)
  }

  const doMoveDown = (i: number) => {
    if (i < steps.length - 1)
      setSteps((s) => { const a = [...s]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })
    setActionSheetIndex(null)
  }

  const doSplit = (i: number) => {
    setSteps((s) => {
      const a = [...s]
      a.splice(i + 1, 0, '')
      return a
    })
    setActionSheetIndex(null)
    setTimeout(() => {
      setEditingIndex(i + 1)
      setEditingText('')
    }, 120)
  }

  const doDelete = (i: number) => {
    setSteps((s) => s.filter((_, idx) => idx !== i))
    setActionSheetIndex(null)
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isEditing = editingIndex !== null
  const isDragging = draggingIndex !== null
  const validSteps = steps.filter((s) => s.trim())

  const accentFaded = 'rgba(255,90,31,0.40)'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: LF.bg,
        overflow: 'hidden',
        userSelect: 'none',
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
              background: i === cardIndex ? ACCENT : 'rgba(255,255,255,0.14)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* ── Close button ────────────────────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 76,
            right: 16,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 82,
          left: 0,
          right: 0,
          bottom: 90,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 20px',
        }}
      >
        {/* Title + subtitle */}
        <div style={{ paddingTop: 14, marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 66,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight: 0.88,
              color: '#fff',
              margin: 0,
              marginBottom: 10,
            }}
          >
            SEQUENCE
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ACCENT,
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <span
              style={{
                fontFamily: LF.body,
                fontSize: 13,
                color: isEditing ? LF.muted : 'rgba(255,255,255,0.50)',
                letterSpacing: '0.03em',
                lineHeight: 1.35,
                transition: 'color 0.15s ease',
              }}
            >
              {isEditing ? 'Editing step' : `${validSteps.length} step${validSteps.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Step list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {steps.map((step, index) => {
            const isThisEditing = editingIndex === index
            const isThisDragging = draggingIndex === index
            const isDimmed = (isEditing && !isThisEditing) || (isDragging && !isThisDragging)

            return (
              <div
                key={index}
                ref={(el) => { rowRefs.current[index] = el }}
                data-step-card
                onPointerDown={isThisEditing ? undefined : (e) => onStepPointerDown(e, index)}
                onPointerMove={isThisEditing ? undefined : onStepPointerMove}
                onPointerUp={isThisEditing ? undefined : (e) => onStepPointerUp(e, index)}
                style={{
                  background: isThisEditing
                    ? 'rgba(255,90,31,0.08)'
                    : isThisDragging
                    ? 'rgba(255,255,255,0.10)'
                    : 'rgba(255,255,255,0.04)',
                  borderRadius: 14,
                  padding: '15px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  border: isThisEditing || isThisDragging
                    ? `1px solid ${ACCENT}`
                    : '1px solid transparent',
                  opacity: isDimmed ? 0.45 : 1,
                  transform: isThisDragging ? 'scale(1.025)' : 'scale(1)',
                  boxShadow: isThisDragging
                    ? '0 18px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)'
                    : 'none',
                  transition:
                    'opacity 180ms, border-color 180ms, background 180ms, transform 200ms, box-shadow 200ms',
                  zIndex: isThisDragging ? 10 : 1,
                  position: 'relative',
                  cursor: isThisEditing ? 'text' : 'pointer',
                }}
              >
                {/* Badge */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: LF.display,
                    fontSize: 13,
                    fontWeight: 900,
                    flexShrink: 0,
                    background:
                      isThisEditing || isThisDragging ? ACCENT : 'rgba(255,90,31,0.15)',
                    border:
                      isThisEditing || isThisDragging
                        ? 'none'
                        : `1.5px solid rgba(255,90,31,0.35)`,
                    color: isThisEditing || isThisDragging ? LF.bg : ACCENT,
                  }}
                >
                  {index + 1}
                </div>

                {/* Text or input */}
                {isThisEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    placeholder="Describe this step…"
                    style={{
                      fontFamily: LF.body,
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#fff',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      flex: 1,
                      minWidth: 0,
                      paddingTop: 3,
                      lineHeight: 1.45,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: LF.body,
                      fontSize: 15,
                      fontWeight: 500,
                      color: step.trim()
                        ? 'rgba(255,255,255,0.92)'
                        : LF.muted,
                      fontStyle: step.trim() ? 'normal' : 'italic',
                      flex: 1,
                      paddingTop: 3,
                      lineHeight: 1.45,
                    }}
                  >
                    {step || 'Empty step'}
                  </span>
                )}

                {/* Grip handle */}
                <svg
                  data-grip="true"
                  width="13"
                  height="10"
                  viewBox="0 0 13 10"
                  onPointerDown={(e) => onGripPointerDown(e, index)}
                  onPointerMove={onGripPointerMove}
                  onPointerUp={onGripPointerUp}
                  style={{
                    flexShrink: 0,
                    marginTop: 5,
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                  aria-label="Drag to reorder"
                >
                  {[1.25, 5, 8.75].map((y) => (
                    <line
                      key={y}
                      x1="1"
                      y1={y}
                      x2="12"
                      y2={y}
                      stroke={isThisDragging ? ACCENT : LF.muted}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
              </div>
            )
          })}

          {/* ADD STEP */}
          {!isEditing && (
            <button
              onClick={addStep}
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
        {isEditing ? (
          <div style={{ display: 'flex', gap: 10 }}>
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
            onClick={() => onApprove(validSteps)}
            disabled={validSteps.length === 0}
            aria-label={`Approve ${validSteps.length} sequence step${validSteps.length !== 1 ? 's' : ''}`}
            style={{
              width: '100%',
              height: 54,
              borderRadius: 12,
              background: validSteps.length === 0 ? 'rgba(255,90,31,0.35)' : ACCENT,
              border: 'none',
              fontFamily: LF.display,
              fontSize: 16,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: validSteps.length === 0 ? 'rgba(255,255,255,0.4)' : LF.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: validSteps.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
              paddingTop: 2,
            }}
          >
            APPROVE STEPS
            {validSteps.length > 0 && (
              <svg width="18" height="14" viewBox="0 0 24 18" fill="none" aria-hidden="true">
                <path
                  d="M2 9h18M14 2l7 7-7 7"
                  stroke={LF.bg}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* ── Action sheet ────────────────────────────────────────────────── */}
      {actionSheetIndex !== null && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setActionSheetIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 50,
            }}
          />

          {/* Sheet */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: LF.card,
              borderRadius: '18px 18px 0 0',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.55)',
              zIndex: 51,
              animation: 'sheetSlideIn 220ms ease-out',
            }}
          >
            {/* Drag pill */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.18)',
                }}
              />
            </div>

            {/* Step label */}
            <div
              style={{
                padding: '8px 20px 12px',
                borderBottom: `1px solid ${LF.hairline}`,
              }}
            >
              <span
                style={{
                  fontFamily: LF.body,
                  fontSize: 13,
                  color: LF.muted,
                  lineHeight: 1.4,
                }}
              >
                Step {actionSheetIndex + 1}:{' '}
                {steps[actionSheetIndex] || 'Empty step'}
              </span>
            </div>

            {/* Actions */}
            {[
              {
                icon: '✏️',
                label: 'Edit text',
                action: () => startEdit(actionSheetIndex),
                disabled: false,
                danger: false,
              },
              {
                icon: '↑',
                label: 'Move up',
                action: () => doMoveUp(actionSheetIndex),
                disabled: actionSheetIndex === 0,
                danger: false,
              },
              {
                icon: '↓',
                label: 'Move down',
                action: () => doMoveDown(actionSheetIndex),
                disabled: actionSheetIndex === steps.length - 1,
                danger: false,
              },
              {
                icon: '⤧',
                label: 'Split into two steps',
                action: () => doSplit(actionSheetIndex),
                disabled: false,
                danger: false,
              },
              {
                icon: '✕',
                label: 'Delete step',
                action: () => doDelete(actionSheetIndex),
                disabled: false,
                danger: true,
              },
            ].map(({ icon, label, action, disabled, danger }) => (
              <button
                key={label}
                onClick={disabled ? undefined : action}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: `1px solid ${LF.hairline}`,
                  background: 'transparent',
                  border: 'none',
                  borderBottomWidth: 1,
                  borderBottomStyle: 'solid',
                  borderBottomColor: LF.hairline,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.35 : 1,
                }}
              >
                <span
                  style={{
                    width: 22,
                    textAlign: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                    color: danger ? '#f04040' : LF.muted,
                  }}
                >
                  {icon}
                </span>
                <span
                  style={{
                    fontFamily: LF.body,
                    fontSize: 15,
                    fontWeight: 400,
                    color: danger ? '#f04040' : '#fff',
                  }}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
