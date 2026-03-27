'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function RemoveFromHandoffButton({ classId }: { classId: string }) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!window.confirm('Remove this class from the Handoff board?')) return
    setRemoving(true)
    const { error } = await supabase
      .from('classes')
      .update({ in_handoff: false })
      .eq('id', classId)
    if (error) {
      console.error('Failed to remove from handoff:', error)
      alert('Failed to remove. Please try again.')
      setRemoving(false)
    } else {
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={removing}
      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-text-dim border border-bg-border hover:text-accent-fire hover:border-accent-fire/40 hover:bg-accent-fire/5 transition-colors disabled:opacity-40"
    >
      {removing ? (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      Remove
    </button>
  )
}
