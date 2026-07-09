// Dev-only harness layout — self-hosts Inter via next/font and exposes --font-inter so the sliced
// export frames (whose font-family is rewritten to var(--font-inter) by the page) render in real Inter.
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['200', '400', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

export default function DevFramesLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.variable}>{children}</div>
}
