'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { HandoffNoteRow } from '@/app/lib/database.types'

interface HandoffNotesProps {
  initialNotes: HandoffNoteRow[]
}

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today at ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${time}`
  )
}

export default function HandoffNotes({ initialNotes }: HandoffNotesProps) {
  const [notes, setNotes] = useState<HandoffNoteRow[]>(initialNotes)
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function openForm() {
    setContent('')
    setShowForm(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('handoff_notes')
        .insert({
          content: trimmed,
          author_name: authorName.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setNotes((prev) => [data as HandoffNoteRow, ...prev])
      setContent('')
      setAuthorName('')
      setShowForm(false)
    } catch (err) {
      console.error('Failed to post note:', err)
      alert('Failed to post note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this note?')) return
    const { error } = await supabase.from('handoff_notes').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete note:', error)
      alert('Failed to delete note. Please try again.')
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id))
    }
  }

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider">
          Coach Notes
        </h2>
        {!showForm && (
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 text-xs font-heading text-accent-fire hover:text-accent-fire/80 transition-colors py-1 px-2 rounded-lg hover:bg-accent-fire/10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        )}
      </div>

      {/* Add note form */}
      {showForm && (
        <form onSubmit={handlePost} className="card p-4 mb-3 space-y-3">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note for the team..."
            rows={3}
            className="field-textarea"
            disabled={saving}
          />
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            className="field-input"
            disabled={saving}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="flex-1 py-2.5 bg-accent-fire text-white font-heading text-sm rounded-xl disabled:opacity-50 transition-colors active:scale-95"
            >
              {saving ? 'Posting…' : 'Post Note'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm text-text-dim hover:text-text-primary border border-bg-border rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm ? (
        <div className="card px-4 py-5 text-center">
          <p className="text-sm text-text-dim">No notes yet. Leave a message for the team.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="card px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <p className="text-xs text-text-dim mt-1.5">
                    {note.author_name ? (
                      <span className="text-text-muted font-semibold">{note.author_name}</span>
                    ) : (
                      <span>Anonymous</span>
                    )}
                    {' · '}
                    {formatNoteDate(note.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-text-dim hover:text-accent-fire hover:bg-accent-fire/10 transition-colors mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
