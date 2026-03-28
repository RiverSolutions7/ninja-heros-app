import { notFound } from 'next/navigation'
import { fetchFullClass } from '@/app/lib/queries'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cls = await fetchFullClass(id)
  return {
    title: cls?.title
      ? `${cls.title} — Ninja H.E.R.O.S.`
      : 'Class Plan — Ninja H.E.R.O.S.',
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ShareClassPage({ params }: Props) {
  const { id } = await params
  const cls = await fetchFullClass(id)

  if (!cls) notFound()

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
        <p className="text-text-dim text-xs mt-0.5">Class Plan</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Class summary card */}
        <div className="card p-4">
          <h2 className="font-heading text-xl text-text-primary leading-tight mb-3">
            {cls.title || 'Untitled Class'}
          </h2>
          <div className="space-y-1.5 text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(cls.class_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{cls.age_group}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{cls.difficulty}</span>
            </div>
          </div>

          {cls.notes && (
            <div className="mt-3 pt-3 border-t border-bg-border">
              <p className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-1.5">
                Coach Notes
              </p>
              <p className="text-sm text-text-muted leading-relaxed italic">{cls.notes}</p>
            </div>
          )}
        </div>

        {/* Class sequence */}
        {cls.blocks.length > 0 && (
          <div>
            <p className="font-heading text-xs text-text-dim uppercase tracking-wider mb-3 px-1">
              Class Sequence
            </p>

            <div className="space-y-3">
              {cls.blocks.map((block, blockIdx) => {
                if (block.type === 'warmup') {
                  return (
                    <div key={block.block.id} className="card overflow-hidden border-l-4 border-accent-gold">
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-gold/[0.10] to-transparent flex items-center gap-2.5">
                        <span className="text-accent-gold font-heading text-xs uppercase tracking-wider">Warm-Up</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold font-semibold">
                          {block.data.time}
                        </span>
                      </div>
                      <div className="px-4 pb-4 pt-2.5">
                        <p className="text-sm text-text-primary leading-relaxed">
                          {block.data.description}
                        </p>
                        {block.data.skill_focus && (
                          <p className="text-xs text-text-muted mt-1.5">
                            Focus: {block.data.skill_focus}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }

                if (block.type === 'lane') {
                  const laneNumber =
                    cls.blocks.slice(0, blockIdx).filter((b) => b.type === 'lane').length + 1
                  const heading = block.data.instructor_name
                    ? `Lane ${laneNumber} — ${block.data.instructor_name}`
                    : `Lane ${laneNumber}`

                  return (
                    <div key={block.block.id} className="card overflow-hidden border-l-4 border-accent-fire">
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-fire/[0.10] to-transparent">
                        <span className="font-heading text-sm text-accent-fire">{heading}</span>
                      </div>

                      {block.data.core_skills.length > 0 && (
                        <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
                          {block.data.core_skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-purple/10 border border-accent-purple/20 text-accent-purple"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {block.stations.length > 0 && (
                        <div className="pb-4 space-y-4">
                          {block.stations.map((station, stIdx) => {
                            const urls = station.photo_urls?.length > 0
                              ? station.photo_urls
                              : station.photo_url ? [station.photo_url] : []
                            return (
                              <div key={station.id}>
                                <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2 px-4">
                                  Station {stIdx + 1}
                                </p>
                                {/* Photos — full-width swipeable */}
                                {urls.length > 0 && (
                                  <div className="mb-3">
                                    <div
                                      className="flex overflow-x-auto gap-2 px-4"
                                      style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                                    >
                                      {urls.map((url, pi) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          key={pi}
                                          src={url}
                                          alt={`Station ${stIdx + 1} photo ${pi + 1}`}
                                          className="flex-shrink-0 w-full rounded-xl object-cover"
                                          style={{ scrollSnapAlign: 'start', maxHeight: '240px' }}
                                        />
                                      ))}
                                    </div>
                                    {urls.length > 1 && (
                                      <div className="flex justify-center gap-1 mt-1.5">
                                        {urls.map((_, pi) => (
                                          <span key={pi} className="w-1.5 h-1.5 rounded-full bg-text-dim/40" />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className="px-4">
                                  {station.equipment && (
                                    <p className="text-xs font-bold text-accent-blue mb-1">
                                      {station.equipment}
                                    </p>
                                  )}
                                  <p className="text-sm text-text-primary leading-snug">
                                    {station.description}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {block.data.video_url && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">
                            Course Video
                          </p>
                          <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
                            <video
                              src={block.data.video_url}
                              controls
                              playsInline
                              className="w-full"
                              style={{ maxHeight: '240px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (block.type === 'game') {
                  return (
                    <div key={block.block.id} className="card overflow-hidden border-l-4 border-accent-green">
                      <div className="px-4 py-3 bg-gradient-to-r from-accent-green/[0.10] to-transparent flex items-center gap-2.5">
                        <span className="text-accent-green font-heading text-xs uppercase tracking-wider">Game</span>
                        <span className="text-sm font-bold text-text-primary truncate">{block.data.name}</span>
                      </div>
                      <div className="px-4 pb-4 pt-2.5">
                        {block.data.description && (
                          <p className="text-sm text-text-primary leading-relaxed mb-2">
                            {block.data.description}
                          </p>
                        )}
                        {block.data.video_link && (
                          <a
                            href={block.data.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-blue"
                          >
                            Watch video
                          </a>
                        )}
                        {block.data.video_url && (
                          <div className="mt-3">
                            <p className="text-xs font-heading text-text-dim uppercase tracking-wider mb-2">
                              Game Video
                            </p>
                            <div className="rounded-xl overflow-hidden border border-bg-border bg-black">
                              <video
                                src={block.data.video_url}
                                controls
                                playsInline
                                className="w-full"
                                style={{ maxHeight: '240px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-2">
          <p className="text-xs text-text-dim/50 font-heading tracking-wider">
            NINJA H.E.R.O.S. · JUST TUMBLE
          </p>
        </div>
      </div>
    </div>
  )
}
