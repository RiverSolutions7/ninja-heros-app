'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { FolderRow } from '@/app/lib/database.types'

interface ClassCardMenuProps {
  classId: string
  currentFolderId: string | null
  inHandoff: boolean
  photoUrls: string[]
  laneVideoUrls: string[]
  gameVideoUrls: string[]
}

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

export default function ClassCardMenu({
  classId,
  currentFolderId,
  inHandoff,
  photoUrls,
  laneVideoUrls,
  gameVideoUrls,
}: ClassCardMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'main' | 'folder'>('main')
  const [toast, setToast] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 })

  // Close on outside click — must exclude both the trigger button AND the
  // portal dropdown itself, otherwise mousedown fires before click and
  // unmounts the menu before any action can execute.
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  // Close on scroll (menu position would be stale)
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', () => setOpen(false), { passive: true, capture: true })
    return () => window.removeEventListener('scroll', () => setOpen(false), true)
  }, [open])

  function handleToggle() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right })
    }
    setView('main')
    setOpen((v) => !v)
  }

  async function openFolderPicker() {
    setView('folder')
    setLoadingFolders(true)
    try {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .order('sort_order')
        .order('created_at')
      setFolders((data as FolderRow[]) ?? [])
    } finally {
      setLoadingFolders(false)
    }
  }

  async function moveToFolder(folderId: string | null) {
    setOpen(false)
    const { error } = await supabase
      .from('classes')
      .update({ folder_id: folderId })
      .eq('id', classId)
    if (error) {
      console.error('Failed to move class:', error)
      alert('Failed to move class. Please try again.')
    } else {
      router.refresh()
    }
  }

  function handleShare() {
    setOpen(false)
    const url = `${window.location.origin}/class/${classId}`
    if (navigator.share) {
      navigator.share({ title: 'Ninja H.E.R.O.S. Class', url })
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setToast('Link copied!')
        setTimeout(() => setToast(null), 2500)
      })
    }
  }

  async function handleSendToHandoff() {
    setOpen(false)
    const { error } = await supabase
      .from('classes')
      .update({ in_handoff: true })
      .eq('id', classId)
    if (error) {
      console.error('Failed to send to handoff:', error)
      alert('Failed to send to Handoff. Please try again.')
    } else {
      router.refresh()
      setToast('Sent to Handoff')
      setTimeout(() => setToast(null), 2500)
    }
  }

  async function handleDelete() {
    setOpen(false)
    if (!window.confirm('Delete this class permanently? This cannot be undone.')) return

    setDeleting(true)
    try {
      const photoPaths = photoUrls
        .map((u) => extractPath(u, 'station-photos'))
        .filter(Boolean) as string[]
      const lanePaths = laneVideoUrls
        .map((u) => extractPath(u, 'lane-videos'))
        .filter(Boolean) as string[]
      const gamePaths = gameVideoUrls
        .map((u) => extractPath(u, 'game-videos'))
        .filter(Boolean) as string[]

      await Promise.allSettled([
        photoPaths.length > 0
          ? supabase.storage.from('station-photos').remove(photoPaths)
          : Promise.resolve(),
        lanePaths.length > 0
          ? supabase.storage.from('lane-videos').remove(lanePaths)
          : Promise.resolve(),
        gamePaths.length > 0
          ? supabase.storage.from('game-videos').remove(gamePaths)
          : Promise.resolve(),
      ])

      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw error

      router.refresh()
    } catch (err) {
      console.error('Failed to delete class:', err)
      alert('Failed to delete class. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={deleting}
        aria-label="Class actions"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 flex-shrink-0"
      >
        {deleting ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          /* Pencil icon */
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        )}
      </button>

      {open &&
        typeof window !== 'undefined' &&
        createPortal(
          <>
            {/* Invisible backdrop to catch outside taps */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Dropdown */}
            <div
              ref={menuRef}
              className="fixed z-50 min-w-[160px] bg-bg-card border border-bg-border rounded-xl shadow-2xl overflow-hidden"
              style={{ bottom: menuPos.bottom, right: menuPos.right }}
            >
              {view === 'main' ? (
                <>
                  <Link
                    href={`/library/${classId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </Link>

                  <Link
                    href={`/library/${classId}/edit`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors border-t border-bg-border"
                  >
                    <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>

                  <button
                    onClick={handleShare}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors border-t border-bg-border"
                  >
                    <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share Class
                  </button>

                  <button
                    onClick={openFolderPicker}
                    className="w-full flex items-center justify-between gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors border-t border-bg-border"
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                      Move to folder
                    </span>
                    <svg className="w-3.5 h-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Remove from folder — only shown when class is in a folder */}
                  {currentFolderId !== null && (
                    <button
                      onClick={() => moveToFolder(null)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors border-t border-bg-border"
                    >
                      <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 12l4 4m0-4l-4 4" />
                      </svg>
                      Remove from folder
                    </button>
                  )}

                  {/* Send to Handoff */}
                  {!inHandoff ? (
                    <button
                      onClick={handleSendToHandoff}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors border-t border-bg-border"
                    >
                      <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Send to Handoff
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-text-dim border-t border-bg-border opacity-60">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Already in Handoff
                    </div>
                  )}

                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-accent-fire hover:bg-accent-fire/10 transition-colors border-t border-bg-border"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  {/* Folder picker header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-bg-border">
                    <button
                      onClick={() => setView('main')}
                      className="text-text-dim hover:text-text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Move to folder
                    </span>
                  </div>

                  {loadingFolders ? (
                    <div className="flex justify-center py-4">
                      <div className="w-4 h-4 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* No folder option */}
                      <button
                        onClick={() => moveToFolder(null)}
                        className={[
                          'w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors',
                          currentFolderId === null
                            ? 'text-accent-fire bg-accent-fire/5'
                            : 'text-text-muted hover:bg-white/5 hover:text-text-primary',
                        ].join(' ')}
                      >
                        <svg className="w-4 h-4 flex-shrink-0 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        No folder
                        {currentFolderId === null && (
                          <svg className="w-3.5 h-3.5 ml-auto text-accent-fire" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>

                      {/* Folder list */}
                      {folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => moveToFolder(folder.id)}
                          className={[
                            'w-full flex items-center gap-2.5 px-4 py-3 text-sm border-t border-bg-border transition-colors',
                            currentFolderId === folder.id
                              ? 'text-accent-fire bg-accent-fire/5'
                              : 'text-text-primary hover:bg-white/5',
                          ].join(' ')}
                        >
                          <svg className="w-4 h-4 flex-shrink-0 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          </svg>
                          {folder.name}
                          {currentFolderId === folder.id && (
                            <svg className="w-3.5 h-3.5 ml-auto text-accent-fire" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          )}
                        </button>
                      ))}

                      {folders.length === 0 && (
                        <p className="px-4 py-3 text-xs text-text-dim">
                          No folders yet. Create one from the library.
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>,
          document.body
        )}

      {/* Toast */}
      {toast &&
        typeof window !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-bg-card border border-bg-border rounded-xl px-4 py-2.5 shadow-2xl text-sm text-text-primary whitespace-nowrap pointer-events-none">
            <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>,
          document.body
        )}
    </>
  )
}
