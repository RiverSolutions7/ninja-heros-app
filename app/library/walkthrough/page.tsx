'use client'

import { useRouter } from 'next/navigation'
import W1Intro from '@/app/components/walkthrough/W1Intro'
import { useWalkthrough } from '@/app/components/walkthrough/WalkthroughContext'

export default function WalkthroughIntroPage() {
  const router = useRouter()
  const { clearAll } = useWalkthrough()

  function handleStart() {
    router.push('/library/walkthrough/capture')
  }

  function handleClose() {
    clearAll()
    router.push('/library')
  }

  return <W1Intro onStart={handleStart} onClose={handleClose} />
}
