'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { InspirationClipRow } from '@/app/lib/database.types'

// ── YouTube IFrame API types ───────────────────────────────────

interface YTPlayerInstance {
  getCurrentTime(): number
  destroy(): void
}

declare global {
  interface Window {
    YT: { Player: new (el: HTMLElement, opts: object) => YTPlayerInstance }
    onYouTubeIframeAPIReady: () => void
  }
}

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

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  )
  return match?.[1] ?? null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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

  // Add form state
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

  // Clipper state
  const [clipperClip, setClipperClip] = useState<InspirationClipRow | null>(null)
  const [startSec, setStartSec] = useState<number | null>(null)
  const [endSec, setEndSec] = useState<number | null>(null)
  const [savingClip, setSavingClip] = useState(false)
  const playerRef = useRef<YTPlayerInstance | null>(null)
  const playerDivRef = useRef<HTMLDivElement | null>(null)
  const ytApiReady = useRef(false)
  const clipperOpen = useRef(false)

  // Clip player state (inline segment player)
  const [playingClip, setPlayingClip] = useState<InspirationClipRow | null>(null)

  // ── Load YouTube IFrame API once ──────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (document.getElementById('yt-api-script')) {
      // script already injected (e.g. HMR), check if API is ready
      if (window.YT?.Player) ytApiReady.current = true
      return
    }
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady.current = true
      // If clipper is already open, create the player now
      if (clipperOpen.current && playerDivRef.current) {
        initYTPlayer()
      }
    }
    const script = document.createElement('script')
    script.id = 'yt-api-script'
    script.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(script)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function initYTPlayer() {
    if (!clipperClipRef.current || !playerDivRef.current || !window.YT?.Player) return
    const videoId = extractYouTubeId(clipperClipRef.current.url)
    if (!videoId) return
    playerRef.current?.destroy()
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId,
      playerVars: { playsinline: 1, rel: 0 },
    })
  }

  // Keep a ref to clipperClip so initYTPlayer can access the latest value
  const clipperClipRef = useRef<InspirationClipRow | null>(null)
  clipperClipRef.current = clipperClip

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
      // silently ignore
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

  function closeForm() { setShowForm(false) }

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
      start_seconds: null,
      end_seconds: null,
    })

    if (error) {
      console.error('inspiration_clips insert error:', JSON.stringify(error))
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

  // ── Clipper actions ───────────────────────────────────────

  function openClipper(clip: InspirationClipRow) {
    setClipperClip(clip)
    setStartSec(null)
    setEndSec(null)
    clipperOpen.current = true
  }

  function closeClipper() {
    playerRef.current?.destroy()
    playerRef.current = null
    setClipperClip(null)
    clipperOpen.current = false
  }

  function markStart() {
    const t = playerRef.current?.getCurrentTime()
    if (t != null) setStartSec(Math.floor(t))
  }

  function markEnd() {
    const t = playerRef.current?.getCurrentTime()
    if (t != null) setEndSec(Math.floor(t))
  }

  async function saveClip() {
    if (!clipperClip || startSec == null || endSec == null || endSec <= startSec) return
    setSavingClip(true)
    const domain = clipperClip.source_domain
    const { error } = await supabase.from('inspiration_clips').insert({
      url: clipperClip.url,
      title: clipperClip.title ? `${clipperClip.title} (clip)` : null,
      thumbnail_url: clipperClip.thumbnail_url,
      source_domain: domain,
      tags: clipperClip.tags,
      notes: clipperClip.notes,
      start_seconds: startSec,
      end_seconds: endSec,
    })
    setSavingClip(false)
    if (!error) {
      closeClipper()
      loadClips()
    }
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
            <ClipCard
              key={clip.id}
              clip={clip}
              onDelete={handleDelete}
              onClip={openClipper}
              onPlay={setPlayingClip}
            />
          ))}
        </div>
      )}

      {/* ── Add Clip form overlay ────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex flex-col">
          <div className="flex-1 bg-black/60" onClick={closeForm} />
          <div className="bg-bg-card border-t border-bg-border rounded-t-3xl px-5 pt-4 pb-8 max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 bg-bg-border rounded-full mx-auto mb-4" />
            <h2 className="font-heading text-lg text-text-primary mb-4">Add Clip</h2>

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
                      <img src={metaThumbnail} alt="" className="w-16 h-10 rounded-lg object-cover flex-shrink-0 bg-bg-border" />
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

            {formError && <p className="text-accent-fire text-xs mb-3">{formError}</p>}

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
                {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Clip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clipper sheet ─────────────────────────────────────── */}
      {clipperClip && (
        <div className="fixed inset-0 z-[200] flex flex-col">
          <div className="flex-1 bg-black/80" onClick={closeClipper} />
          <div className="bg-bg-card border-t border-bg-border rounded-t-3xl pt-4 pb-8 max-h-[92vh] overflow-y-auto">
            <div className="w-10 h-1 bg-bg-border rounded-full mx-auto mb-3" />
            <div className="px-5 mb-3 flex items-center justify-between">
              <h2 className="font-heading text-base text-text-primary">Clip a Segment</h2>
              <span className="text-xs text-text-dim">Play the video, then mark your segment</span>
            </div>

            {/* YouTube player */}
            <div className="relative w-full aspect-video bg-black mb-4">
              <div
                ref={(el) => {
                  playerDivRef.current = el
                  if (el && clipperClip && ytApiReady.current && !playerRef.current) {
                    initYTPlayer()
                  }
                }}
                className="w-full h-full"
              />
            </div>

            {/* Mark buttons */}
            <div className="px-5 space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={markStart}
                  className="flex-1 py-3 rounded-xl border border-bg-border font-heading text-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-text-muted hover:border-accent-green/50 hover:text-accent-green"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                  {startSec != null ? `Start: ${formatTime(startSec)} ✓` : 'Mark Start'}
                </button>
                <button
                  type="button"
                  onClick={markEnd}
                  className="flex-1 py-3 rounded-xl border border-bg-border font-heading text-sm transition-all active:scale-95 flex items-center justify-center gap-2 text-text-muted hover:border-accent-fire/50 hover:text-accent-fire"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H3" />
                  </svg>
                  {endSec != null ? `End: ${formatTime(endSec)} ✓` : 'Mark End'}
                </button>
              </div>

              {/* Segment preview */}
              {startSec != null && endSec != null && (
                <div className={`rounded-xl px-4 py-3 text-sm font-heading text-center ${
                  endSec > startSec
                    ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                    : 'bg-accent-fire/10 text-accent-fire border border-accent-fire/20'
                }`}>
                  {endSec > startSec
                    ? `${formatTime(startSec)} → ${formatTime(endSec)} · ${formatTime(endSec - startSec)} clip`
                    : 'End must be after start — adjust your marks'}
                </div>
              )}

              {/* Save / Cancel */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeClipper}
                  className="flex-1 py-3 rounded-xl border border-bg-border text-text-dim font-heading text-sm active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveClip}
                  disabled={savingClip || startSec == null || endSec == null || endSec <= startSec}
                  className="flex-1 py-3 rounded-xl bg-accent-fire text-white font-heading text-sm active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {savingClip
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Save Clip to Inspire'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Clip player modal ─────────────────────────────────── */}
      {playingClip && playingClip.start_seconds != null && playingClip.end_seconds != null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={() => setPlayingClip(null)}
        >
          <div className="w-full max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-heading text-text-primary line-clamp-1">
                {playingClip.title ?? 'Clip'}
              </p>
              <span className="text-xs text-text-dim">
                {formatTime(playingClip.start_seconds)} → {formatTime(playingClip.end_seconds)}
              </span>
            </div>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(playingClip.url)}?start=${playingClip.start_seconds}&end=${playingClip.end_seconds}&autoplay=1&playsinline=1&rel=0`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <button
              type="button"
              onClick={() => setPlayingClip(null)}
              className="mt-3 w-full py-2.5 rounded-xl border border-bg-border text-text-dim font-heading text-sm active:scale-95 transition-all"
            >
              Close
            </button>
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
  onClip,
  onPlay,
}: {
  clip: InspirationClipRow
  onDelete: (id: string) => void
  onClip: (clip: InspirationClipRow) => void
  onPlay: (clip: InspirationClipRow) => void
}) {
  const [imgError, setImgError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const bgColor = domainColor(clip.source_domain) + '33'
  const youtubeId = extractYouTubeId(clip.url)
  const isClip = clip.start_seconds != null && clip.end_seconds != null

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-border flex-shrink-0">
        {isClip ? (
          // Clip cards: tap to play inline
          <button
            type="button"
            onClick={() => onPlay(clip)}
            className="block w-full h-full"
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
              <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ backgroundColor: bgColor }}>
                <svg className="w-7 h-7 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
            {/* Play clip overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-accent-fire flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        ) : (
          // Regular cards: link out
          <a href={clip.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {clip.thumbnail_url && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clip.thumbnail_url}
                alt={clip.title ?? ''}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ backgroundColor: bgColor }}>
                <svg className="w-7 h-7 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {clip.source_domain && (
                  <span className="text-[10px] text-text-dim font-heading">{clip.source_domain}</span>
                )}
              </div>
            )}
          </a>
        )}

        {/* Domain badge */}
        {clip.source_domain && (
          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-heading uppercase tracking-wide">
            {clip.source_domain}
          </span>
        )}

        {/* Clip time badge */}
        {isClip && (
          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-accent-fire/90 text-white text-[9px] font-heading">
            {formatTime(clip.start_seconds!)} → {formatTime(clip.end_seconds!)}
          </span>
        )}
      </div>

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

        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {clip.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple text-[9px] font-semibold border border-accent-purple/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        {clip.notes && (
          <p className="text-text-dim text-[10px] leading-relaxed line-clamp-2">{clip.notes}</p>
        )}

        {/* Footer actions */}
        <div className="mt-auto pt-2 flex items-center justify-between">
          {/* Clip button — only for YouTube, only if not already a clip */}
          {youtubeId && !isClip ? (
            <button
              type="button"
              onClick={() => onClip(clip)}
              className="flex items-center gap-1 text-[10px] text-text-dim/50 hover:text-accent-fire transition-colors px-1 py-0.5 rounded"
              title="Clip a segment"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
              </svg>
              Clip
            </button>
          ) : <span />}

          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-[10px] text-text-dim px-2 py-0.5">Cancel</button>
              <button type="button" onClick={() => onDelete(clip.id)} className="text-[10px] text-red-400 font-semibold px-2 py-0.5 rounded-md bg-red-900/20">Delete</button>
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
