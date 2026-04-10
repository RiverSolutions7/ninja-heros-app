import { notFound } from 'next/navigation'
import { fetchFullClass } from '@/app/lib/queries'
import RunViewClient from './RunViewClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RunPage({ params }: Props) {
  const { id } = await params
  const cls = await fetchFullClass(id)

  if (!cls) notFound()

  return <RunViewClient cls={cls} />
}
