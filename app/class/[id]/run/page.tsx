import { notFound } from 'next/navigation'
import { fetchFullClass } from '@/app/lib/queries'
import RunViewClient from './RunViewClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const cls = await fetchFullClass(id)
  return {
    title: cls?.title
      ? `Run: ${cls.title} — Ninja H.E.R.O.S.`
      : 'Run Class — Ninja H.E.R.O.S.',
  }
}

export default async function RunClassPage({ params }: Props) {
  const { id } = await params
  const cls = await fetchFullClass(id)

  if (!cls) notFound()

  return <RunViewClient cls={cls} />
}
