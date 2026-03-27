'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow } from '@/app/lib/database.types'

export default function SettingsPage() {
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (adding) newInputRef.current?.focus()
  }, [adding])

  async function load() {
    const { data } = await supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setCurriculums((data as CurriculumRow[]) ?? [])
    setLoading(false)
  }

  async function handleRename(id: string) {
    const label = editingLabel.trim()
    if (!label) return
    await supabase.from('curriculums').update({ label }).eq('id', id)
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this curriculum? Existing classes won't be affected.")) return
    await supabase.from('curriculums').delete().eq('id', id)
    load()
  }

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    await supabase.from('curriculums').insert({
      label,
      age_group: label,
      sort_order: curriculums.length,
    })
    setNewLabel('')
    setAdding(false)
    load()
  }

  return (
    <div>
      {/* Header */}
      <div className="pt-2 mb-6">
        <h1 className="font-heading text-2xl text-text-primary leading-none">Settings</h1>
        <p className="text-text-dim text-xs mt-1">Just Tumble Ninja H.E.R.O.S.</p>
      </div>

      {/* Manage Curriculums */}
      <div className="card p-4">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider mb-4">
          Manage Curriculums
        </h2>

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {curriculums.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 py-3 ${i < curriculums.length - 1 || adding ? 'border-b border-bg-border' : ''}`}
              >
                {editingId === c.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(c.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="field-input flex-1 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleRename(c.id)}
                      className="text-accent-fire text-sm font-semibold px-2 py-1"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-text-dim text-sm px-2 py-1"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-text-primary">{c.label}</span>
                    {/* Pencil */}
                    <button
                      onClick={() => { setEditingId(c.id); setEditingLabel(c.label) }}
                      className="p-1.5 text-text-dim hover:text-text-primary transition-colors rounded-lg hover:bg-white/5"
                      aria-label="Rename curriculum"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Trash */}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-text-dim hover:text-accent-fire transition-colors rounded-lg hover:bg-white/5"
                      aria-label="Delete curriculum"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add new curriculum */}
            {adding ? (
              <div className="flex items-center gap-2 pt-3">
                <input
                  ref={newInputRef}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(false); setNewLabel('') }
                  }}
                  placeholder="Curriculum name..."
                  className="field-input flex-1 py-1.5 text-sm"
                />
                <button
                  onClick={handleAdd}
                  className="text-accent-fire text-sm font-semibold px-2 py-1"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setNewLabel('') }}
                  className="text-text-dim text-sm px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 w-full pt-3 text-sm text-accent-fire font-semibold hover:opacity-80 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Curriculum
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
