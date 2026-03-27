import { notFound } from 'next/navigation'
import { fetchFullClass, fetchSkills } from '@/app/lib/queries'
import { ALL_SKILLS } from '@/app/lib/database.types'
import EditClassForm from './EditClassForm'

interface EditClassPageProps {
  params: Promise<{ classId: string }>
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { classId } = await params

  // Fetch class and skills in parallel; fall back to default skills if the
  // skills table hasn't been created yet (migration not yet run)
  const [cls, skillRows] = await Promise.all([
    fetchFullClass(classId),
    fetchSkills().catch(() => null),
  ])

  if (!cls) {
    notFound()
  }

  const initialSkills =
    skillRows && skillRows.length > 0
      ? skillRows.map((s) => s.name)
      : [...ALL_SKILLS]

  return (
    <EditClassForm
      cls={cls}
      initialSkills={initialSkills}
    />
  )
}
