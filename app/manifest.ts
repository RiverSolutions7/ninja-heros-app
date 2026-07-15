import type { MetadataRoute } from 'next'

// PWA manifest — CHUNK 11 ①(c) (River, 2026-07-11): the log flow's typing state showed Safari's URL
// pill riding above the keyboard (browser chrome, not fixable in page code). Add-to-Home-Screen with a
// `standalone` display drops Safari's address/tool bars entirely, so this manifest exists to make that
// install path correct. No app icons ship in the repo yet, so `icons` is intentionally omitted (iOS
// falls back to a screenshot for the home-screen tile; standalone display still applies). Dark surfaces
// pinned to the flow's base rgb(8,12,26) = #080c1a.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ninja H.E.R.O.S. Coach Hub',
    short_name: 'Coach Hub',
    description: 'Class planning and skill tracking for Ninja H.E.R.O.S. coaches',
    start_url: '/',
    display: 'standalone',
    background_color: '#080c1a',
    theme_color: '#080c1a',
    orientation: 'portrait',
  }
}
