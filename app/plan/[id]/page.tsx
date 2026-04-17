// ============================================================
// Share view — public plan link.
// ------------------------------------------------------------
// The face outsiders (parents, visiting coaches, front desk)
// see of the app. Leans fully into the editorial voice: shared
// masthead, big type, one hot color (fire red), no UI chrome
// that reads as "dashboard." Each plan item renders as a
// ComponentArticle — same primitive /component/[id] uses — so
// the visual grammar stays unified across share surfaces.
// ============================================================

import { notFound } from 'next/navigation'
import { fetchPlan } from '@/app/lib/planQueries'
import type { Metadata } from 'next'
import type { PlanItem, PlanRow } from '@/app/lib/database.types'
import ShareMasthead from '@/app/components/share/ShareMasthead'
import ShareFooter from '@/app/components/share/ShareFooter'
import ComponentArticle from '@/app/components/share/ComponentArticle'

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
      <ShareMasthead subtitle="Class Plan" />

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
        <div className="mt-9 px-4 max-w-2xl mx-auto flex flex-col gap-4">
          {items.map((item) => (
            <ComponentArticle
              key={item.localId}
              component={item.component}
              sessionDuration={item.durationMinutes}
              coachNote={item.coachNote}
            />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text-dim text-sm">This plan has no items yet.</p>
        </div>
      )}

      <ShareFooter />
    </div>
  )
}
