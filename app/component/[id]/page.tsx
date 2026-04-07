import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow } from '@/app/lib/database.types'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase.from('components').select('title').eq('id', id).single()
  return {
    title: data?.title ? `${data.title} — Ninja H.E.R.O.S.` : 'Component — Ninja H.E.R.O.S.',
  }
}

const TYPE_META = {
  game: { label: 'Game', textColor: 'text-accent-green', badge: 'bg-accent-green/10 text-accent-green border border-accent-green/20' },
  warmup: { label: 'Warmup', textColor: 'text-accent-gold', badge: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/20' },
  station: { label: 'Station', textColor: 'text-accent-blue', badge: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' },
}

export default async function ShareComponentPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await supabase.from('components').select('*').eq('id', id).single()

  if (error || !data) notFound()

  const component = data as ComponentRow
  const meta = TYPE_META[component.type]
  const photos = component.photos ?? []

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-bg-primary pb-12">
      {/* Branding header */}
      <div className="bg-gradient-to-b from-accent-fire/20 to-transparent px-4 pt-8 pb-6 text-center">
        <p className="font-heading text-xs tracking-[0.2em] text-accent-fire uppercase mb-1">
          Just Tumble
        </p>
        <h1 className="font-heading text-2xl text-text-primary leading-tight">
          Ninja H.E.R.O.S.
        </h1>
        <p className="text-text-dim text-xs mt-0.5">Component Library</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Title + type */}
        <div className="flex items-start justify-between gap-3">
          <h2 className={`font-heading text-2xl leading-tight ${meta.textColor}`}>
            {component.title}
          </h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 mt-1 ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        {component.curriculum && (
          <p className="text-text-dim text-sm -mt-2">{component.curriculum}</p>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-bg-border bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0]}
              alt={component.title}
              className="w-full object-cover"
              style={{ maxHeight: '280px' }}
            />
            {photos.length > 1 && (
              <div className="flex overflow-x-auto gap-2 p-3" style={{ scrollSnapType: 'x mandatory' }}>
                {photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="flex-shrink-0 w-16 h-16 rounded-xl object-cover border border-bg-border opacity-80 hover:opacity-100 transition-opacity"
                    style={{ scrollSnapAlign: 'start' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details card */}
        <div className="card p-4 space-y-4">
          {(component.skills?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {component.skills!.map((skill) => (
                  <span key={skill} className="badge badge-skill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {component.duration_minutes != null && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Duration</p>
              <p className="text-sm text-text-primary">{component.duration_minutes} minutes</p>
            </div>
          )}

          {component.equipment && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Lane Name</p>
              <p className="text-sm font-bold text-accent-blue">{component.equipment}</p>
            </div>
          )}

          {component.description && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{component.description}</p>
            </div>
          )}

          {component.video_link && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Video</p>
              <a
                href={component.video_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue hover:bg-accent-blue/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Watch video
              </a>
            </div>
          )}

          {component.video_url && (
            <div>
              <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">Video</p>
              <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
                <video src={component.video_url} controls playsInline className="w-full" style={{ maxHeight: '240px' }} />
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-text-dim pb-4">
          Shared from Ninja H.E.R.O.S. Coach Hub
        </p>
      </div>
    </div>
  )
}
