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
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <span
        style={{
          fontFamily: LF.body,
          fontSize: 11,
          color: LF.muted,
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </div>
  )
}

// ─── Lightbulb icon ───────────────────────────────────────────────────────────
function BulbIcon({ color }: { color: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.2V17H9v-2.8C7.2 13.16 6 11.22 6 9a6 6 0 0 1 6-6z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Card3CoachTipsProps {
  /** Already-approved steps from Card 2, shown read-only */
  sequenceSteps: string[]
  initialTips: string[]
  onApprove: (tips: string[]) => void
  onClose?: () => void
  /** 0-based index in the swipe deck. Default 2. */
  cardIndex?: number
  /** Total cards in the deck. Default 3. */
  totalCards?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Card3CoachTips({
  sequenceSteps,
  initialTips,
  onApprove,
  onClose,
  cardIndex = 2,
  totalCards = 3,
}: Card3CoachTipsProps) {
  const [tips, setTips] = useState<string[]>(
    initialTips.length > 0 ? initialTips : []
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [actionSheetIndex, setActionSheetIndex] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerDownPos = useRef({ x: 0, y: 0 })
  const pointerMoved = useRef(false)

  // Focus input when editing starts
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
    setEditingText(tips[index] ?? '')
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingText.trim()
    if (trimmed) {
      setTips((t) => t.map((v, i) => (i === editingIndex ? trimmed : v)))
    } else {
      setTips((t) => t.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setEditingText('')
  }

  const cancelEdit = () => {
    if (editingIndex !== null && tips[editingIndex] === '') {
      setTips((t) => t.filter((_, i) => i !== editingIndex))
    }
    setEditingIndex(null)
    setEditingText('')
  }

  const addTip = () => {
    const newIndex = tips.length
    setTips((t) => [...t, ''])
    setEditingIndex(newIndex)
    setEditingText('')
  }

  // ── Long-press / tap detection ────────────────────────────────────────────

  const onTipPointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
    pointerMoved.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setActionSheetIndex(index)
    }, 500)
  }

  const onTipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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

  const onTipPointerUp = (_e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      if (!pointerMoved.current) {
        startEdit(index)
      }
    }
    pointerMoved.current = false
  }

  // ── Action sheet operations ───────────────────────────────────────────────

  const doMoveUp = (i: number) => {
    if (i > 0)
      setTips((t) => { const a = [...t]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })
    setActionSheetIndex(null)
  }

  const doMoveDown = (i: number) => {
    if (i < tips.length - 1)
      setTips((t) => { const a = [...t]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })
    setActionSheetIndex(null)
  }

  const doDelete = (i: number) => {
    setTips((t) => t.filter((_, idx) => idx !== i))
    setActionSheetIndex(null)
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isEditing = editingIndex !== null
  const validTips = tips.filter((t) => t.trim())
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
        <div style={{ paddingTop: 14, marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: LF.display,
              fontSize: 60,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              lineHeight: 0.88,
              color: '#fff',
              margin: 0,
              marginBottom: 10,
            }}
          >
            COACH TIPS
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
              {isEditing ? 'Editing tip' : `${validTips.length} tip${validTips.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* ── SEQUENCE section (read-only) ──────────────────────────────── */}
        {sequenceSteps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeader
              label="Sequence"
              count={sequenceSteps.length}
              dimmed={isEditing}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                opacity: isEditing ? 0.45 : 1,
                transition: 'opacity 180ms',
                pointerEvents: isEditing ? 'none' : 'auto',
              }}
            >
              {sequenceSteps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  {/* Tiny badge */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: LF.display,
                      fontSize: 11,
                      fontWeight: 900,
                      flexShrink: 0,
                      background: 'rgba(255,90,31,0.12)',
                      border: `1px solid rgba(255,90,31,0.28)`,
                      color: ACCENT,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span
                    style={{
                      fontFamily: LF.body,
                      fontSize: 14,
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.70)',
                      lineHeight: 1.4,
                      paddingTop: 2,
                    }}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COACH TIPS section (editable) ────────────────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <SectionHeader
            label="Coach Tips"
            count={validTips.length}
            dimmed={false}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tips.map((tip, index) => {
              const isThisEditing = editingIndex === index
              const isDimmed = isEditing && !isThisEditing

              return (
                <div
                  key={index}
                  onPointerDown={isThisEditing ? undefined : (e) => onTipPointerDown(e, index)}
                  onPointerMove={isThisEditing ? undefined : onTipPointerMove}
                  onPointerUp={isThisEditing ? undefined : (e) => onTipPointerUp(e, index)}
                  style={{
                    background: isThisEditing
                      ? 'rgba(255,90,31,0.06)'
                      : 'rgba(255,255,255,0.025)',
                    borderRadius: 14,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    border: isThisEditing
                      ? `1px solid ${ACCENT}`
                      : '1px solid transparent',
                    opacity: isDimmed ? 0.45 : 1,
                    transition:
                      'opacity 180ms, border-color 180ms, background 180ms',
                    cursor: isThisEditing ? 'text' : 'pointer',
                  }}
                >
                  {/* Lightbulb icon container */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: isThisEditing
                        ? `rgba(255,90,31,0.20)`
                        : 'rgba(255,90,31,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BulbIcon color={ACCENT} />
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
                      placeholder="Coach tip…"
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
              )
            })}

            {/* ADD TIP */}
            {!isEditing && (
              <button
                onClick={addTip}
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
            onClick={() => onApprove(validTips)}
            aria-label={`Approve ${validTips.length} coach tip${validTips.length !== 1 ? 's' : ''}`}
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
            APPROVE TIPS
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

      {/* ── Action sheet ────────────────────────────────────────────────── */}
      {actionSheetIndex !== null && (
        <>
          <div
            onClick={() => setActionSheetIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 50,
            }}
          />
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
                  fontStyle: 'italic',
                }}
              >
                Tip {actionSheetIndex + 1}:{' '}
                {tips[actionSheetIndex] || 'Empty tip'}
              </span>
            </div>

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
                disabled: actionSheetIndex === tips.length - 1,
                danger: false,
              },
              {
                icon: '✕',
                label: 'Delete tip',
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
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${LF.hairline}`,
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
