// Scoped layout for the rebuilt log flow. Self-hosts Inter (weights 200–800) via next/font and
// exposes it as the --font-inter CSS variable, which the flow's inline styles reference. Self-hosting
// (vs the export's Google Fonts <link>) keeps the flow offline-safe and avoids a render-blocking
// external fetch — the typeface is identical Inter.
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['200', '400', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

export default function LogLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.variable}>{children}</div>
}
