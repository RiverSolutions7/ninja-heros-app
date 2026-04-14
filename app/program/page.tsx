import {
  fetchCurriculums,
  fetchSkillRecency,
  fetchTopComponents,
  fetchPlanCount,
  countComponents,
} from '@/app/lib/queries'
import SkillRemoveManager from '@/app/components/skills/SkillRemoveManager'
import AddSkillButton from '@/app/components/skills/AddSkillButton'
import CurriculumSelector from '@/app/components/skills/CurriculumSelector'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { ComponentType } from '@/app/lib/database.types'

const TYPE_LABEL: Record<ComponentType, string> = {
  game: 'Game',
  station: 'Station',
}

const TYPE_COLOR: Record<ComponentType, string> = {
  game: 'bg-accent-green',
  station: 'bg-accent-fire',
}

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculum?: string }>
}) {
  const { curriculum: curriculumId } = await searchParams
  const curriculums = await fetchCurriculums().catch(() => [])

  // Auto-select first curriculum if none chosen
  if (!curriculumId && curriculums.length > 0) {
    redirect(`/program?curriculum=${curriculums[0].id}`)
  }

  const curriculumRow = curriculums.find((c) => c.id === curriculumId) ?? null
  const curriculum = curriculumRow
    ? { id: curriculumRow.id, label: curriculumRow.label, ageGroup: curriculumRow.age_group }
    : null

  // Parallel data fetching
  const [planCount, componentCount, skillRecency, topComponents] = await Promise.all([
    fetchPlanCount().catch(() => 0),
    countComponents(curriculum?.ageGroup).catch(() => 0),
    curriculum ? fetchSkillRecency(curriculum.ageGroup).catch(() => []) : Promise.resolve([]),
    curriculum ? fetchTopComponents(curriculum.ageGroup).catch(() => []) : Promise.resolve([]),
  ])

  const greenCount = skillRecency.filter((s) => s.status === 'green').length
  const yellowCount = skillRecency.filter((s) => s.status === 'yellow').length
  const redCount = skillRecency.filter(
    (s) => s.status === 'red' || s.status === 'never'
  ).length

  return (
    <div>
      {/* Header */}
      <div className="pt-2 mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">
            Program
          </h1>
          <p className="text-text-dim text-xs mt-1">Your program at a glance</p>
        </div>
        {curriculum && <AddSkillButton ageGroup={curriculum.ageGroup} />}
      </div>

      {/* Curriculum selector */}
      <Suspense>
        <CurriculumSelector basePath="/program" />
      </Suspense>

      {/* Empty state — no curriculum */}
      {!curriculum ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-dim text-sm">Select a curriculum to view your program</p>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-bg-card border border-bg-border rounded-2xl px-4 py-3">
              <p className="text-2xl font-heading text-text-primary leading-none">{planCount}</p>
              <p className="text-xs text-text-dim mt-1">classes planned</p>
            </div>
            <div className="flex-1 bg-bg-card border border-bg-border rounded-2xl px-4 py-3">
              <p className="text-2xl font-heading text-text-primary leading-none">{componentCount}</p>
              <p className="text-xs text-text-dim mt-1">components</p>
            </div>
          </div>

          {/* Skill Coverage */}
          <div className="mb-1">
            <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim mb-3">
              Skill Coverage
            </p>

            {/* Status summary pills */}
            <div className="flex gap-2 mb-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-accent-green" />
                <span className="text-xs font-bold text-accent-green">{greenCount} Fresh</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-gold/10 border border-accent-gold/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-accent-gold" />
                <span className="text-xs font-bold text-accent-gold">{yellowCount} OK</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-fire/10 border border-accent-fire/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-accent-fire" />
                <span className="text-xs font-bold text-accent-fire">{redCount} Overdue</span>
              </div>
            </div>

            {/* Skill bars */}
            <SkillRemoveManager items={skillRecency} />

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-xs text-text-dim">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
                Within 7 days
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-gold inline-block" />
                8–21 days
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent-fire inline-block" />
                22+ days / Never
              </span>
            </div>
          </div>

          {/* Most Used Components */}
          <div className="mb-6">
            <p className="text-[11px] font-heading uppercase tracking-wider text-text-dim mb-3">
              Most Used
            </p>

            {planCount < 3 ? (
              <p className="text-xs text-text-dim/50 text-center py-6">
                Plan a few classes to see your most used components
              </p>
            ) : topComponents.length === 0 ? (
              <p className="text-xs text-text-dim/50 text-center py-6">
                No components used yet for this curriculum
              </p>
            ) : (
              <div className="bg-bg-card border border-bg-border rounded-2xl overflow-hidden">
                {topComponents.map(({ component, count }, idx) => {
                  const type = component.type as ComponentType
                  return (
                    <div
                      key={component.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        idx < topComponents.length - 1 ? 'border-b border-bg-border' : ''
                      }`}
                    >
                      <div className={`w-1 h-8 rounded-full flex-shrink-0 ${TYPE_COLOR[type] ?? 'bg-text-dim'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {component.title}
                        </p>
                        <p className="text-xs text-text-dim">{TYPE_LABEL[type] ?? type}</p>
                      </div>
                      <span className="text-xs font-bold text-text-muted flex-shrink-0">
                        {count}×
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
