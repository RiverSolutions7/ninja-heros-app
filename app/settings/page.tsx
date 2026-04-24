'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { CurriculumRow } from '@/app/lib/database.types'

export default function SettingsPage() {
  const router = useRouter()
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
      {/* ── Header — matches /library page header treatment ─────────── */}
      <div className="relative pt-2 mb-6">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10"
        />
        <h1 className="font-heading text-2xl text-text-primary leading-none">Settings</h1>
        <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
          Just Tumble · Ninja H.E.R.O.S.
        </p>
      </div>

      {/* ── Curriculums section ───────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim">
            Curriculums
          </p>
          {!loading && curriculums.length > 0 && (
            <>
              <span className="text-text-dim/40 text-[11px]">·</span>
              <span className="text-[11px] font-heading uppercase tracking-wider text-text-dim/60">
                {curriculums.length}
              </span>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {curriculums.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 bg-bg-card border border-bg-border rounded-xl px-4 py-2.5"
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
                      className="flex-1 bg-bg-input border border-bg-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-fire/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(c.id)}
                      className="font-heading text-sm text-accent-fire px-2 py-1 hover:opacity-80 transition-opacity"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-text-dim px-2 py-1 hover:text-text-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-heading text-[15px] text-text-primary leading-tight truncate">
                      {c.label}
                    </span>
                    {/* Pencil */}
                    <button
                      type="button"
                      onClick={() => { setEditingId(c.id); setEditingLabel(c.label) }}
                      className="p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 rounded-lg transition-all"
                      aria-label={`Rename ${c.label}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    {/* Trash */}
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-text-dim hover:text-accent-fire hover:bg-accent-fire/10 rounded-lg transition-all"
                      aria-label={`Delete ${c.label}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Add row */}
            {adding ? (
              <div className="flex items-center gap-2 bg-bg-card border border-accent-fire/40 rounded-xl px-4 py-2.5">
                <input
                  ref={newInputRef}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(false); setNewLabel('') }
                  }}
                  placeholder="Curriculum name…"
                  className="flex-1 bg-bg-input border border-bg-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-fire/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  className="font-heading text-sm text-accent-fire px-2 py-1 hover:opacity-80 transition-opacity"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewLabel('') }}
                  className="text-sm text-text-dim px-2 py-1 hover:text-text-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-transparent border border-dashed border-bg-border text-text-dim hover:text-accent-fire hover:border-accent-fire/40 font-heading text-sm py-3 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add curriculum
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Dev / Reset ───────────────────────────────────────── */}
      <section className="mt-8">
        <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim mb-3">Developer</p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('ninja-coach-profile')
            router.replace('/onboarding')
          }}
          className="w-full text-left bg-bg-card border border-bg-border rounded-xl px-4 py-3 font-heading text-sm text-accent-fire hover:bg-accent-fire/5 transition-colors"
        >
          Reset onboarding
        </button>
      </section>
    </div>
  )
}
