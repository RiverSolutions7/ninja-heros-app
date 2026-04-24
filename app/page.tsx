'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const profile = localStorage.getItem('ninja-coach-profile')
    router.replace(profile ? '/library' : '/onboarding')
  }, [router])
  return <div style={{ position: 'fixed', inset: 0, background: '#0a1232' }} />
}
