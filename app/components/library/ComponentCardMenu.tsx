'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow } from '@/app/lib/database.types'

interface ComponentCardMenuProps {
  component: ComponentRow
}

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

export default function ComponentCardMenu({ component }: ComponentCardMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState({ bottom: 0, right: 0 })

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

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right })
    }
    setOpen((v) => !v)
  }

  /**
   * Share: prefer native share sheet on mobile, fall back to clipboard on
   * desktop / when declined. Confirmation flashes via the toast primitive.
   */
  async function handleShare() {
    setOpen(false)
    const url = `${window.location.origin}/component/${component.id}`
    const shareData: ShareData = {
      title: component.title,
      text: `${component.title} — Ninja H.E.R.O.S.`,
      url,
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        return
      } catch {
        /* user dismissed or share threw — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied')
      setTimeout(() => setToast(null), 2200)
    } catch {
      /* silent fail — clipboard denied */
    }
  }

  async function handleDelete() {
    setOpen(false)
    if (!window.confirm('Delete this component from the library? This cannot be undone.')) return

    setDeleting(true)
    try {
      const photoPaths = (component.photos ?? [])
        .map((u) => extractPath(u, 'station-photos'))
        .filter(Boolean) as string[]

      if (photoPaths.length > 0) {
        await supabase.storage.from('station-photos').remove(photoPaths)
      }
      if (component.video_url) {
        const videoPath = extractPath(component.video_url, 'lane-videos')
        if (videoPath) {
          await supabase.storage.from('lane-videos').remove([videoPath])
        }
      }

      const { error } = await supabase.from('components').delete().eq('id', component.id)
      if (error) throw error

      router.refresh()
    } catch (err) {
      console.error('Failed to delete component:', err)
      alert('Failed to delete component. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={deleting}
        aria-label="Component actions"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 flex-shrink-0"
      >
        {deleting ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        )}
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[160px] bg-bg-card border border-bg-border rounded-xl shadow-2xl overflow-hidden"
            style={{ bottom: menuPos.bottom, right: menuPos.right }}
          >
            <button
              onClick={() => { setOpen(false); router.push(`/library/log-component/${component.id}`) }}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>

            <div className="h-px bg-bg-border mx-3" />

            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm text-accent-fire hover:bg-accent-fire/10 transition-colors"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {toast && typeof window !== 'undefined' && createPortal(
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
