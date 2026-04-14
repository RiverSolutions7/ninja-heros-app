import { fetchCurriculums, fetchSkillRecency } from '@/app/lib/queries'
import SkillRemoveManager from '@/app/components/skills/SkillRemoveManager'
import AddSkillButton from '@/app/components/skills/AddSkillButton'
import CurriculumSelector from '@/app/components/skills/CurriculumSelector'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

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

  const skillRecency = curriculum
    ? await fetchSkillRecency(curriculum.ageGroup).catch(() => [])
    : []

  return (
    <div>
      {/* Header */}
      <div className="pt-2 mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">
            Skills
          </h1>
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
          <p className="text-text-dim text-sm">Select a curriculum to view skills</p>
        </div>
      ) : (
        <>
          {/* Skill recency bars */}
          <SkillRemoveManager items={skillRecency} />

          {/* Legend */}
          <div className="flex gap-4 mt-4 mb-6 text-xs text-text-dim">
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
        </>
      )}
    </div>
  )
}
