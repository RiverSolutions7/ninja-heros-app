'use client'

import { useRouter } from 'next/navigation'
import ComponentDetailSheet from '@/app/components/library/ComponentDetailSheet'
import type { ComponentRow } from '@/app/lib/database.types'

interface AfterSavePreviewProps {
  component: ComponentRow | null
  libraryRank: number
}

export default function AfterSavePreview({ component, libraryRank }: AfterSavePreviewProps) {
  const router = useRouter()

  if (!component) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-8 text-center">
        <div>
          <p className="font-heading text-xl text-text-primary mb-2">
            No stations logged yet
          </p>
          <p className="text-text-dim text-sm">
            Log a component first to preview this screen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ComponentDetailSheet
      component={component}
      mode="afterSave"
      libraryRank={libraryRank}
      onClose={() => router.push('/library')}
      onLogAnother={() => router.push('/library/log-component')}
    />
  )
}
