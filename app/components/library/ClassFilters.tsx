'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow, FolderRow } from '@/app/lib/database.types'

const SELECT_CLS =
  'appearance-none cursor-pointer w-full bg-bg-input border border-bg-border rounded-xl pl-3 pr-7 py-2 text-xs text-text-muted focus:outline-none focus:border-accent-fire/50 transition-colors'

const Chevron = () => (
  <svg
    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

interface ClassFiltersProps {
  basePath?: string
}

export default function ClassFilters({ basePath = '/library' }: ClassFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const age = searchParams.get('age') ?? ''
  const folder = searchParams.get('folder') ?? ''
  const dateRange = searchParams.get('dateRange') ?? ''

  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setCurriculums((data as CurriculumRow[]) ?? []))
    supabase
      .from('folders')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setFolders((data as FolderRow[]) ?? []))
  }, [])

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
  )

  function handleFolderChange(value: string) {
    if (value === '__new__') {
      setNewFolderName('')
      setCreatingFolder(true)
      setTimeout(() => folderInputRef.current?.focus(), 50)
      return
    }
    update('folder', value)
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    const name = newFolderName.trim()
    if (!name) return
    setSavingFolder(true)
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({ name, sort_order: folders.length })
        .select()
        .single()
      if (error) throw error
      const newFolder = data as FolderRow
      setFolders((prev) => [...prev, newFolder])
      setCreatingFolder(false)
      update('folder', newFolder.id)
    } catch {
      alert('Could not create folder.')
    } finally {
      setSavingFolder(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search classes..."
          value={q}
          onChange={(e) => update('q', e.target.value)}
          className="field-input pl-10"
        />
      </div>

      {/* 3 dropdowns in one row */}
      <div className="flex items-center gap-2">
        {/* Folder */}
        <div className="relative flex-1 min-w-0">
          <select
            value={folder}
            onChange={(e) => handleFolderChange(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value="__new__">+ New Folder</option>
          </select>
          <Chevron />
        </div>

        {/* Curriculum */}
        <div className="relative flex-1 min-w-0">
          <select
            value={age}
            onChange={(e) => update('age', e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Curriculum</option>
            {curriculums.map((c) => (
              <option key={c.age_group} value={c.age_group}>
                {c.label}
              </option>
            ))}
          </select>
          <Chevron />
        </div>

        {/* Date */}
        <div className="relative flex-1 min-w-0">
          <select
            value={dateRange}
            onChange={(e) => update('dateRange', e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">All Time</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
          </select>
          <Chevron />
        </div>
      </div>

      {/* Inline folder creation */}
      {creatingFolder && (
        <form onSubmit={handleCreateFolder} className="flex items-center gap-1.5">
          <input
            ref={folderInputRef}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 bg-bg-input border border-bg-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-accent-fire/50"
            disabled={savingFolder}
          />
          <button
            type="submit"
            disabled={savingFolder || !newFolderName.trim()}
            className="px-3 py-2 bg-accent-fire text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {savingFolder ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setCreatingFolder(false)}
            className="px-3 py-2 text-text-dim hover:text-text-primary rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  )
}
