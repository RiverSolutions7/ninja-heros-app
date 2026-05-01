'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import W7Success from '@/app/components/walkthrough/W7Success'

export default function WalkthroughSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const n = Number.parseInt(searchParams.get('n') ?? '0', 10)
  const count = Number.isFinite(n) && n > 0 ? n : 0

  return <W7Success count={count} onBackToLibrary={() => router.push('/library')} />
}
