// Gate for the mobile critique layer. Renders DevCritique ONLY in local dev or on a
// Vercel preview build. Both env values are inlined at build time, so in a production
// build this component's body is a no-op and DevCritique is never in the bundle path.
'use client'

import DevCritique from './DevCritique'

const enabled =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'

export default function DevCritiqueGate() {
  if (!enabled) return null
  return <DevCritique />
}
