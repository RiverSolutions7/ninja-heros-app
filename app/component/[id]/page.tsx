// ============================================================
// Public share view — single library component.
// ------------------------------------------------------------
// Coach taps "Share" from the library (ComponentDetailSheet or
// ComponentCardMenu), gets a public URL, texts it to a colleague
// or the front desk. Recipient opens the link and sees the full
// "article" treatment: hero photo, how it runs, setup, skills,
// video — everything needed to actually run the station.
//
// Reuses the same ComponentArticle primitive /plan/[id] uses,
// wrapped in the same masthead/footer, so every share URL in
// the product speaks the same editorial voice.
// ============================================================

import { notFound } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import type { ComponentRow } from '@/app/lib/database.types'
import type { Metadata } from 'next'
import ShareMasthead from '@/app/components/share/ShareMasthead'
import ShareFooter from '@/app/components/share/ShareFooter'
import ComponentArticle from '@/app/components/share/ComponentArticle'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase.from('components').select('title').eq('id', id).single()
  return {
    title: data?.title ? `${data.title} — Ninja H.E.R.O.S.` : 'Component — Ninja H.E.R.O.S.',
  }
}

export default async function ShareComponentPage({ params }: Props) {
  const { id } = await params
  const { data, error } = await supabase.from('components').select('*').eq('id', id).single()

  if (error || !data) notFound()

  const component = data as ComponentRow
  const subtitle = component.type === 'station' ? 'Station' : 'Game'

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-bg-primary pb-20">
      <ShareMasthead subtitle={subtitle} />

      {/* ── Article ────────────────────────────────────────────── */}
      <div className="px-4 max-w-2xl mx-auto">
        <ComponentArticle component={component} />
      </div>

      <ShareFooter />
    </div>
  )
}
