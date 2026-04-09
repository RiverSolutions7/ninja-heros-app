'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import ComponentPickerModal from './ComponentPickerModal'

const PLAN_KEY = 'ninja-heros-todays-plan'
const PREFILL_KEY = 'ninja-heros-plan-prefill'
const HOURS_36 = 36 * 60 * 60 * 1000
const HOURS_48 = 48 * 60 * 60 * 1000

const TYPE_META: Record<ComponentType, { label: string; border: string; placeholderBg: string }> = {
  warmup: { label: 'Warmup', border: 'border-l-accent-gold', placeholderBg: 'bg-accent-gold/20' },
  station: { label: 'Station', border: 'border-l-accent-blue', placeholderBg: 'bg-accent-blue/20' },
  game: { label: 'Game', border: 'border-l-accent-green', placeholderBg: 'bg-accent-green/20' },
}

interface PlanItem {
  localId: string
  component: ComponentRow
  durationMinutes: number | null
}

interface StoredPlan {
  items: PlanItem[]
  savedAt: string
}

export default function TodaysPlanClient() {
  const router = useRouter()
  const [items, setItems] = useState<PlanItem[]>([])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showExpiryBanner, setShowExpiryBanner] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Drag state
  const dragId = useRef<string | null>(null)
  const dragOverId = useRef<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(PLAN_KEY)
      if (!raw) return
      const parsed: StoredPlan = JSON.parse(raw)
      const age = Date.now() - new Date(parsed.savedAt).getTime()
      if (age >= HOURS_48) {
        localStorage.removeItem(PLAN_KEY)
        return
      }
      setItems(parsed.items ?? [])
      setSavedAt(parsed.savedAt)
      if (age >= HOURS_36) setShowExpiryBanner(true)
    } catch { /* ignore corrupt data */ }
  }, [])

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!mounted) return
    try {
      const now = new Date().toISOString()
      const plan: StoredPlan = { items, savedAt: savedAt ?? now }
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
      if (!savedAt) setSavedAt(now)
    } catch { /* ignore quota errors */ }
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(component: ComponentRow) {
    setShowPicker(false)
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

  // Drag-to-reorder
  function handleDragStart(localId: string) {
    dragId.current = localId
  }

  function handleDragOver(e: React.DragEvent, localId: string) {
    e.preventDefault()
    dragOverId.current = localId
  }

  function handleDrop() {
    const from = dragId.current
    const to = dragOverId.current
    if (!from || !to || from === to) return
    setItems((prev) => {
      const fromIdx = prev.findIndex((i) => i.localId === from)
      const toIdx = prev.findIndex((i) => i.localId === to)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    dragId.current = null
    dragOverId.current = null
  }

  function buildShareText() {
    const lines = ['Today\'s Plan']
    items.forEach((item, idx) => {
      const dur = item.durationMinutes ? ` — ${item.durationMinutes} min` : ''
      lines.push(`${idx + 1}. ${item.component.title}${dur}`)
    })
    return lines.join('\n')
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch { /* ignore */ }
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
      {/* Expiry banner */}
      {showExpiryBanner && (
        <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-accent-gold/10 border border-accent-gold/30 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-accent-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-accent-gold text-xs flex-1">
            Your plan expires soon — save it to the Library or it will be deleted.
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="text-xs text-accent-gold font-heading underline"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowExpiryBanner(false)}
              className="text-accent-gold/60 hover:text-accent-gold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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

      {/* Save to Library link */}
      {items.length > 0 && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={handleSaveToLibrary}
            className="text-sm text-text-dim hover:text-text-muted transition-colors underline underline-offset-2"
          >
            Save to Library as a class
          </button>
        </div>
      )}

      {/* Add button */}
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

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-heading text-text-muted text-lg">No plan yet</p>
          <p className="text-text-dim text-sm mt-2">Tap + Add to Plan to start building your day</p>
        </div>
      )}

      {/* Plan items */}
      {items.length > 0 && (
        <ul className="mx-4 bg-bg-card rounded-2xl overflow-hidden border border-bg-border">
          {items.map((item) => {
            const meta = TYPE_META[item.component.type]
            const firstPhoto = item.component.photos?.[0] ?? null
            const subMeta = [meta.label, item.component.curriculum].filter(Boolean).join(' · ')
            return (
              <li
                key={item.localId}
                draggable
                onDragStart={() => handleDragStart(item.localId)}
                onDragOver={(e) => handleDragOver(e, item.localId)}
                onDrop={handleDrop}
                className={[
                  'flex items-center gap-3 px-3 py-3 border-b border-bg-border/50 last:border-b-0 border-l-4 cursor-grab active:cursor-grabbing',
                  meta.border,
                ].join(' ')}
              >
                {/* Drag handle */}
                <span className="text-text-dim/30 text-base leading-none select-none flex-shrink-0" aria-hidden>
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
                    onChange={(e) => handleDurationChange(item.localId, e.target.value)}
                    placeholder="—"
                    className="w-10 bg-transparent text-text-muted text-sm text-right focus:outline-none focus:text-text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-text-dim text-xs">m</span>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.localId)}
                  className="text-text-dim/40 hover:text-text-muted transition-colors flex-shrink-0 p-1 -mr-1"
                  aria-label="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Component picker modal */}
      {showPicker && (
        <ComponentPickerModal
          onSelect={handleSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}
