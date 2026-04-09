import { fetchCurriculums, fetchSkillRecency, fetchRecentClassesWithSkills } from '@/app/lib/queries'
import SkillRemoveManager from '@/app/components/skills/SkillRemoveManager'
import AddSkillButton from '@/app/components/skills/AddSkillButton'
import CurriculumSelector from '@/app/components/skills/CurriculumSelector'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculum?: string }>
}) {
  const { curriculum: curriculumId } = await searchParams
  const curriculums = await fetchCurriculums().catch(() => [])

  // Auto-select first curriculum if none chosen (so TabNav always lands on data)
  if (!curriculumId && curriculums.length > 0) {
    redirect(`/skills?curriculum=${curriculums[0].id}`)
  }

  const curriculumRow = curriculums.find((c) => c.id === curriculumId) ?? null
  const curriculum = curriculumRow
    ? { id: curriculumRow.id, label: curriculumRow.label, ageGroup: curriculumRow.age_group }
    : null

  let skillRecency = null
  let recentClasses = null
  let error = null

  if (curriculum) {
    try {
      ;[skillRecency, recentClasses] = await Promise.all([
        fetchSkillRecency(curriculum.ageGroup),
        fetchRecentClassesWithSkills(15, curriculum.ageGroup),
      ])
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data'
    }
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-accent-fire font-heading">Failed to load skills</p>
        <p className="text-text-muted text-sm mt-2">{error}</p>
      </div>
    )
  }

  const greenCount = skillRecency?.filter((s) => s.status === 'green').length ?? 0
  const yellowCount = skillRecency?.filter((s) => s.status === 'yellow').length ?? 0
  const redCount = skillRecency?.filter(
    (s) => s.status === 'red' || s.status === 'never'
  ).length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="pt-2 mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl text-text-primary leading-none">
            Skill Tracker
          </h1>
          <p className="text-text-dim text-xs mt-1">Auto-tracked from logged classes</p>
        </div>
        {curriculum && <AddSkillButton ageGroup={curriculum.ageGroup} />}
      </div>

      {/* Curriculum selector */}
      <Suspense>
        <CurriculumSelector />
      </Suspense>

      {/* Empty state */}
      {!curriculum ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-dim text-sm">Select a curriculum to view skills</p>
        </div>
      ) : (
        <>
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

          {/* Skill bars with remove management */}
          <SkillRemoveManager items={skillRecency ?? []} />

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

          {/* Recent classes with skills */}
          <div>
            <h2 className="font-heading text-sm text-text-muted uppercase tracking-wider mb-3">
              Recent Classes
            </h2>

            {!recentClasses || recentClasses.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-text-dim text-sm">No classes with skills logged yet.</p>
                <Link
                  href="/library/new"
                  className="inline-block mt-3 text-accent-fire text-sm font-semibold"
                >
                  Log your first class →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentClasses.map((cls) => (
                  <div key={cls.classId} className="card px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/library/${cls.classId}`}
                        className="font-heading text-sm text-text-primary hover:text-accent-fire transition-colors"
                      >
                        {cls.title || formatDate(cls.classDate)}
                      </Link>
                      {cls.title && (
                        <span className="text-xs text-text-dim">{formatDate(cls.classDate)}</span>
                      )}
                    </div>
                    {cls.lanes.map((lane) => (
                      <div key={`${cls.classId}-${lane.laneNumber}`} className="mb-2 last:mb-0">
                        <p className="text-xs text-accent-fire font-heading mb-1.5">
                          {lane.instructorName
                            ? `Lane ${lane.laneNumber} — ${lane.instructorName}`
                            : `Lane ${lane.laneNumber}`}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {lane.skills.map((skill) => (
                            <span key={skill} className="badge badge-skill">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
