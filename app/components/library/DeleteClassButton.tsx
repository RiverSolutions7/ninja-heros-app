'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

interface DeleteClassButtonProps {
  classId: string
  photoUrls: string[]
  laneVideoUrls: string[]
  gameVideoUrls: string[]
}

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  return idx >= 0 ? url.slice(idx + marker.length) : null
}

export default function DeleteClassButton({
  classId,
  photoUrls,
  laneVideoUrls,
  gameVideoUrls,
}: DeleteClassButtonProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Delete this class permanently? This cannot be undone.')) return

    setDeleting(true)
    try {
      // Best-effort: delete storage files (don't block on errors)
      const photoPathes = photoUrls.map((u) => extractPath(u, 'station-photos')).filter(Boolean) as string[]
      const lanePaths = laneVideoUrls.map((u) => extractPath(u, 'lane-videos')).filter(Boolean) as string[]
      const gamePaths = gameVideoUrls.map((u) => extractPath(u, 'game-videos')).filter(Boolean) as string[]

      await Promise.allSettled([
        photoPathes.length > 0 ? supabase.storage.from('station-photos').remove(photoPathes) : Promise.resolve(),
        lanePaths.length > 0 ? supabase.storage.from('lane-videos').remove(lanePaths) : Promise.resolve(),
        gamePaths.length > 0 ? supabase.storage.from('game-videos').remove(gamePaths) : Promise.resolve(),
      ])

      // Delete class row — cascades to all blocks, stations
      const { error } = await supabase.from('classes').delete().eq('id', classId)
      if (error) throw error

      router.refresh()
    } catch (err) {
      console.error('Failed to delete class:', err)
      alert('Failed to delete class. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-accent-fire/60 font-semibold hover:text-accent-fire transition-colors disabled:opacity-40"
    >
      {deleting ? '…' : 'Delete'}
    </button>
  )
}
