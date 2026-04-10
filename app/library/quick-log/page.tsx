'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { uploadStationPhoto } from '@/app/lib/uploadPhoto'
import type { AgeGroup, CurriculumRow, DraftPhotoItem } from '@/app/lib/database.types'

export default function QuickLogPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [classDate, setClassDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<DraftPhotoItem[]>([])
  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('curriculums')
      .select('*')
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        const rows = (data as CurriculumRow[]) ?? []
        setCurriculums(rows)
        if (rows.length > 0 && !ageGroup) setAgeGroup(rows[0].age_group)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePhotoFiles(files: FileList | null) {
    if (!files) return
    const newPhotos: DraftPhotoItem[] = Array.from(files).map((f) => ({
      localId: crypto.randomUUID(),
      photoFile: f,
      photoPreview: URL.createObjectURL(f),
      photo_url: null,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(localId: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.localId === localId)
      if (item?.photoPreview) URL.revokeObjectURL(item.photoPreview)
      return prev.filter((p) => p.localId !== localId)
    })
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    setSubmitting(true)

    try {
      // Upload photos
      const uploadedUrls: string[] = []
      for (const p of photos) {
        if (p.photoFile) {
          const url = await uploadStationPhoto(p.photoFile)
          uploadedUrls.push(url)
        }
      }

      // Insert class row
      const { data, error } = await supabase
        .from('classes')
        .insert({
          title: title.trim(),
          class_date: classDate,
          age_group: ageGroup,
          difficulty: 'Intermediate',
          notes: notes.trim() || null,
          photos: uploadedUrls.filter((u) => !u.startsWith('blob:')),
        })
        .select('id')
        .single()

      if (error) throw error
      router.push(`/library/${data.id}`)
    } catch (err) {
      console.error('Quick log save failed:', err)
      alert('Failed to save. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="relative flex items-center gap-3 pt-2 mb-5">
        <div className="absolute inset-x-0 -top-4 h-24 bg-gradient-to-b from-accent-fire/[0.07] to-transparent pointer-events-none rounded-2xl -z-10" />
        <Link
          href="/library"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors -ml-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">Quick Log</h1>
          <p className="flex items-center gap-1.5 text-text-dim text-xs mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-fire inline-block opacity-60" />
            Just Tumble · Ninja H.E.R.O.S.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="field-label" htmlFor="title">
            Title <span className="text-accent-fire">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
            placeholder="Class title..."
            className="field-input"
          />
          {titleError && <p className="text-accent-fire text-xs mt-1">{titleError}</p>}
        </div>

        {/* Date + Curriculum */}
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <label className="field-label" htmlFor="classDate">Date</label>
            <input
              id="classDate"
              type="date"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
              className="field-input"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="field-label" htmlFor="curriculum">Curriculum</label>
            <div className="relative">
              <select
                id="curriculum"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="field-select pr-8"
              >
                {curriculums.map((c) => (
                  <option key={c.id} value={c.age_group}>{c.label}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Notes textarea */}
        <div>
          <label className="field-label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you cover? Warmup, stations, games, notes for next time..."
            rows={5}
            className="field-textarea"
          />
        </div>

        {/* Photo buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted border border-bg-border rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted border border-bg-border rounded-xl px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            From Library
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoFiles(e.target.files)} />
        </div>

        {/* Photo thumbnails */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <div key={p.localId} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoPreview!}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover border border-bg-border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.localId)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-bg-primary border border-bg-border rounded-full flex items-center justify-center text-text-dim hover:text-accent-fire transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="px-1 mt-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 bg-accent-fire text-white font-heading text-base px-4 py-3.5 rounded-xl active:scale-95 transition-all shadow-glow-fire min-h-[52px] disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Save Quick Log'
          )}
        </button>
      </div>
    </div>
  )
}
