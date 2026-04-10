import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchFullClass } from '@/app/lib/queries'
import ClassCard from '@/app/components/library/ClassCard'

interface ClassDetailPageProps {
  params: Promise<{ classId: string }>
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { classId } = await params
  const cls = await fetchFullClass(classId)

  if (!cls) {
    notFound()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pt-2">
        <Link
          href="/library"
          className="text-text-dim hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 -ml-1.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-heading text-xl text-text-primary leading-none flex-1">
          Class Details
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/class/${classId}/run`}
            className="inline-flex items-center gap-1.5 text-sm font-heading text-white bg-accent-fire px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-glow-fire"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run
          </Link>
          <Link
            href={`/library/${classId}/edit`}
            className="inline-flex items-center gap-1.5 text-sm font-heading text-text-dim hover:text-text-primary border border-bg-border hover:border-text-dim px-3 py-1.5 rounded-xl transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      <ClassCard cls={cls} showActions={false} />
    </div>
  )
}
