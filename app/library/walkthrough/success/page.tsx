'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import W7Success from '@/app/components/walkthrough/W7Success'
import { useWalkthrough } from '@/app/components/walkthrough/WalkthroughContext'

function SuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearAll } = useWalkthrough()
  const n = Number.parseInt(searchParams.get('n') ?? '0', 10)
  const count = Number.isFinite(n) && n > 0 ? n : 0

  // Clear the in-memory stations only after we've safely landed on the
  // success page. Doing it earlier (in the save handler) raced with the
  // review page's empty-stations redirect.
  useEffect(() => {
    clearAll()
  }, [clearAll])

  return <W7Success count={count} onBackToLibrary={() => router.push('/library')} />
}

export default function WalkthroughSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  )
}
