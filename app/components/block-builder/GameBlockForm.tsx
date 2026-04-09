'use client'

import { useRef, useState } from 'react'
import type { DraftGameBlock, DraftPhotoItem } from '@/app/lib/database.types'
import VideoCapture from './VideoCapture'
import SkillPickerModal from '@/app/components/skills/SkillPickerModal'

type SectionKey = 'photo' | 'video' | 'videolink' | 'description' | 'duration' | 'skills'

const SECTION_OPTIONS: { key: SectionKey; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'video', label: 'Video' },
  { key: 'videolink', label: 'Video Link' },
  { key: 'description', label: 'Description' },
  { key: 'duration', label: 'Duration' },
  { key: 'skills', label: 'Skills' },
]

function getInitialSections(block: DraftGameBlock): SectionKey[] {
  const s: SectionKey[] = []
  if ((block.photos ?? []).length > 0) s.push('photo')
  if (block.videoFile || block.videoPreview) s.push('video')
  if (block.video_link) s.push('videolink')
  if (block.description) s.push('description')
  if (block.duration_minutes != null) s.push('duration')
  if ((block.skills ?? []).length > 0) s.push('skills')
  return s
}

interface GameBlockFormProps {
  block: DraftGameBlock
  onChange: (changes: Partial<DraftGameBlock>) => void
  onRemove: () => void
  availableSkills: string[]
  onAddSkill: (name: string) => void
  ageGroup: string
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

export default function GameBlockForm({
  block,
  onChange,
  onRemove,
  availableSkills,
  onAddSkill,
  ageGroup,
}: GameBlockFormProps) {
  const [activeSections, setActiveSections] = useState<SectionKey[]>(() => getInitialSections(block))
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSkillPicker, setShowSkillPicker] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  const remainingOptions = SECTION_OPTIONS.filter((o) => !activeSections.includes(o.key))

  function addSection(key: SectionKey) {
    setActiveSections((prev) => [...prev, key])
    setMenuOpen(false)
  }

  function removeSection(key: SectionKey) {
    setActiveSections((prev) => prev.filter((k) => k !== key))
    switch (key) {
      case 'description': onChange({ description: '' }); break
      case 'videolink': onChange({ video_link: '' }); break
      case 'video': onChange({ videoFile: null, videoPreview: null }); break
      case 'photo': onChange({ photos: [] }); break
      case 'skills': onChange({ skills: [] }); break
      case 'duration': onChange({ duration_minutes: null }); break
    }
  }

  function handlePhotoAdded(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const newPhoto: DraftPhotoItem = {
      localId: crypto.randomUUID(),
      photoFile: file,
      photoPreview: URL.createObjectURL(file),
      photo_url: null,
    }
    onChange({ photos: [...(block.photos ?? []), newPhoto] })
    e.target.value = ''
  }

  function removePhoto(localId: string) {
    onChange({ photos: (block.photos ?? []).filter((p) => p.localId !== localId) })
  }

  function toggleSkill(skill: string) {
    const current = block.skills ?? []
    onChange({
      skills: current.includes(skill)
        ? current.filter((s) => s !== skill)
        : [...current, skill],
    })
  }

  function SectionHeader({ label, sectionKey }: { label: string; sectionKey: SectionKey }) {
    return (
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-dim uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={() => removeSection(sectionKey)}
          className="text-text-dim hover:text-red-400 transition-colors p-1 rounded"
        >
          <XIcon />
        </button>
      </div>
    )
  }

  return (
    <div className="card border-l-4 border-accent-green">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-green/[0.12] to-transparent border-b border-bg-border rounded-t-2xl">
        <span className="font-heading text-accent-green text-sm tracking-wide uppercase">
          Game / Activity
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-text-dim hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Game Name — always shown */}
        <div>
          <label className="field-label">Game Name</label>
          <input
            type="text"
            value={block.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Ninja Freeze Tag, Floor is Lava..."
            className="field-input"
          />
        </div>

        {/* Dynamic sections */}
        {activeSections.map((key) => {
          if (key === 'photo') return (
            <div key="photo">
              <SectionHeader label="Photo" sectionKey="photo" />
              {(block.photos ?? []).length > 0 && (
                <div
                  className="flex overflow-x-auto gap-2 pb-1 mb-2"
                  style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                >
                  {block.photos!.map((photo) => (
                    <div
                      key={photo.localId}
                      className="relative flex-shrink-0 rounded-xl overflow-hidden"
                      style={{ scrollSnapAlign: 'start', width: '100%' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.photoPreview ?? photo.photo_url ?? ''}
                        alt="Game photo"
                        className="w-full object-cover rounded-xl"
                        style={{ maxHeight: '200px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.localId)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue/80 transition-colors py-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => libraryRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text-primary transition-colors py-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Library
                </button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoAdded} className="hidden" />
              <input ref={libraryRef} type="file" accept="image/*" onChange={handlePhotoAdded} className="hidden" />
            </div>
          )

          if (key === 'video') return (
            <div key="video">
              <SectionHeader label="Video" sectionKey="video" />
              <VideoCapture
                preview={block.videoPreview ?? null}
                onFileSelected={(file, preview) => onChange({ videoFile: file, videoPreview: preview })}
              />
            </div>
          )

          if (key === 'videolink') return (
            <div key="videolink">
              <SectionHeader label="Video Link" sectionKey="videolink" />
              <input
                type="url"
                value={block.video_link}
                onChange={(e) => onChange({ video_link: e.target.value })}
                placeholder="https://..."
                className="field-input"
                inputMode="url"
              />
            </div>
          )

          if (key === 'description') return (
            <div key="description">
              <SectionHeader label="Description" sectionKey="description" />
              <textarea
                value={block.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="How do you play? Special rules? Team sizes?"
                rows={3}
                className="field-textarea"
              />
            </div>
          )

          if (key === 'duration') return (
            <div key="duration">
              <SectionHeader label="Duration" sectionKey="duration" />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={block.duration_minutes ?? ''}
                  onChange={(e) =>
                    onChange({ duration_minutes: e.target.value ? parseInt(e.target.value, 10) : null })
                  }
                  placeholder="0"
                  className="field-input w-24"
                />
                <span className="text-text-dim text-sm">min</span>
              </div>
            </div>
          )

          if (key === 'skills') return (
            <div key="skills">
              <SectionHeader label="Skills" sectionKey="skills" />
              <div className="flex flex-wrap gap-2">
                {(block.skills ?? []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-green/20 border border-accent-green/40 text-accent-green"
                  >
                    {skill}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setShowSkillPicker(true)}
                  className="flex items-center gap-1 px-2.5 py-1 border border-dashed border-accent-green/40 rounded-full text-xs text-accent-green hover:bg-accent-green/10 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {(block.skills ?? []).length > 0 ? 'Edit Skills' : 'Add Skills'}
                </button>
              </div>
              {showSkillPicker && (
                <SkillPickerModal
                  availableSkills={availableSkills}
                  selectedSkills={block.skills ?? []}
                  ageGroup={ageGroup}
                  onToggle={toggleSkill}
                  onAddSkill={onAddSkill}
                  onClose={() => setShowSkillPicker(false)}
                />
              )}
            </div>
          )

          return null
        })}

        {/* + Add button */}
        {remainingOptions.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 w-full justify-center text-sm text-text-dim hover:text-text-primary py-2 px-3 border border-dashed border-bg-border hover:border-text-dim/30 rounded-xl transition-colors"
            >
              <PlusIcon />
              Add
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-card border border-bg-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {remainingOptions.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => addSection(o.key)}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-left"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
