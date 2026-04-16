// ============================================================
// Preview — post-save "I made something" beat.
// ------------------------------------------------------------
// Throwaway route used to validate the editorial post-save
// screen before wiring it into /library/log-component. Pulls
// the most recently-created station from the DB so the mock
// feels like what a coach would actually see after logging.
// ============================================================

import { supabase } from '@/app/lib/supabase'
import { countComponents } from '@/app/lib/queries'
import type { ComponentRow } from '@/app/lib/database.types'
import AfterSavePreview from './AfterSavePreview'

export const dynamic = 'force-dynamic'

export default async function AfterSavePreviewPage() {
  const [componentResult, totalCount] = await Promise.all([
    supabase
      .from('components')
      .select('*')
      .eq('type', 'station')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    countComponents(),
  ])

  return (
    <AfterSavePreview
      component={(componentResult.data ?? null) as ComponentRow | null}
      libraryRank={totalCount}
    />
  )
}
