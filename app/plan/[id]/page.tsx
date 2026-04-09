import { notFound } from 'next/navigation'
import { fetchPlan } from '@/app/lib/planQueries'
import type { Metadata } from 'next'
import type { PlanItem, ComponentType } from '@/app/lib/database.types'

interface Props {
  params: Promise<{ id: string }>
}

const TYPE_META: Record<ComponentType, { label: string; accent: string; bg: string }> = {
  warmup: { label: 'Warmup', accent: 'text-accent-gold', bg: 'bg-accent-gold/10' },
  station: { label: 'Station', accent: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  game: { label: 'Game', accent: 'text-accent-green', bg: 'bg-accent-green/10' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const plan = await fetchPlan(id)
  return {
    title: plan?.title
      ? `${plan.title} — Ninja H.E.R.O.S.`
      : "Today's Plan — Ninja H.E.R.O.S.",
  }
}

export default async function SharePlanPage({ params }: Props) {
  const { id } = await params
  const plan = await fetchPlan(id)

  if (!plan) notFound()

  const items: PlanItem[] = plan.items ?? []
  const totalMin = items.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0)

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
        <p className="text-text-dim text-xs mt-0.5">Today&apos;s Plan</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Plan summary */}
        <div className="card p-4">
          <h2 className="font-heading text-xl text-text-primary leading-tight mb-2">
            {plan.title || "Today\u2019s Plan"}
          </h2>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            {plan.curriculum && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{plan.curriculum}</span>
              </div>
            )}
            {totalMin > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-text-dim flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{totalMin} min</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Plan items */}
        {items.length > 0 && (
          <div>
            <p className="font-heading text-xs text-text-dim uppercase tracking-wider mb-3 px-1">
              Plan Sequence
            </p>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const meta = TYPE_META[item.component.type]
                const firstPhoto = item.component.photos?.[0] ?? null

                return (
                  <div key={item.localId} className="card overflow-hidden flex items-center gap-3 p-3">
                    {/* Number badge */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-fire/15 flex items-center justify-center">
                      <span className="font-heading text-sm text-accent-fire">{idx + 1}</span>
                    </div>

                    {/* Photo */}
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden">
                      {firstPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={firstPhoto} alt={item.component.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className={['w-full h-full', meta.bg].join(' ')} />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-[15px] text-text-primary leading-snug truncate">
                        {item.component.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={['text-xs font-semibold', meta.accent].join(' ')}>
                          {meta.label}
                        </span>
                        {item.component.curriculum && (
                          <>
                            <span className="text-text-dim/30 text-xs">·</span>
                            <span className="text-xs text-text-dim truncate">{item.component.curriculum}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    {item.durationMinutes && (
                      <div className="flex-shrink-0 text-right">
                        <span className="text-sm text-text-muted font-heading">{item.durationMinutes}</span>
                        <span className="text-xs text-text-dim ml-0.5">m</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-dim text-sm">This plan has no items yet.</p>
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
