'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import { supabase } from '@/app/lib/supabase'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'
import BottomSheet from '@/app/components/ui/BottomSheet'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'
import EmptyState from '@/app/components/ui/EmptyState'
import MenuList, { type MenuItem } from '@/app/components/ui/MenuList'
import { useToast } from '@/app/components/ui/Toast'
import useLongPress, { LONG_PRESS_STYLE } from '@/app/hooks/useLongPress'
import { useSwipeReveal, REVEAL_WIDTH_DEFAULT, SPRING_MS } from '@/app/hooks/useSwipeReveal'

// ── Constants ─────────────────────────────────────────────────────────────────

// Must stay in sync with useLongPress MOVEMENT_CANCEL_PX (12). Visual press
// feedback cancels at the same threshold so scale-back and long-press cancel
// are always in sync.
const PRESS_CANCEL_PX = 12

interface ComponentListClientProps {
  components: ComponentRow[]
}

const SUB_TABS: { type: ComponentType; label: string }[] = [
  { type: 'station', label: 'Stations' },
  { type: 'game',   label: 'Games'    },
]

const EMPTY_MESSAGES: Record<ComponentType, string> = {
  game:    'No games logged yet',
  station: 'No stations logged yet',
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

// ── Menu icons ────────────────────────────────────────────────────────────────

const EDIT_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)
const SHARE_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
)
const TRASH_ICON = (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── SwipeableCard ─────────────────────────────────────────────────────────────
//
// Apple-quality gesture layer for a single library card row.
//
// Three gestures on the same element — all coexist cleanly:
//
//   TAP         → opens detail sheet (handled by ComponentCard's onClick)
//   SWIPE LEFT  → slides card to reveal red delete button
//   LONG PRESS  → card scales to 0.97, fires at 500ms, context menu slides up
//
// Conflict resolution:
//   useLongPress  cancels if finger moves > 12px (PRESS_CANCEL_PX)
//   useSwipeReveal claims  if finger moves > 18px horizontally
//   The 6px gap means only one can ever be active at the same time.
//
// Transform composition:
//   The foreground div needs both translateX (swipe) and scale (press) applied
//   simultaneously. We expose raw `offset` and `animating` from useSwipeReveal
//   and manage `isPressing` locally so we can compute one combined transform
//   with the right easing for each state:
//     • Spring snap     → cubic-bezier(0.25, 1, 0.5, 1) / SPRING_MS
//     • Active drag     → none (finger-direct, no latency)
//     • Press scale-in  → ease / 200ms
//     • Press scale-out → ease / 120ms (snappy snap-back)

function SwipeableCard({
  component,
  onDeleteRequest,
  onMenuRequest,
  onClick,
}: {
  component: ComponentRow
  onDeleteRequest: () => void
  onMenuRequest:   () => void
  onClick:         () => void
}) {
  const swipe = useSwipeReveal({
    onDelete: onDeleteRequest,
    shouldSkip: (target) => !!target.closest('[data-component-menu]'),
  })

  const longPress = useLongPress({
    onLongPress: () => {
      // Scale snaps back on the same frame the menu opens — feels instant
      setIsPressing(false)
      onMenuRequest()
    },
    shouldSkip: (target) => !!target.closest('[data-component-menu]'),
  })

  // ── Local press-feedback state ─────────────────────────────────────────────
  // Managed here (not inside useLongPress) to avoid spreading isPressing onto
  // a DOM div in other consumers (SavedPlanRow, etc.) that spread the hook result.
  const [isPressing,    setIsPressing]    = useState(false)
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null)

  // ── Merged pointer handlers ────────────────────────────────────────────────
  const handlers = {
    onPointerDown(e: React.PointerEvent) {
      // Start press-feedback only for touch (mouse hover-clicks don't scale)
      if (e.pointerType === 'touch' && !(e.target as Element).closest?.('[data-component-menu]')) {
        setIsPressing(true)
        pressOriginRef.current = { x: e.clientX, y: e.clientY }

        if (process.env.NODE_ENV === 'development') {
          console.log('[gesture:swipeablecard] event=pointerdown x=%d y=%d', Math.round(e.clientX), Math.round(e.clientY))
        }
      }
      longPress.onPointerDown(e)
      swipe.handlers.onPointerDown(e)
    },

    onPointerMove(e: React.PointerEvent) {
      // Cancel press-feedback the moment the finger drifts — same threshold as
      // useLongPress so scale-back and long-press cancel are always in sync.
      if (isPressing && pressOriginRef.current) {
        const dx   = e.clientX - pressOriginRef.current.x
        const dy   = e.clientY - pressOriginRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > PRESS_CANCEL_PX) {
          setIsPressing(false)
          pressOriginRef.current = null

          if (process.env.NODE_ENV === 'development') {
            console.log('[gesture:swipeablecard] event=press-cancel dist=%d', Math.round(dist))
          }
        }
      }
      longPress.onPointerMove(e)
      swipe.handlers.onPointerMove(e)
    },

    onPointerUp(e: React.PointerEvent) {
      setIsPressing(false)
      pressOriginRef.current = null
      longPress.onPointerUp(e)
      swipe.handlers.onPointerUp(e)
    },

    onPointerCancel(e: React.PointerEvent) {
      setIsPressing(false)
      pressOriginRef.current = null
      longPress.onPointerCancel(e)
      swipe.handlers.onPointerCancel(e)
    },

    // Blocks iOS's native long-press callout (copy/define bubble) which would
    // appear at the same 500ms moment as our context menu.
    onContextMenu: longPress.onContextMenu,
  }

  // ── Composed transform + transition ───────────────────────────────────────
  // Four distinct states, each with the timing that feels right for that action:
  //
  //   Spring snapping  → spring easing (smooth deceleration)
  //   Active drag      → no transition (direct finger follow — any latency = laggy)
  //   Pressing down    → 200ms ease (card gently presses in)
  //   Press snap-back  → 120ms ease (quick, snappy return)
  const scale = isPressing ? 0.97 : 1

  let transition: string
  if (swipe.animating) {
    transition = `transform ${SPRING_MS}ms cubic-bezier(0.25, 1, 0.5, 1)`
  } else if (swipe.offset !== 0) {
    transition = 'none'
  } else if (isPressing) {
    transition = 'transform 200ms ease'
  } else {
    transition = 'transform 120ms ease'
  }

  const foregroundStyle: React.CSSProperties = {
    ...LONG_PRESS_STYLE,
    transform:   `translateX(${swipe.offset}px) scale(${scale})`,
    transition,
    touchAction: 'pan-y',
    willChange:  'transform',
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* ─── Delete zone (behind the sliding card) ───────────────── */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-xl bg-accent-fire"
        style={{ width: REVEAL_WIDTH_DEFAULT }}
      >
        <button
          type="button"
          onClick={onDeleteRequest}
          aria-label={`Delete ${component.title}`}
          className="flex items-center justify-center text-white active:opacity-70 transition-opacity p-4 min-w-[44px] min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* ─── Sliding foreground card ──────────────────────────────── */}
      <div {...handlers} style={foregroundStyle}>
        <ComponentCard
          component={component}
          showMenu
          onClick={onClick}
        />
      </div>
    </div>
  )
}

