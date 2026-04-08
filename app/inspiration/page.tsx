'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { InspirationClipRow } from '@/app/lib/database.types'

// ── Helpers ──────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

// ── Domain placeholder colors ─────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  'youtube.com': '#ff0000',
  'youtu.be': '#ff0000',
  'instagram.com': '#e1306c',
  'tiktok.com': '#010101',
  'twitter.com': '#1d9bf0',
  'x.com': '#1d9bf0',
  'facebook.com': '#1877f2',
  'vimeo.com': '#1ab7ea',
}

function domainColor(domain: string | null): string {
  if (!domain) return '#1e2d4a'
  const key = Object.keys(DOMAIN_COLORS).find((k) => domain.includes(k))
  return key ? DOMAIN_COLORS[key] : '#1e2d4a'
}

// ── Main page ─────────────────────────────────────────────────

export default function InspirationPage() {
  const [clips, setClips] = useState<InspirationClipRow[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [metaDomain, setMetaDomain] = useState<string | null>(null)
  const [metaThumbnail, setMetaThumbnail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const lastFetchedUrl = useRef('')

  // Filter state
  const [searchQ, setSearchQ] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // ── Data loading ──────────────────────────────────────────

  const loadClips = useCallback(async () => {
    const { data } = await supabase
      .from('inspiration_clips')
      .select('*')
      .order('created_at', { ascending: false })
    setClips((data ?? []) as InspirationClipRow[])
    setLoading(false)
  }, [])

  useEffect(() => { loadClips() }, [loadClips])

  // ── Derived values ────────────────────────────────────────

  const allTags = Array.from(
    new Set(clips.flatMap((c) => c.tags))
  ).sort()

  const q = searchQ.toLowerCase()
  const filtered = clips.filter((c) => {
    const matchSearch =
      !q ||
      (c.title?.toLowerCase().includes(q) ?? false) ||
      (c.notes?.toLowerCase().includes(q) ?? false) ||
      (c.source_domain?.toLowerCase().includes(q) ?? false)
    const matchTag = !activeTag || c.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  // ── Metadata fetch ────────────────────────────────────────

  async function fetchMeta(url: string) {
    if (!isValidUrl(url) || url === lastFetchedUrl.current) return
    lastFetchedUrl.current = url
    setFetchingMeta(true)
    setMetaDomain(null)
    setMetaThumbnail(null)
    try {
      const res = await fetch(`/api/og-meta?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const data = await res.json()
        setMetaDomain(data.domain ?? null)
        setMetaThumbnail(data.thumbnail_url ?? null)
        if (data.title && !formTitle) setFormTitle(data.title)
      }
    } catch {
      // silently ignore — user can still save without metadata
    } finally {
      setFetchingMeta(false)
    }
  }

  // ── Form actions ──────────────────────────────────────────

  function openForm() {
    setFormUrl('')
    setFormTitle('')
    setFormTags('')
    setFormNotes('')
    setMetaDomain(null)
    setMetaThumbnail(null)
    setFormError(null)
    lastFetchedUrl.current = ''
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
  }

  async function handleSave() {
    const trimUrl = formUrl.trim()
    if (!trimUrl) { setFormError('URL is required'); return }
    if (!isValidUrl(trimUrl)) { setFormError('Enter a valid URL'); return }

    setSubmitting(true)
    setFormError(null)

    const tags = parseTags(formTags)
    const domain = metaDomain ?? (() => {
      try { return new URL(trimUrl).hostname.replace(/^www\./, '') } catch { return null }
    })()

    const { error } = await supabase.from('inspiration_clips').insert({
      url: trimUrl,
      title: formTitle.trim() || null,
      thumbnail_url: metaThumbnail,
      source_domain: domain,
      tags,
      notes: formNotes.trim() || null,
    })

    if (error) {
      setFormError('Save failed. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    closeForm()
    loadClips()
  }

  async function handleDelete(id: string) {
    await supabase.from('inspiration_clips').delete().eq('id', id)
    setClips((prev) => prev.filter((c) => c.id !== id))
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pt-2 mb-5">
        <div>
          <h1 className="font-heading text-xl text-text-primary leading-none">Inspiration</h1>
          <p className="text-text-dim text-xs mt-0.5">Saved clips &amp; references</p>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-accent-fire text-white font-heading text-sm rounded-xl active:scale-95 transition-all shadow-lg shadow-accent-fire/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Clip
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search clips..."
          className="w-full bg-bg-card border border-bg-border rounded-xl pl-9 pr-4 py-2.5 text-text-primary text-sm placeholder:text-text-dim/40 focus:outline-none focus:border-accent-fire/40 transition-colors"
        />
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 ${
                activeTag === tag
                  ? 'bg-accent-purple border-accent-purple text-white'
                  : 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-fire border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💡</div>
          <p className="font-heading text-text-muted text-lg">
            {clips.length === 0 ? 'No clips saved yet' : 'No matches found'}
          </p>
          {clips.length === 0 && (
            <p className="text-text-dim text-sm mt-2">
              Tap &ldquo;Add Clip&rdquo; to save your first video link
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((clip) => (
            <ClipCard key={clip.id} clip={clip} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Add Clip form overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60" onClick={closeForm} />
          {/* Bottom sheet */}
          <div className="bg-bg-card border-t border-bg-border rounded-t-3xl px-5 pt-4 pb-8 max-h-[92vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 bg-bg-border rounded-full mx-auto mb-4" />
            <h2 className="font-heading text-lg text-text-primary mb-4">Add Clip</h2>

            {/* URL */}
            <div className="mb-3">
              <label className="field-label">Video URL</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                onBlur={(e) => fetchMeta(e.target.value.trim())}
                placeholder="https://youtube.com/watch?v=..."
                className="field-input"
                autoFocus
              />
            </div>

            {/* Metadata preview */}
            {(fetchingMeta || metaDomain || metaThumbnail) && (
              <div className="mb-3 rounded-xl overflow-hidden border border-bg-border bg-bg-primary/50">
                {fetchingMeta ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-text-dim text-xs">
                    <div className="w-4 h-4 border-2 border-accent-fire border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    Fetching page info…
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-2.5">
                    {metaThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={metaThumbnail}
                        alt=""
                        className="w-16 h-10 rounded-lg object-cover flex-shrink-0 bg-bg-border"
                      />
                    ) : (
                      <div
                        className="w-16 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: domainColor(metaDomain) + '33' }}
                      >
                        <span className="text-[9px] font-heading text-text-dim">{metaDomain}</span>
                      </div>
                    )}
                    <p className="text-xs text-text-muted line-clamp-2 flex-1">
                      {formTitle || metaDomain || 'No title found'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className="mb-3">
              <label className="field-label">Title (optional)</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Auto-filled from URL, or enter your own…"
                className="field-input"
              />
            </div>

            {/* Tags */}
            <div className="mb-3">
              <label className="field-label">Tags (comma-separated)</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="parkour, balance, warmup ideas…"
                className="field-input"
              />
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="field-label">Notes (optional)</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="What caught your eye about this…"
                rows={2}
                className="field-textarea"
              />
            </div>

            {formError && (
              <p className="text-accent-fire text-xs mb-3">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-3 rounded-xl border border-bg-border text-text-dim font-heading text-sm active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-accent-fire text-white font-heading text-sm active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Save Clip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Clip card ─────────────────────────────────────────────────

function ClipCard({
  clip,
  onDelete,
}: {
  clip: InspirationClipRow
  onDelete: (id: string) => void
}) {
  const [imgError, setImgError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const bgColor = domainColor(clip.source_domain) + '33'

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Thumbnail — links out on click */}
      <a
        href={clip.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-video bg-bg-border flex-shrink-0"
      >
        {clip.thumbnail_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.thumbnail_url}
            alt={clip.title ?? ''}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: bgColor }}
          >
            {/* Play icon */}
            <svg className="w-7 h-7 text-white/40" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {clip.source_domain && (
              <span className="text-[10px] text-text-dim font-heading">{clip.source_domain}</span>
            )}
          </div>
        )}
        {/* Domain badge */}
        {clip.source_domain && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-heading uppercase tracking-wide">
            {clip.source_domain}
          </span>
        )}
      </a>

      {/* Content */}
      <div className="p-2.5 flex flex-col flex-1">
        <a
          href={clip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-text-primary text-xs font-semibold leading-snug line-clamp-2 mb-1.5 hover:text-accent-fire transition-colors"
        >
          {clip.title || clip.url}
        </a>

        {/* Tags */}
        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {clip.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple text-[9px] font-semibold border border-accent-purple/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {clip.notes && (
          <p className="text-text-dim text-[10px] leading-relaxed line-clamp-2">{clip.notes}</p>
        )}

        {/* Delete */}
        <div className="mt-auto pt-2 flex justify-end">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-text-dim px-2 py-0.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete(clip.id)}
                className="text-[10px] text-red-400 font-semibold px-2 py-0.5 rounded-md bg-red-900/20"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-text-dim/30 hover:text-text-dim/60 transition-colors p-0.5"
              aria-label="Delete clip"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
