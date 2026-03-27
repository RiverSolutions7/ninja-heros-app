'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { FolderRow } from '@/app/lib/database.types'

interface FolderBarProps {
  folders: FolderRow[]
}

export default function FolderBar({ folders: initialFolders }: FolderBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeFolder = searchParams.get('folder') ?? ''

  const [folders, setFolders] = useState(initialFolders)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function selectFolder(folderId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (folderId) {
      params.set('folder', folderId)
    } else {
      params.delete('folder')
    }
    router.push(`/library?${params.toString()}`)
  }

  function openCreate() {
    setNewName('')
    setCreating(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({ name, sort_order: folders.length })
        .select()
        .single()
      if (error) throw error
      setFolders((prev) => [...prev, data as FolderRow])
      setCreating(false)
      setNewName('')
    } catch (err) {
      console.error('Failed to create folder:', err)
      alert('Could not create folder. That name may already be taken.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(folder: FolderRow) {
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? Classes inside will become unfoldered.`
      )
    )
      return

    try {
      const { error } = await supabase.from('folders').delete().eq('id', folder.id)
      if (error) throw error

      // If this was the active folder, clear the filter
      if (activeFolder === folder.id) {
        selectFolder('')
      }
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      router.refresh()
    } catch (err) {
      console.error('Failed to delete folder:', err)
      alert('Failed to delete folder. Please try again.')
    }
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {/* All tab */}
      <button
        onClick={() => selectFolder('')}
        className={[
          'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
          !activeFolder
            ? 'bg-accent-fire text-white'
            : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
        ].join(' ')}
      >
        All
      </button>

      {/* Folder tabs */}
      {folders.map((folder) => {
        const isActive = activeFolder === folder.id
        return (
          <div key={folder.id} className="relative flex-shrink-0 flex items-center">
            <button
              onClick={() => selectFolder(folder.id)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-accent-fire text-white pr-7'
                  : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary',
              ].join(' ')}
            >
              {folder.name}
            </button>
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(folder)
                }}
                aria-label={`Delete folder ${folder.name}`}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {/* Create folder */}
      {creating ? (
        <form onSubmit={handleCreate} className="flex items-center gap-1.5 flex-shrink-0">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="bg-bg-input border border-bg-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-dim w-32 focus:outline-none focus:border-accent-fire/50"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="px-2.5 py-1.5 bg-accent-fire text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="px-2.5 py-1.5 text-text-dim hover:text-text-primary rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={openCreate}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors border border-dashed border-bg-border"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Folder
        </button>
      )}
    </div>
  )
}