// ── Main list ─────────────────────────────────────────────────────────────────

export default function ComponentListClient({ components }: ComponentListClientProps) {
  const router = useRouter()
  const toast  = useToast()

  const [selected,     setSelected]     = useState<ComponentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ComponentRow | null>(null)
  const [menuTarget,   setMenuTarget]   = useState<ComponentRow | null>(null)
  const [search,       setSearch]       = useState('')
  const [activeType,   setActiveType]   = useState<ComponentType>('station')

  const filtered = components
    .filter((c) => c.type === activeType)
    .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))

  // ── Long-press context menu actions ───────────────────────────────────────
  function handleEdit(component: ComponentRow) {
    setMenuTarget(null)
    router.push(`/library/log-component/${component.id}`)
  }

  async function handleShare(component: ComponentRow) {
    setMenuTarget(null)
    const url = `${window.location.origin}/component/${component.id}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try { await navigator.share({ title: component.title, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast.success('Link copied') } catch {}
  }

  function handleMenuDelete(component: ComponentRow) {
    setMenuTarget(null)
    setDeleteTarget(component)
  }

  const menuItems: MenuItem[] = menuTarget ? [
    { icon: EDIT_ICON,  label: 'Edit',   onClick: () => handleEdit(menuTarget)       },
    { icon: SHARE_ICON, label: 'Share',  onClick: () => handleShare(menuTarget)      },
    { icon: TRASH_ICON, label: 'Delete', onClick: () => handleMenuDelete(menuTarget),
      destructive: true, dividerAbove: true },
  ] : []

  // ── Swipe-delete confirmed ────────────────────────────────────────────────
  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    try {
      const photoPaths = (deleteTarget.photos ?? [])
        .map((u) => extractPath(u, 'station-photos'))
        .filter(Boolean) as string[]
      if (photoPaths.length > 0) {
        await supabase.storage.from('station-photos').remove(photoPaths)
      }
      if (deleteTarget.video_url) {
        const videoPath = extractPath(deleteTarget.video_url, 'lane-videos')
        if (videoPath) await supabase.storage.from('lane-videos').remove([videoPath])
      }
      const { error } = await supabase.from('components').delete().eq('id', deleteTarget.id)
      if (error) throw error
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error('Could not delete — check your connection')
      setDeleteTarget(null)
    }
  }

  return (
    <>
      {/* Type sub-tabs */}
      <div className="flex border-b border-bg-border mb-4">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => { setActiveType(tab.type); setSearch('') }}
            className={`flex-1 py-3 text-sm font-heading transition-colors min-h-[44px] active:bg-white/5 ${
              activeType === tab.type
                ? 'text-text-primary border-b-2 border-accent-fire -mb-px'
                : 'text-text-dim hover:text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${SUB_TABS.find((t) => t.type === activeType)?.label.toLowerCase()}...`}
          aria-label={`Search ${activeType}s`}
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          compact
          title={search ? `No results for "${search}"` : EMPTY_MESSAGES[activeType]}
          icon={search ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <SwipeableCard
              key={c.id}
              component={c}
              onDeleteRequest={() => setDeleteTarget(c)}
              onMenuRequest={() => {
                // If the card is swiped open, close it first before showing menu
                setMenuTarget(c)
              }}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      {selected && (
        <ComponentDetailSheet
          component={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Long-press context menu — same actions as the kebab, accessible via
          hold gesture so coaches don't have to hunt for the three-dot button */}
      <BottomSheet
        visible={!!menuTarget}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.title}
      >
        <div className="pb-4">
          <MenuList
            items={menuItems}
            ariaLabel={menuTarget ? `Actions for ${menuTarget.title}` : 'Component actions'}
          />
        </div>
      </BottomSheet>

      {/* Swipe-delete confirmation — library deletes are permanent */}
      <ConfirmSheet
        visible={!!deleteTarget}
        title={`Delete "${deleteTarget?.title ?? ''}"?`}
        body="This can't be undone. Saved plans using this component will keep their copy."
        confirmLabel="Delete component"
        workingLabel="Deleting…"
        destructive
        onConfirm={handleDeleteConfirmed}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
