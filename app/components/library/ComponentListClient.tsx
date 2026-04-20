'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ComponentRow, ComponentType } from '@/app/lib/database.types'
import { supabase } from '@/app/lib/supabase'
import ComponentCard from './ComponentCard'
import ComponentDetailSheet from './ComponentDetailSheet'
import ConfirmSheet from '@/app/components/ui/ConfirmSheet'
import { useSwipeReveal, REVEAL_WIDTH_DEFAULT } from '@/app/hooks/useSwipeReveal'
import { LONG_PRESS_STYLE } from '@/app/hooks/useLongPress'

interface ComponentListClientProps {
  components: ComponentRow[]
}

const SUB_TABS: { type: ComponentType; label: string }[] = [
  { type: 'station', label: 'Stations' },
  { type: 'game', label: 'Games' },
]

const EMPTY_MESSAGES: Record<ComponentType, string> = {
  game: 'No games logged yet',
  station: 'No stations logged yet',
}

// ── Helpers (shared with ComponentCardMenu delete path) ───────────────────────

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

// ── SwipeableCard ─────────────────────────────────────────────────────────────
// Wraps a ComponentCard row with swipe-left-to-delete. The swipe reveals a red
// trash button; tapping it (or completing a full swipe) triggers onDeleteRequest,
// which opens the confirm sheet at the list level rather than deleting immediately
// (library deletes are permanent — photos + video + DB row).

function SwipeableCard({
  component,
  onDeleteRequest,
  onClick,
}: {
  component: ComponentRow
  onDeleteRequest: () => void
  onClick: () => void
}) {
  const swipe = useSwipeReveal({
    onDelete: onDeleteRequest,
    // Skip the swipe gesture when the touch starts on the kebab menu button so
    // the menu can open independently without collapsing the reveal.
    shouldSkip: (target) => !!target.closest('[data-component-menu]'),
  })

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* ─── Delete zone (revealed behind the sliding card) ──────── */}
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

      {/* ─── Sliding foreground card ─────────────────────────────── */}
      <div
        {...swipe.handlers}
        style={{ ...LONG_PRESS_STYLE, ...swipe.rowStyle }}
      >
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
  const [selected,     setSelected]     = useState<ComponentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ComponentRow | null>(null)
  const [isDeleting,   setIsDeleting]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [activeType,   setActiveType]   = useState<ComponentType>('station')

  const filtered = components
    .filter((c) => c.type === activeType)
    .filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()))

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      // Remove photos from storage
      const photoPaths = (deleteTarget.photos ?? [])
        .map((u) => extractPath(u, 'station-photos'))
        .filter(Boolean) as string[]
      if (photoPaths.length > 0) {
        await supabase.storage.from('station-photos').remove(photoPaths)
      }
      // Remove video from storage
      if (deleteTarget.video_url) {
        const videoPath = extractPath(deleteTarget.video_url, 'lane-videos')
        if (videoPath) {
          await supabase.storage.from('lane-videos').remove([videoPath])
        }
      }
      // Delete the component row
      const { error } = await supabase.from('components').delete().eq('id', deleteTarget.id)
      if (error) throw error

      setDeleteTarget(null)
      router.refresh()
    } finally {
      setIsDeleting(false)
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
            className={`flex-1 py-2.5 text-sm font-heading transition-colors ${
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
          className="w-full bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-dim text-sm">
            {search ? `No results for "${search}"` : EMPTY_MESSAGES[activeType]}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <SwipeableCard
              key={c.id}
              component={c}
              onDeleteRequest={() => setDeleteTarget(c)}
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

      {/* Delete confirmation — single sheet at list level, shared by all swipe
          triggers. Library deletes are permanent (storage + DB), so we always
          confirm rather than deleting immediately on full swipe. */}
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
