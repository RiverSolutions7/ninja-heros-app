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

  async function handleSendToHandoff() {
    setOpen(false)
    const { error } = await supabase.from('components').update({ in_handoff: true }).eq('id', component.id)
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
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-text-primary hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>

            {!component.in_handoff ? (
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
