import { redirect } from 'next/navigation'

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculum?: string }>
}) {
  const { curriculum } = await searchParams
  redirect(curriculum ? `/program?curriculum=${curriculum}` : '/program')
}
