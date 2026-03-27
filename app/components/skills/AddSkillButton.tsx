'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function AddSkillButton({ ageGroup }: { ageGroup: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('skills')
      .insert({ name: trimmed, age_group: ageGroup })

    if (err) {
      setError(
        err.code === '23505'
          ? `"${trimmed}" already exists.`
          : err.message
      )
      setSaving(false)
      return
    }

    setName('')
    setOpen(false)
    setSaving(false)
    // Refresh the server component to re-fetch skill recency
    router.refresh()
  }

  function handleClose() {
    setOpen(false)
    setName('')
    setError(null)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-1.5 text-sm font-heading text-accent-green hover:text-accent-green/80 transition-colors py-1.5 px-3 rounded-xl border border-accent-green/30 hover:bg-accent-green/5 flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Skill
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleClose()
          }}
          placeholder="New skill name..."
          className="field-input text-sm py-1.5 flex-1"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="py-1.5 px-3 bg-accent-green text-white text-sm font-heading rounded-xl disabled:opacity-50 transition-opacity flex-shrink-0"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={handleClose}
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 flex-shrink-0"
          aria-label="Cancel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  )
}
