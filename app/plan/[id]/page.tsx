// ============================================================
// Share view — public plan link.
// ------------------------------------------------------------
// The only face outsiders (parents, visiting coaches, front
// desk) see of the app. Leans fully into the editorial voice:
// masthead lockup, big type, one hot color (fire red), no UI
// chrome that reads as "dashboard." Uses the same ComponentCard
// the library + picker do so the visual grammar stays unified
// across the whole product.
// ============================================================

import { notFound } from 'next/navigation'
import { fetchPlan } from '@/app/lib/planQueries'
import type { Metadata } from 'next'
import type { PlanItem, PlanRow } from '@/app/lib/database.types'
import ComponentCard from '@/app/components/library/ComponentCard'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const plan = await fetchPlan(id)
  return {
    title: plan?.title
      ? `${plan.title} — Ninja H.E.R.O.S.`
      : 'Class Plan — Ninja H.E.R.O.S.',
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Falls back to a composition-count label when no title was set. */
function planDisplayTitle(plan: PlanRow): string {
  if (plan.title) return plan.title
  const items = plan.items ?? []
  const stations = items.filter((i) => i.component.type === 'station').length
  const games = items.filter((i) => i.component.type === 'game').length
  const parts: string[] = []
  if (stations > 0) parts.push(`${stations} Station${stations > 1 ? 's' : ''}`)
  if (games > 0) parts.push(`${games} Game${games > 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(' · ') : 'Class Plan'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SharePlanPage({ params }: Props) {
  const { id } = await params
  const plan = await fetchPlan(id)

  if (!plan) notFound()

  const items: PlanItem[] = plan.items ?? []
  const totalMin = items.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0)
  const dateString = formatLongDate(plan.plan_date)
  const displayTitle = planDisplayTitle(plan)

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-bg-primary pb-20">
      {/* ── Editorial masthead ──────────────────────────────────── */}
      {/* Fire-red aura behind the brand lockup; quiet on small phones,
          unmistakable on tablet. */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-accent-fire/[0.16] via-accent-fire/[0.04] to-transparent pointer-events-none"
        />
        <div className="relative px-6 pt-14 pb-9 max-w-2xl mx-auto">
          <p className="text-accent-fire text-[10px] font-heading tracking-[0.34em] uppercase mb-3">
            Just Tumble
          </p>
          <h1
            className="font-heading text-text-primary leading-[0.95]"
            style={{ fontSize: 'clamp(32px, 9vw, 48px)' }}
          >
            Ninja H.E.R.O.S.
          </h1>
          <p className="text-text-dim text-[11px] font-heading uppercase tracking-[0.24em] mt-3">
            Class Plan
          </p>
        </div>
      </div>

      {/* ── Plan title block ────────────────────────────────────── */}
      <div className="px-6 max-w-2xl mx-auto">
        {/* Metadata row — date · curriculum */}
        {(dateString || plan.curriculum) && (
          <div className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide mb-2">
            {dateString && <span className="text-text-dim">{dateString}</span>}
            {dateString && plan.curriculum && <span className="text-text-dim/40">·</span>}
            {plan.curriculum && <span className="text-text-dim">{plan.curriculum}</span>}
          </div>
        )}
        <h2
          className="font-heading text-text-primary leading-[1.15]"
          style={{ fontSize: 'clamp(22px, 5.5vw, 28px)' }}
        >
          {displayTitle}
        </h2>
        {/* Counts */}
        <p className="text-text-muted text-xs mt-2.5">
          {items.length} {items.length === 1 ? 'item' : 'items'}
          {totalMin > 0 && (
            <>
              <span className="text-text-dim/40 mx-1.5">·</span>
              {totalMin} min
            </>
          )}
        </p>
      </div>

      {/* ── Items ──────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="mt-9 px-4 max-w-2xl mx-auto flex flex-col gap-3">
          {items.map((item) => {
            // Prefer the plan-session duration (what this class actually runs)
            // over the library default — outsiders need to see today's timing.
            const displayComponent = {
              ...item.component,
              duration_minutes: item.durationMinutes ?? item.component.duration_minutes,
            }
            return (
              <div key={item.localId} className="flex flex-col">
                <ComponentCard component={displayComponent} />
                {item.coachNote && (
                  <p className="text-[14px] text-text-primary/85 leading-[1.7] whitespace-pre-line mt-3 px-4 italic">
                    {item.coachNote}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text-dim text-sm">This plan has no items yet.</p>
        </div>
      )}

      {/* ── Masthead echo ──────────────────────────────────────── */}
      {/* Pair of fire-red dots + kerning-out brandmark. Signals end of
          document and closes the editorial bracket opened by the masthead. */}
      <div className="mt-20 text-center px-6">
        <div className="inline-flex items-center gap-2.5 text-[10px] font-heading text-text-dim/50 tracking-[0.28em]">
          <span className="w-1 h-1 rounded-full bg-accent-fire/60" />
          <span>NINJA H.E.R.O.S. · JUST TUMBLE</span>
          <span className="w-1 h-1 rounded-full bg-accent-fire/60" />
        </div>
      </div>
    </div>
  )
}
